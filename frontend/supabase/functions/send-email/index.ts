import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// 👇 Add your real emails here so you both get notified 👇
const ADMIN_EMAILS = ['stevenantlor@gmail.com', 'healwithdonna@gmail.com']; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      type = 'appointment', // Defaults to 1-on-1 sessions if not specified
      clientEmail, 
      clientName = 'Client', 
      serviceName = 'Session', 
      date, 
      time, 
      status = 'pending', 
      duration = 60, 
      price = 0 
    } = await req.json();

    const [year, month, day] = date.split('-');
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedMonthDay = `${parseInt(month)}/${parseInt(day)}`;

    let clientSubject = '';
    let clientHtml = '';
    let adminSubject = '';
    let adminHtml = '';

    // ==========================================
    // 1-ON-1 APPOINTMENT EMAILS
    // ==========================================
    if (type === 'appointment') {
      if (status === 'confirmed') {
        clientSubject = `✨ Confirmation: Your Reiki Session with Donna`;
        clientHtml = `
          <p>✨Hi ${clientName},</p>
          <p>This is a reminder of your ${serviceName} session on <strong>${dayOfWeek}, ${formattedMonthDay} at ${time}</strong>.</p>
          <p>🏡The Healing Studio is at 19 Glenside Dr., New City, NY. It’s a beige house with white columns and a stone mailbox. Please park on the street.</p>
          <p>🌷 <strong>*Please do not come to the front door*</strong><br/>
          I am ready for you when you see the garage open. Walk into the garage and the Studio door is immediately to the right inside the garage.</p>
          <p>⏰ A healing session can run approx. ${duration} minutes.</p>
          <p>✅ $${price} (Cash, Check, Zelle: 8456427262, Venmo: @DonnaLorence)</p>
          <p>✨ Any questions just let me know, I'm looking forward to our session!<br/>Donna Lorence</p>
        `;
      } else if (status === 'pending') {
        clientSubject = `Booking Request Received: ${serviceName}`;
        clientHtml = `<p>Hi ${clientName},</p><p>We have received your request for a ${serviceName} on ${formattedMonthDay} at ${time}. Donna will review and confirm this shortly!</p>`;
        
        adminSubject = `🚨 New Booking Request: ${clientName}`;
        adminHtml = `<p><strong>${clientName}</strong> (${clientEmail}) requested a <strong>${serviceName}</strong> on <strong>${formattedMonthDay} at ${time}</strong>.</p><p>Please log into the admin dashboard to confirm or cancel this time slot.</p>`;
      } else if (status === 'cancelled') {
        clientSubject = `Cancelled: ${serviceName}`;
        clientHtml = `<p>Hi ${clientName},</p><p>Your ${serviceName} on ${formattedMonthDay} at ${time} has been successfully cancelled.</p>`;
        
        adminSubject = `❌ Session Cancelled: ${clientName}`;
        adminHtml = `<p><strong>${clientName}</strong> has cancelled their ${serviceName} on ${formattedMonthDay} at ${time}.</p>`;
      }
    } 
    // ==========================================
    // SPECIAL EVENT EMAILS
    // ==========================================
    else if (type === 'event') {
      if (status === 'registered') {
        clientSubject = `✨ Spot Secured: ${serviceName}`;
        clientHtml = `
          <p>Hi ${clientName},</p>
          <p>Your payment was successful and your spot for <strong>${serviceName}</strong> on <strong>${dayOfWeek}, ${formattedMonthDay} at ${time}</strong> is officially secured!</p>
          <p>🏡 The event will be held at The Healing Studio: 19 Glenside Dr., New City, NY. Please park on the street.</p>
          <p>We look forward to seeing you!</p>
        `;
        
        adminSubject = `🎉 New Event Registration: ${clientName}`;
        adminHtml = `<p><strong>${clientName}</strong> (${clientEmail}) just paid via Stripe and secured their spot for <strong>${serviceName}</strong> on ${formattedMonthDay} at ${time}!</p>`;
      }
    }

    // ==========================================
    // SEND THE EMAILS
    // ==========================================
    const emailPromises = [];

    // 1. Dispatch Client Email
    if (clientSubject) {
      emailPromises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Balanced Wellness <onboarding@resend.dev>', // UPDATE TO YOUR VERIFIED DOMAIN!
            to: [clientEmail],
            subject: clientSubject,
            html: clientHtml,
          }),
        })
      );
    }

    // 2. Dispatch Admin Email (Only if an admin subject was generated)
    if (adminSubject && ADMIN_EMAILS.length > 0) {
      emailPromises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Balanced Wellness Admin <onboarding@resend.dev>', // UPDATE TO YOUR VERIFIED DOMAIN!
            to: ADMIN_EMAILS,
            subject: adminSubject,
            html: adminHtml,
          }),
        })
      );
    }

    // Wait for both emails to successfully send
    await Promise.all(emailPromises);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});