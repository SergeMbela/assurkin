import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// En-têtes pour la gestion des requêtes CORS (Cross-Origin Resource Sharing)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Pour le développement. À changer pour votre domaine en production.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // On s'assure que tous les en-têtes potentiels sont listés, y compris x-client-info.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction pour récupérer le nom du bucket à partir du type de devis
function getBucketName(quoteType: string): string {
  const bucketMap: { [key: string]: string } = {
    'auto': 'documents_auto',
    'habitation': 'documents_habitation',
    'obseques': 'documents_obseques',
    'rc': 'documents_rc',
    'voyage': 'documents_voyage',
  };
  return bucketMap[quoteType] || 'documents_autres'; // Un bucket par défaut si le type n'est pas trouvé
}

Deno.serve(async (req) => {
  // Gère la requête de pré-vérification (preflight) envoyée par le navigateur pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Étape 1 : Créer un client Supabase avec les droits de service (administrateur).
    // Ce client peut contourner les politiques RLS, ce qui est nécessaire pour les téléversements anonymes.
    // La clé de service est récupérée depuis les variables d'environnement de la fonction.
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupère les données envoyées depuis le client Angular
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const quoteId = formData.get('quoteId') as string | null;
    const quoteType = formData.get('quoteType') as string | null;

    if (!file || !quoteId || !quoteType) {
      throw new Error('Les informations requises (fichier, quoteId, quoteType) sont manquantes.');
    }

    const bucketName = getBucketName(quoteType);
    const filePath = `${quoteType}/${quoteId}/${file.name}`;

    // Étape 2 : Utiliser le client administrateur pour téléverser le fichier
    const { data, error } = await supabaseAdminClient
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true, // Remplace le fichier s'il existe déjà
      });

    if (error) {
      throw error;
    }

    // Renvoie une réponse de succès avec le chemin du fichier
    return new Response(
      JSON.stringify({ path: data.path }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});