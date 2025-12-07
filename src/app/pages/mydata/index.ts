import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@12.12.0?target=deno';

// Initialisation de Stripe avec la clé secrète stockée dans les secrets Supabase.
// Assurez-vous d'ajouter STRIPE_SECRET_KEY à vos secrets locaux et de production.
const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// URL de votre site pour les redirections après paiement.
const YOUR_WEBSITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:4200';

serve(async (req) => {
  // Gestion de la requête pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, quantity } = await req.json();

    if (!priceId || !quantity) {
      throw new Error('Le "priceId" et la "quantity" sont requis.');
    }

    // Création de la session de paiement Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'bancontact'],
      line_items: [{
        price: priceId,
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: `${YOUR_WEBSITE_URL}/mydata?payment=success`, // URL de redirection en cas de succès
      cancel_url: `${YOUR_WEBSITE_URL}/mydata?payment=cancel`,   // URL de redirection en cas d'annulation
    });

    // Retourne l'URL de la session au client
    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});