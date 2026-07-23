import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { clientEmail, clientName, serviceName, date, time, status = 'pending' } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    // This grabs your admin email(s) from Supabase secrets
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') 

    // Helper function to make sending multiple emails cleaner
    const sendEmail = async (toAddresses, subject, htmlBody) => {
      // If there are multiple emails separated by commas, Resend needs them as an array
      const toArray = typeof toAddresses === 'string' && toAddresses.includes(',') 
        ? toAddresses.split(',').map(email => email.trim()) 
        : toAddresses;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Balanced Wellness <appointments@donnabooking.com>',
          to: toArray,
          subject: subject,
          html: htmlBody
        })
      })
      return await res.json()
    }

    let responseData;

    // 1. IF THE APPOINTMENT IS CONFIRMED (Admin clicked Confirm)
    if (status === 'confirmed') {
      const subject = `Confirmed: Healing Session on ${date}`
      const htmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Your Session is Confirmed!</h2>
          <p>Hi ${clientName || 'there'},</p>
          <p>Great news! Your request for a <strong>${serviceName}</strong> session has been approved and confirmed.</p>
          <p><strong>Date:</strong> ${date}<br/>
          <strong>Time:</strong> ${time}</p>
          <p>We look forward to seeing you. If you need to make any changes, please let us know.</p>
          <p>Warmly,<br/>Donna</p>
        </div>
      `
      responseData = await sendEmail(clientEmail, subject, htmlBody)
    } 
    
    // 2. IF THE APPOINTMENT IS CANCELLED (Admin clicked Cancel)
    else if (status === 'cancelled') {
      const subject = `Update: Healing Session on ${date}`
      const htmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Session Update</h2>
          <p>Hi ${clientName || 'there'},</p>
          <p>We are writing to let you know that your requested <strong>${serviceName}</strong> session on <strong>${date} at ${time}</strong> could not be scheduled and has been cancelled.</p>
          <p>Please feel free to request a different time through the booking portal, or reach out directly with any questions.</p>
          <p>Warmly,<br/>Donna</p>
        </div>
      `
      responseData = await sendEmail(clientEmail, subject, htmlBody)
    } 
    
    // 3. THE INITIAL BOOKING REQUEST (Client just booked on the website)
    else {
      // Email A: The receipt for the client
      const clientSubject = `Healing Session Request Received: ${serviceName}`
      const clientHtmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Session Request Received</h2>
          <p>Hi ${clientName || 'there'},</p>
          <p>Your request for a <strong>${serviceName}</strong> session has been received.</p>
          <p><strong>Date:</strong> ${date}<br/>
          <strong>Time:</strong> ${time}</p>
          <p>We will review your schedule request and send a separate email shortly to confirm your appointment.</p>
          <p>Warmly,<br/>Donna</p>
        </div>
      `
      
      // Email B: The alert for you and Donna!
      const adminSubject = `🔔 New Booking Request from ${clientName || 'a client'}`
      const adminHtmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #2c3e50;">New Appointment Request</h2>
          <p>A new client has requested a session on the website.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #899E8B; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Client Name:</strong> ${clientName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Client Email:</strong> ${clientEmail}</p>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Requested Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Requested Time:</strong> ${time}</p>
          </div>
          <p>Please log in to the admin dashboard at <a href="https://donnabooking.com">donnabooking.com</a> to confirm or cancel this request.</p>
        </div>
      `

      // Fire both emails off simultaneously
      const [clientRes, adminRes] = await Promise.all([
        sendEmail(clientEmail, clientSubject, clientHtmlBody),
        sendEmail(ADMIN_EMAIL, adminSubject, adminHtmlBody) 
      ])
      
      responseData = { clientRes, adminRes }
    }

    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})