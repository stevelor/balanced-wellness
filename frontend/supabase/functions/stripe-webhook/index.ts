import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
});

// This is a special password Stripe uses to prove it's actually them sending the message
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature provided', { status: 400 });
  }

  try {
    // Stripe requires the raw text body to mathematically verify the signature
    const body = await req.text(); 
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    // If the payment was successful...
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const regId = session.client_reference_id; // Grab the ID we gave them earlier!

      if (regId) {
        // Log into Supabase using the master Service Role key to bypass security rules
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Update the registration status to fully secured!
        await supabaseAdmin
          .from('event_registrations')
          .update({ status: 'registered' })
          .eq('id', regId);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
    
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});