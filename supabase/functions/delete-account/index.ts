// @ts-nocheck - runs in Supabase Deno runtime, not Node; Deno globals are not available in local TS config
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Use the user's own JWT to identify them (avoids ES256 algorithm mismatch)
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  // Use service role client only for admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Delete all user data (sessions + rounds cascade-deleted via FK)
  await adminClient.from('sessions').delete().eq('user_id', user.id);

  // Delete the auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(deleteError.message, { status: 500, headers: corsHeaders });

  return new Response('OK', { headers: corsHeaders });
});
