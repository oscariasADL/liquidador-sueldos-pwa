// Supabase Edge Function: sync-sheets
// Syncs a liquidacion record to Google Sheets using Service Account JWT
// Deploy: supabase functions deploy sync-sheets
// Secrets: GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SPREADSHEET_ID, GOOGLE_SHEET_NAME

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SignJWT, importPKCS8 } from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LiquidacionPayload {
  liquidacion_id: string;
  empleado_nombre: string;
  empleado_documento: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_horas: number;
  valor_hora: number;
  total_pagar: number;
  estado: string;
  fecha_liquidacion: string;
}

async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');

  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google OAuth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: string[][]
): Promise<void> {
  const range = `${sheetName}!A:J`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sheets API error: ${error}`);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: LiquidacionPayload = await req.json();

    // Read secrets
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
    const sheetName = Deno.env.get('GOOGLE_SHEET_NAME') || 'Liquidaciones';

    if (!serviceAccountJson || !spreadsheetId) {
      throw new Error('Missing Google configuration secrets.');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get access token
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // Build row
    const row = [
      payload.empleado_nombre,
      payload.empleado_documento,
      `${payload.fecha_inicio} - ${payload.fecha_fin}`,
      payload.total_horas.toString(),
      payload.valor_hora.toString(),
      payload.total_pagar.toString(),
      payload.fecha_liquidacion,
      payload.estado,
      payload.liquidacion_id,
      new Date().toISOString(),
    ];

    // Append to sheet
    await appendToSheet(accessToken, spreadsheetId, sheetName, [row]);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('sync-sheets error:', message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
