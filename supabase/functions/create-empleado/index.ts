// Supabase Edge Function: create-empleado
// Creates auth user + empleado + profile atomically. Admin only.
// Deploy: supabase functions deploy create-empleado
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateEmpleadoPayload {
  nombre: string;
  documento: string;
  email: string;
  password: string;
  cargo?: string;
  valor_hora: number;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Admin client: bypasses RLS, can manage auth users
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let createdUserId: string | null = null;
  let createdEmpleadoId: string | null = null;

  try {
    // ---- 1. Verify caller is an authenticated admin ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado.' }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sesión inválida.' }, 401);
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Solo un administrador puede crear empleados.' }, 403);
    }

    // ---- 2. Validate payload ----
    const payload: CreateEmpleadoPayload = await req.json();
    const nombre = payload.nombre?.trim();
    const documento = payload.documento?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const cargo = payload.cargo?.trim() || null;
    const valorHora = Number(payload.valor_hora);

    if (!nombre || !documento || !email || !password) {
      return jsonResponse({ error: 'Nombre, documento, email y contraseña son obligatorios.' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
    }
    if (!Number.isFinite(valorHora) || valorHora <= 0) {
      return jsonResponse({ error: 'El valor hora debe ser mayor a 0.' }, 400);
    }

    // ---- 3. Check duplicates before touching anything ----
    const { data: existing } = await admin
      .from('empleados')
      .select('id, documento, email')
      .or(`documento.eq.${documento},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      const field = existing.documento === documento ? 'documento' : 'email';
      return jsonResponse({ error: `Ya existe un empleado con ese ${field}.` }, 409);
    }

    // ---- 4. Create auth user ----
    const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });

    if (createUserError || !newUser.user) {
      const msg = createUserError?.message ?? 'No se pudo crear la cuenta de acceso.';
      const isDup = msg.toLowerCase().includes('already');
      return jsonResponse(
        { error: isDup ? 'Ese email ya tiene una cuenta registrada.' : msg },
        isDup ? 409 : 500
      );
    }
    createdUserId = newUser.user.id;

    // ---- 5. Create empleado ----
    const { data: empleado, error: empleadoError } = await admin
      .from('empleados')
      .insert({ nombre, documento, email, cargo, valor_hora: valorHora })
      .select()
      .single();

    if (empleadoError || !empleado) {
      throw new Error(empleadoError?.message ?? 'No se pudo crear el empleado.');
    }
    createdEmpleadoId = empleado.id;

    // ---- 6. Create profile linking user to empleado ----
    const { error: profileError } = await admin.from('profiles').insert({
      user_id: createdUserId,
      role: 'colaborador',
      empleado_id: createdEmpleadoId,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    return jsonResponse({ success: true, empleado }, 201);
  } catch (error) {
    // ---- Rollback: undo partial writes ----
    if (createdEmpleadoId) {
      await admin.from('empleados').delete().eq('id', createdEmpleadoId);
    }
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }

    const message = error instanceof Error ? error.message : 'Error desconocido.';
    console.error('create-empleado error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
