import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
// Utilisation de npm: pour une compatibilité maximale avec Deno 2+
import Stripe from "npm:stripe@14.10.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Gestion du CORS pour Angular
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      // CRUCIAL : Force Stripe à utiliser fetch (natif Deno) au lieu de http (Node)
      httpClient: Stripe.createFetchHttpClient(), 
    })

    const signature = req.headers.get('stripe-signature')
    if (!signature) throw new Error('Signature manquante')

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      
      // On récupère l'ID utilisateur passé dans les métadonnées lors de la création
      const userId = session.metadata?.userId

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // MISE À JOUR DE LA BASE DE DONNÉES
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true, stripe_customer_id: session.customer })
        .eq('id', userId)

      if (error) throw error
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    // Log précis pour le dashboard Supabase
    console.error(`Error: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})