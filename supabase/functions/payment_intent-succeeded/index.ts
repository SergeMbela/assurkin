import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    // 1. Verify the event actually came from Stripe
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret!,
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Handle specific event types
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
     

      // 3. Update your table based on your schema
      const requestId = Number(paymentIntent.metadata.payment_request_id);
      const { error } = await supabase
        .from('payment_requests')
        .update({ 
          statut: 'paid', // Matches your custom enum
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          transaction_id: paymentIntent.id 
        })
        .eq('id', requestId)

      if (error) throw error
      console.log(`✅ Payment updated for ID: ${requestId}`)
      
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object
      const requestId = paymentIntent.metadata.payment_request_id

      await supabase
        .from('payment_requests')
        .update({ 
          statut: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', requestId)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})