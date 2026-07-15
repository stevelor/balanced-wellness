// supabase/functions/send-email/index.ts
//
// Sends transactional emails for the booking flow via Resend (https://resend.com).
// Called from the client with supabase.functions.invoke('send-email', { body }).
//
// Required secrets (set with `supabase secrets set KEY=value`):
//   RESEND_API_KEY  - your Resend API key
//   ADMIN_EMAIL     - the email address that should receive new-booking notifications
//   FROM_EMAIL      - (optional) the "from" address; defaults to Resend's test sender,
//                      which only works for sending to your own Resend account email
//                      until you verify a domain in Resend.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Resend API error: ${errText}`)
  }
  return res.json()
}

serve(async (req) => {
  // Handle the browser's CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { type } = payload

    if (type === 'new_appointment') {
      const { serviceName, appointmentDate, startTime, clientEmail } = payload

      if (!ADMIN_EMAIL) {
        throw new Error('ADMIN_EMAIL secret is not set')
      }

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: 'New Appointment Request',
        html: `
          <h2>New booking request</h2>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${startTime}</p>
          <p><strong>Client email:</strong> ${clientEmail}</p>
          <p>Log in to the admin dashboard to confirm or cancel this request.</p>
        `,
      })
    } else if (type === 'status_update') {
      const { serviceName, appointmentDate, startTime, clientEmail, status } = payload
      const isConfirmed = status === 'confirmed'

      if (!clientEmail) {
        throw new Error('No client email on file for this appointment')
      }

      await sendEmail({
        to: clientEmail,
        subject: isConfirmed ? 'Your appointment is confirmed!' : 'Your appointment request was declined',
        html: `
          <h2>${isConfirmed ? 'Appointment Confirmed' : 'Appointment Declined'}</h2>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${startTime}</p>
          <p>${isConfirmed
            ? 'We look forward to seeing you!'
            : 'Please contact us or book a different time if you would like to reschedule.'}</p>
        `,
      })
    } else {
      return new Response(JSON.stringify({ error: 'Unknown email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
