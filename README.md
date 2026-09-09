# Liquidador de Sueldos — PWA

Aplicación web progresiva para la gestión de asistencia y liquidación de sueldos de empleados. Desarrollada como demo para charla de frente de ingeniería.

## Arquitectura

```
         Usuario (Smartphone / Desktop)
                    │
                    ▼
          Angular 19 PWA (Vercel)
                    │
                    ▼ HTTPS
               Supabase
        ┌───────────┼───────────┐
        │           │           │
   Auth (email)  PostgreSQL  Edge Functions
                                │
                                ▼
                         Google Sheets API
```

## Stack tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Frontend | Angular 19, TypeScript, SCSS |
| PWA | Service Worker, manifest.webmanifest |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| Integración | Google Sheets API via Service Account |
| Hosting | Vercel (SPA estático) |
| Repositorio | GitHub |

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
git clone https://github.com/oscariasADL/liquidador-sueldos-pwa.git
cd liquidador-sueldos-pwa
npm install
```

## Desarrollo local

```bash
npm start
```

La app se abre en `http://localhost:4200`.

## Variables de entorno

Archivo `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',
  supabaseKey: 'sb_publishable_TU_KEY',
};
```

**NUNCA incluir en el frontend:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_SECRET`

## Build

```bash
npm run build
```

Output en `dist/liquidador-sueldos-pwa/browser/`.

## Deploy en Vercel

1. Conecta el repo de GitHub en [vercel.com](https://vercel.com)
2. Configura:
   - Build command: `npx ng build --configuration production`
   - Output directory: `dist/liquidador-sueldos-pwa/browser`
3. El `vercel.json` ya configura rewrites para Angular Router

## Supabase

### Migración

Ejecuta el SQL en **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/001_initial_schema.sql
```

Este script crea:
- 3 tablas: `empleados`, `registros_asistencia`, `liquidaciones`
- Triggers de `updated_at` automático
- RLS habilitado en todas las tablas
- Policies para usuarios autenticados
- 3 empleados de ejemplo (seed)
- Índices de performance

### RLS (Row Level Security)

- Habilitado en todas las tablas
- Solo usuarios `authenticated` pueden SELECT, INSERT, UPDATE
- No hay policies de DELETE (los registros se desactivan)
- No hay acceso para `anon`

### Crear usuario admin

En **Supabase Dashboard → Authentication → Users → Add User**:
- Email: tu email
- Password: tu contraseña
- Auto confirm: sí

### Edge Functions

#### sync-sheets

Sincroniza liquidaciones con Google Sheets.

Código: `supabase/functions/sync-sheets/index.ts`

**Secrets requeridos (Supabase Dashboard → Edge Functions → Secrets):**

| Secret | Descripción |
|--------|------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de la Service Account de Google |
| `GOOGLE_SPREADSHEET_ID` | ID del spreadsheet (de la URL de Google Sheets) |
| `GOOGLE_SHEET_NAME` | Nombre de la hoja (default: "Liquidaciones") |

## Google Sheets

### Configuración

1. **Crear proyecto en Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
2. **Habilitar Google Sheets API** → APIs & Services → Library → buscar "Google Sheets API" → Enable
3. **Crear Service Account** → IAM & Admin → Service Accounts → Create
4. **Generar key JSON** → Service Account → Keys → Add Key → JSON
5. **Crear spreadsheet** en Google Sheets
6. **Compartir el spreadsheet** con el email de la Service Account (Editor)
7. **Copiar el spreadsheet ID** de la URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
8. **Configurar secrets** en Supabase con el JSON, ID y nombre de hoja

### Columnas del spreadsheet

| Columna | Contenido |
|---------|-----------|
| A | Nombre del empleado |
| B | Documento |
| C | Período |
| D | Total horas |
| E | Valor hora |
| F | Total a pagar |
| G | Fecha liquidación |
| H | Estado |
| I | ID liquidación |
| J | Fecha sync |

## Estructura del proyecto

```
src/app/
├── core/                 # Services singleton, guards, models
│   ├── services/         # supabase, auth, sheets-sync
│   ├── guards/           # auth guard
│   └── models/           # TypeScript interfaces
├── shared/               # Componentes y utilidades reutilizables
│   ├── components/       # navbar, spinner, badge, toast
│   ├── pipes/            # currencyCop, hoursFormat
│   └── utils/            # time-calculator
├── features/             # Módulos por funcionalidad
│   ├── auth/             # Login
│   ├── dashboard/        # Métricas
│   ├── empleados/        # CRUD empleados
│   ├── asistencia/       # Registro diario
│   └── liquidacion/      # Liquidar + sync Sheets
└── layout/               # Main layout con navbar
```

## Pantallas

1. **Login** — Email + contraseña con Supabase Auth
2. **Dashboard** — Métricas: empleados activos, asistencias hoy, liquidaciones pendientes, total mes
3. **Empleados** — Listar, crear, editar, desactivar
4. **Asistencia** — Registrar entrada/salida/almuerzo por empleado, tabla de últimos 30 días
5. **Liquidación** — Seleccionar empleado + rango → desglose día a día → confirmar → sync Sheets
6. **Detalle Liquidación** — Desglose, marcar pagado, reintentar sync

## Licencia

MIT
