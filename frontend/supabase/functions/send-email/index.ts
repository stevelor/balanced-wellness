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
    const { clientEmail, clientName, serviceName, date, time } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Balanced Wellness <appointments@healwithdonna.com>', // The domain you just verified!
        to: clientEmail,
        bcc: ADMIN_EMAIL, // This sends the hidden copy to your mom
        subject: `Healing Session Request: ${serviceName}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Session Request Received</h2>
            <p>Hi ${clientName || 'there'},</p>
            <p>Your request for a <strong>${serviceName}</strong> session has been received.</p>
            <p><strong>Date:</strong> ${date}<br/>
            <strong>Time:</strong> ${time}</p>
            <p>We will review your request and confirm shortly.</p>
            <p>Warmly,<br/>Donna</p>
          </div>
        `
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