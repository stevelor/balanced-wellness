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
    // We added "status" to the incoming data (defaults to 'pending' if not provided)
    const { clientEmail, clientName, serviceName, date, time, status = 'pending' } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')

    let subject = ''
    let htmlBody = ''

    // 1. IF THE APPOINTMENT IS CONFIRMED
    if (status === 'confirmed') {
      subject = `Confirmed: Healing Session on ${date}`
      htmlBody = `
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
    } 
    // 2. IF THE APPOINTMENT IS CANCELLED
    else if (status === 'cancelled') {
      subject = `Update: Healing Session on ${date}`
      htmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Session Update</h2>
          <p>Hi ${clientName || 'there'},</p>
          <p>We are writing to let you know that your requested <strong>${serviceName}</strong> session on <strong>${date} at ${time}</strong> could not be scheduled and has been cancelled.</p>
          <p>Please feel free to request a different time through the booking portal, or reach out directly with any questions.</p>
          <p>Warmly,<br/>Donna</p>
        </div>
      `
    } 
    // 3. THE INITIAL BOOKING REQUEST (PENDING)
    else {
      subject = `Healing Session Request Received: ${serviceName}`
      htmlBody = `
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
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Balanced Wellness <appointments@donnabooking.com>',
        to: clientEmail,
        bcc: ADMIN_EMAIL, 
        subject: subject,
        html: htmlBody
      })
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
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