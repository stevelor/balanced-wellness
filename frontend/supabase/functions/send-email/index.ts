import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clientEmail, clientName, serviceName, date, time, status, duration, price } = await req.json();

    // Mathematically formats the date to exactly what your mom requested (e.g., "Wednesday, 8/5")
    const [year, month, day] = date.split('-');
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedMonthDay = `${parseInt(month)}/${parseInt(day)}`;

    let subject = '';
    let htmlBody = '';

    if (status === 'confirmed') {
      subject = `✨ Confirmation: Your Reiki Session with Donna`;
      
      // THIS IS YOUR EXACT CUSTOM TEMPLATE:
      htmlBody = `
        <p>✨Hi ${clientName},</p>
        <p>This is a reminder of your ${serviceName} session on <strong>${dayOfWeek}, ${formattedMonthDay} at ${time}</strong>.</p>
        
        <p>🏡The Healing Studio is at 19 Glenside Dr., New City, NY. It’s a beige house with white columns and a stone mailbox. Please park on the street.</p>
        
        <p>🌷 <strong>*Please do not come to the front door*</strong><br/>
        I am ready for you when you see the garage open. Walk into the garage and the Studio door is immediately to the right inside the garage.</p>
        
        <p>⏰ A healing session can run approx. ${duration} minutes including healing time and discussion.</p>
        
        <p>✅ $${price}<br/>
        -Cash<br/>
        -Check<br/>
        -Zelle: 8456427262<br/>
        -Venmo: @DonnaLorence</p>
        
        <p>🎗️ <strong>Just a few reminders:</strong><br/>
        ~Wear comfortable clothes as you will be on a treatment table fully clothed with shoes off.<br/>
        ~Be mindful of the time as other clients have sessions after you.<br/>
        ~No strong perfumes or scents.<br/>
        ~If you are sensitive to scents please let me know ahead of time by replying to this message.</p>
        
        <p>✨ Any questions just let me know, I'm looking forward to our session!</p>
        
        <p>Thank you!<br/>
        Donna Lorence,<br/>
        Reiki Master✨💜✨<br/>
        Balanced Wellness LLC</p>
      `;
    } else if (status === 'pending') {
      subject = `Booking Request Received: ${serviceName}`;
      htmlBody = `<p>Hi ${clientName},</p><p>We have received your request for a ${serviceName} on ${formattedMonthDay} at ${time}. Donna will review and confirm this shortly!</p>`;
    } else if (status === 'cancelled') {
      subject = `Cancelled: ${serviceName}`;
      htmlBody = `<p>Hi ${clientName},</p><p>Your ${serviceName} on ${formattedMonthDay} at ${time} has been successfully cancelled.</p>`;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // NOTE: Make sure this email matches your verified sending domain!
        from: 'Balanced Wellness <onboarding@resend.dev>', 
        to: [clientEmail],
        subject: subject,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});