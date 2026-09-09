# OrigamiApp

PWA para registro de asistencia y liquidación de sueldos. Demo para charla de frente de ingeniería.

## Arquitectura

```
         Usuario (Smartphone / Desktop)
                    │
                    ▼
          Angular 19 PWA (Vercel)
                    │
                    ▼ HTTPS
                Supabase
      ┌─────────────┼─────────────┐
      │             │             │
 Auth (email)  PostgreSQL   Edge Functions
                  + RLS           │
                          ┌───────┴───────┐
                          ▼               ▼
                  create-empleado    sync-sheets
                  (service_role)   Google Sheets API
```

## Roles

| Rol | Puede |
|-----|-------|
| `admin` | Todo: empleados, asistencia de cualquier persona, liquidar, editar registros |
| `colaborador` | Registrar y editar su propia asistencia, ver sus horas efectivas y sus liquidaciones |

El aislamiento se aplica en la base de datos con Row Level Security, no solo en la UI.

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Frontend | Angular 19 (standalone, signals, nuevo control flow) |
| Estilos | SCSS propio, glassmorphism, mobile first |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| Integración | Google Sheets API con Service Account |
| Hosting | Vercel (SPA estático) |

## Requisitos

- Node.js 18+
- npm 9+
- Supabase CLI (solo para desplegar Edge Functions)

## Instalación

```bash
npm install
npm start
```

Abre `http://localhost:4200`.

## Configuración de Supabase

### 1. Migraciones

En **Supabase Dashboard → SQL Editor**, ejecuta en orden:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_roles_and_profiles.sql
```

La migración `001` crea las tablas base. La `002` agrega roles, la tabla `profiles`,
el campo `email` en empleados y reescribe todas las políticas RLS por rol.

> En `002` reemplaza `TU_EMAIL_AQUI` por el email de tu usuario antes de ejecutar.
> Sin un `profile` asignado el login se rechaza.

### 2. Usuario administrador

1. **Authentication → Users → Add User**: crea el usuario con *Auto Confirm* activado.
2. Ejecuta la sección final de `002_roles_and_profiles.sql` con ese email para asignarle `role = 'admin'`.

Los colaboradores no se crean a mano: el admin los crea desde la app y la Edge
Function `create-empleado` provisiona la cuenta con rol `colaborador`.

### 3. Edge Functions

```bash
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy create-empleado
supabase functions deploy sync-sheets
```

`create-empleado` usa `SUPABASE_SERVICE_ROLE_KEY`, que Supabase inyecta
automáticamente. No requiere secrets adicionales.

### 4. Secrets para Google Sheets

**Edge Functions → Secrets**:

| Secret | Descripción |
|--------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de la Service Account |
| `GOOGLE_SPREADSHEET_ID` | ID del spreadsheet (está en su URL) |
| `GOOGLE_SHEET_NAME` | Nombre de la hoja destino (default: `Liquidaciones`) |

## Google Sheets

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. Habilita **Google Sheets API**.
3. Crea una **Service Account** y genera una key en formato JSON.
4. Crea el spreadsheet y compártelo como *Editor* con el email de la Service Account.
5. Copia el ID desde la URL: `https://docs.google.com/spreadsheets/d/{ID}/edit`.
6. Registra los tres secrets del punto anterior.

Columnas que escribe la función: empleado, documento, período, total horas,
valor hora, total a pagar, fecha de liquidación, estado, id de liquidación y fecha de sync.

## Variables de entorno del frontend

`src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',
  supabaseKey: 'sb_publishable_TU_KEY',
};
```

La *publishable key* es pública por diseño y depende de RLS para ser segura.
Nunca incluyas en el frontend `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PRIVATE_KEY`
ni `GOOGLE_CLIENT_SECRET`.

## Build y deploy

```bash
npm run build
```

En Vercel, conecta el repositorio y usa:

- Build command: `npx ng build --configuration production`
- Output directory: `dist/liquidador-sueldos-pwa/browser`

`vercel.json` ya define los rewrites que necesita Angular Router.

## Estructura

```
src/app/
├── core/
│   ├── services/     supabase, auth (rol + sesión), sheets-sync
│   ├── guards/       authGuard, adminGuard
│   └── models/       interfaces de dominio
├── shared/
│   ├── components/   navbar, spinner, badge, toast, back-button
│   ├── pipes/        currencyCop, hoursFormat
│   └── utils/        time-calculator
├── features/
│   ├── auth/         login
│   ├── dashboard/    métricas y accesos (admin)
│   ├── empleados/    CRUD + provisión de cuentas (admin)
│   ├── asistencia/   listado con filtros + formulario de registro
│   └── liquidacion/  cálculo, historial y desprendible imprimible
└── layout/           shell con navbar
```

## Pantallas

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/login` | Público | Ingreso con email y contraseña |
| `/dashboard` | Admin | Métricas del período y accesos rápidos |
| `/empleados` | Admin | Listado, alta, edición y desactivación |
| `/asistencia` | Ambos | Registros con filtros y total de horas efectivas |
| `/asistencia/registrar` | Ambos | Alta y edición de jornada con cálculo en vivo |
| `/liquidacion` | Ambos | Admin liquida; el colaborador ve sus liquidaciones |
| `/liquidacion/:id` | Ambos | Desprendible de pago imprimible |

## Licencia

MIT
