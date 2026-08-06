import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature provided', { status: 400 });

  try {
    const body = await req.text(); 
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const regId = session.client_reference_id; 

      if (regId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Secure the spot in the database
        await supabaseAdmin.from('event_registrations').update({ status: 'registered' }).eq('id', regId);

        // 2. Fetch the event and client details to build the email
        const { data: regData } = await supabaseAdmin
          .from('event_registrations')
          .select('client_name, client_email, events(title, event_date, start_time)')
          .eq('id', regId)
          .single();

        if (regData && regData.events) {
          // Format the time properly (e.g., 18:00:00 to 6:00 PM)
          const timeString = regData.events.start_time;
          const [hourStr, minuteStr] = timeString.split(':');
          let hour = parseInt(hourStr, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          hour = hour % 12 || 12;
          const formattedTime = `${hour}:${minuteStr} ${ampm}`;

          // 3. Trigger the email edge function!
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              type: 'event', // Tells the function to use the Event email templates!
              status: 'registered',
              clientName: regData.client_name,
              clientEmail: regData.client_email,
              serviceName: regData.events.title,
              date: regData.events.event_date,
              time: formattedTime
            })
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
    
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});