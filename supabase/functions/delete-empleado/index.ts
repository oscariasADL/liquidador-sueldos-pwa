// Supabase Edge Function: delete-empleado
// Permanently removes an employee, their auth account and profile. Admin only.
// Refuses deletion when the employee has attendance or payroll history, since
// that data is the source of truth for past payments.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ---- 1. Caller must be an authenticated admin ----
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

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return jsonResponse({ error: 'Solo un administrador puede eliminar empleados.' }, 403);
    }

    // ---- 2. Validate target ----
    const { empleado_id: empleadoId } = await req.json();
    if (!empleadoId) {
      return jsonResponse({ error: 'Falta el identificador del empleado.' }, 400);
    }

    const { data: empleado } = await admin
      .from('empleados')
      .select('id, nombre')
      .eq('id', empleadoId)
      .maybeSingle();

    if (!empleado) {
      return jsonResponse({ error: 'El empleado no existe.' }, 404);
    }

    // ---- 3. Block deletion when history exists ----
    const [{ count: asistencias }, { count: liquidaciones }] = await Promise.all([
      admin
        .from('registros_asistencia')
        .select('*', { count: 'exact', head: true })
        .eq('empleado_id', empleadoId),
      admin
        .from('liquidaciones')
        .select('*', { count: 'exact', head: true })
        .eq('empleado_id', empleadoId),
    ]);

    if ((asistencias ?? 0) > 0 || (liquidaciones ?? 0) > 0) {
      return jsonResponse(
        {
          error:
            `${empleado.nombre} tiene ${asistencias ?? 0} registro(s) de asistencia y ` +
            `${liquidaciones ?? 0} liquidación(es). No se puede eliminar sin perder ese ` +
            'historial. Desactívalo en su lugar: pierde el acceso y deja de aparecer en ' +
            'los listados, pero conserva sus datos.',
          reason: 'has_history',
        },
        409
      );
    }

    // ---- 4. Delete auth account, then the employee row ----
    // profiles.user_id cascades on auth user deletion.
    const { data: profileRow } = await admin
      .from('profiles')
      .select('user_id')
      .eq('empleado_id', empleadoId)
      .maybeSingle();

    if (profileRow?.user_id) {
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(profileRow.user_id);
      if (authDeleteError) {
        throw new Error(`No se pudo eliminar la cuenta de acceso: ${authDeleteError.message}`);
      }
    }

    const { error: deleteError } = await admin.from('empleados').delete().eq('id', empleadoId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido.';
    console.error('delete-empleado error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
