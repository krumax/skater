// @ts-nocheck — runs in Supabase Deno runtime, not Node; Deno globals are not available in local TS config
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );

  // Verify the JWT and get the user
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Delete all user data (sessions + rounds cascade-deleted via FK)
  await supabase.from('sessions').delete().eq('user_id', user.id);

  // Delete the auth user
  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(deleteError.message, { status: 500, headers: corsHeaders });

  return new Response('OK', { headers: corsHeaders });
});
