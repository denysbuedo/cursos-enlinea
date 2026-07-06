# EdPlatform — Plataforma de Cursos Online Híbrida

Plataforma web de educación en línea con **certificados digitales verificables** (Open Badges 3.0 + W3C Verifiable Credentials) firmados criptográficamente con EdDSA (Ed25519), y **pasarela de pagos georresistente** optimizada para operar en contextos con restricciones financieras.

## Tabla de Contenidos

- [Estado del Proyecto](#-estado-del-proyecto)
- [Stack Tecnológico](#-stack-tecnológico)
- [Inicio Rápido](#-inicio-rápido)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [API Reference](#-api-reference)
- [Arquitectura](#-arquitectura)
- [Flujos de Negocio](#-flujos-de-negocio)
- [Seguridad](#-seguridad)
- [Accesibilidad y SEO](#-accesibilidad-y-seo)
- [Cierre de etapa MOOC](docs/cierre-etapa-mooc.md)
- [Manual de usuario v1](docs/manual-usuario-v1.md)
- [Manual de usuario v1 HTML](docs/manual-usuario-v1.html)

---

## 📊 Estado del Proyecto

| Fase | Estado | Descripción |
|:---|:---:|:---|
| 🔧 F0 | ✅ | Rate limiting, headers seguridad, estructura base |
| 🏗️ F1 | ✅ | Schema Prisma v2, seed datos, Tailwind CSS v4 |
| 🔐 F2 | ✅ | Auth JWT + refresh tokens, RBAC, i18n ES/EN |
| 🎓 F3 | ✅ | Catálogo cursos, detalle, sesiones con preview |
| 💰 F4 | ✅ | Pasarela georresistente, upload comprobantes, panel admin pagos |
| 📊 F5 | ✅ | Progreso, sesiones completadas, evaluaciones (MCQ/TF/Short) |
| 🏆 F6 | ✅ | Open Badges 3.0, firma EdDSA, PDF certificados, revocación |
| ♿ F7 | ✅ | SEO (OG/Twitter/schema.org), sitemap, ARIA labels, semantic HTML |
| 🚀 F8 | ✅ | Documentación completa, build verificado |
| 🎓 MOOC R1 | ✅ | CMS académico, ficha MOOC, módulos, videos, materiales, evaluación automática, feedback, intentos y certificado verificable |

Documento de corte funcional: [docs/cierre-etapa-mooc.md](docs/cierre-etapa-mooc.md).

---

## 🔑 Stack Tecnológico

| Capa | Tecnología |
|:---|:---|
| **Frontend + Backend** | Next.js 16 + React 19 + TypeScript |
| **Estilos** | Tailwind CSS v4 + Radix UI (headless accessible) |
| **Base de Datos** | PostgreSQL 15+ + Prisma ORM v6 |
| **Autenticación** | JWT (HS256) + Refresh Tokens en httpOnly cookies + RBAC (ADMIN/INSTRUCTOR/STUDENT) |
| **Criptografía** | EdDSA (Ed25519) vía `@noble/ed25519` para firma de certificados |
| **PDF** | `pdfkit` para generación de certificados |
| **Storage** | Supabase / Cloudflare R2 (S3-compatible fallback) |
| **Rate Limiting** | Upstash Redis (producción) / In-memory Map (desarrollo) |
| **Iconos** | `lucide-react` |

---

## 🚀 Inicio Rápido

### Requisitos

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 15

### Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con:
#   DATABASE_URL="postgresql://usuario:password@localhost:5432/edplatform?schema=public"
#   JWT_SECRET="valor-seguro-min-32-chars"
#   JWT_REFRESH_SECRET="valor-seguro-min-32-chars"
#   EDDSA_PRIVATE_KEY="..." (opcional en desarrollo)

# 3. Crear base de datos
#    CREATE DATABASE edplatform;

# 4. Sincronizar schema y seed
npm run db:push
npm run db:seed

# 5. Iniciar servidor
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Credenciales de prueba (seed)

| Rol | Email | Contraseña |
|:---|:---|:---|
| Admin | admin@edplatform.com | password123 |
| Instructor | profesor@edplatform.com | password123 |
| Estudiante (Cuba) | alumno@edplatform.com | password123 |
| Estudiante (Intl) | student@edplatform.com | password123 |

---

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── [lang]/                     # Rutas i18n (/es, /en)
│   │   ├── page.tsx                # Landing page
│   │   ├── courses/
│   │   │   ├── page.tsx            # Catálogo con filtros + paginación
│   │   │   └── [slug]/page.tsx     # Detalle curso + sesiones + progreso + evaluación
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Mis cursos + mis certificados
│   │   │   └── admin/page.tsx      # Panel admin: pagos pendientes + certificados
│   │   ├── checkout/page.tsx       # Flujo de pago (3 pasos)
│   │   └── verify/[badgeId]/page.tsx  # Verificación pública de badges
│   ├── api/
│   │   ├── auth/                   # register, login, refresh
│   │   ├── courses/                # CRUD cursos + sesiones
│   │   ├── payments/               # instructions, upload
│   │   ├── enrollments/            # crear matrícula, mis matrículas
│   │   ├── sessions/[id]/mark-complete
│   │   ├── evaluations/            # obtener, submit
│   │   ├── certificates/           # emitir, listar mis certs, PDF
│   │   ├── admin/
│   │   │   ├── payments/           # pending, verify, reject
│   │   │   ├── payment-instructions/  # CRUD
│   │   │   └── certificates/       # listar todos, revoke
│   │   └── verify/[badgeId]        # Verificación pública JSON-LD
│   ├── sitemap.ts                  # Sitemap dinámico bilingüe
│   └── robots.ts                   # Robots.txt
├── components/
│   ├── layout/                     # Navbar (client), Footer
│   ├── courses/                    # CourseCard, CourseFilters
│   ├── sessions/                   # SessionList (con mark-complete)
│   ├── payments/                   # PaymentSelector, ProofUpload
│   ├── evaluations/                # EvaluationForm (MCQ/TF/Short)
│   └── certificates/               # CertificateViewer
├── lib/
│   ├── auth.ts                     # JWT, bcrypt, cookies, session helpers
│   ├── prisma.ts                   # Prisma singleton
│   ├── i18n/index.ts              # Diccionarios ES/EN + helper t()
│   ├── crypto/
│   │   ├── sign.ts                 # EdDSA sign/verify
│   │   └── badge.ts                # Open Badge 3.0 JSON-LD generator
│   ├── storage.ts                  # Supabase / R2 abstraction
│   └── rate-limit.ts              # Upstash Redis / in-memory
├── messages/                       # es.json, en.json
├── types/index.ts                  # TypeScript interfaces
└── middleware.ts                    # i18n + security headers
```

---

## 🗄️ Base de Datos

### Modelos Principales (14 tablas)

| Modelo | Descripción |
|:---|:---|
| `User` | Usuarios con roles ADMIN/INSTRUCTOR/STUDENT |
| `RefreshToken` | Tokens de refresh almacenados en BD con expiración |
| `Course` | Cursos con títulos/descripciones bilingües (JSON), slug, precio, visibilidad |
| `Session` | Sesiones con tipo (RECORDED/LIVE/HYBRID), preview flag, orden |
| `Enrollment` | Matrícula de usuario a curso, progreso (%), admissionType |
| `Payment` | Pagos con método, moneda, estado, comprobante, IP/país |
| `PaymentInstruction` | Instrucciones de pago dinámicas con i18n y geoRestriction |
| `SessionCompletion` | Tracking de sesiones completadas (unique por enrollment+session) |
| `Evaluation` | Evaluación por curso con preguntas en JSON (MCQ/TRUEFALSE/SHORT) |
| `EvaluationAttempt` | Intento de evaluación con respuestas, score, passed |
| `Certificate` | Certificados Open Badge 3.0 con badgeId, firma, credentialSubject |
| `AuditLog` | Auditoría de acciones administrativas |

### Comandos

```bash
npm run db:push      # Sincronizar schema (desarrollo)
npm run db:migrate   # Migraciones formales
npm run db:seed      # Datos de prueba
npm run db:studio    # Prisma Studio (explorador visual)
npm run db:generate  # Regenerar cliente Prisma
npm run db:setup     # push + seed en un paso
```

---

## 📡 API Reference

### Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| POST | `/auth/register` | ❌ | Registro con email/name/password |
| POST | `/auth/login` | ❌ | Login, retorna JWT en httpOnly cookie |
| POST | `/auth/refresh` | 🔒 | Rotación de refresh token |

### Cursos (`/api/courses`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| GET | `/courses` | ❌ | Catálogo con filtros (?currency, ?pricingModel, ?search, ?page) |
| GET | `/courses/[slug\|id]` | ❌ | Detalle con sesiones + isEnrolled |
| GET | `/courses/[id]/sessions` | ❌ | Sesiones con control preview vs enrolled |

### Matrículas (`/api/enrollments`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| POST | `/enrollments` | 🔒 | Crear matrícula (gratis→ACTIVE, pago→PENDING_PAYMENT) |
| GET | `/enrollments/me` | 🔒 | Mis matrículas activas |

### Pagos (`/api/payments`, `/api/admin/payments`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| GET | `/payments/instructions` | ❌ | Instrucciones filtradas por curso y país |
| POST | `/payments/upload` | 🔒 | Subir comprobante (multipart), prevención doble pago |
| GET | `/admin/payments/pending` | 👑 | Pagos pendientes de revisión |
| POST | `/admin/payments/[id]/verify` | 👑 | Verificar pago + activar matrícula (transacción atómica) |
| POST | `/admin/payments/[id]/reject` | 👑 | Rechazar con motivo |
| GET/POST | `/admin/payment-instructions` | 👑 | CRUD de instrucciones de pago |

### Progreso y Evaluaciones (`/api/sessions`, `/api/evaluations`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| POST | `/sessions/[id]/mark-complete` | 🔒 | Marcar sesión + recalcular progreso |
| GET | `/evaluations?courseSlug=x` | 🔒 | Evaluación sin correctAnswer, requiere progreso 100% |
| POST | `/evaluations/[id]/submit` | 🔒 | Enviar respuestas, corrección server-side |

### Certificados (`/api/certificates`, `/api/admin/certificates`)
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| GET | `/certificates` | 🔒 | Mis certificados |
| POST | `/certificates/[enrollmentId]` | 🔒 | Emitir certificado (OpenBadge + EdDSA) |
| GET | `/certificates/[id]/pdf` | ❌ | Descargar PDF del certificado |
| GET | `/admin/certificates` | 👑 | Listar todos los certificados |
| POST | `/admin/certificates/[id]/revoke` | 👑 | Revocar certificado |

### Verificación Pública
| Método | Ruta | Auth | Descripción |
|:---|:---|:---:|:---|
| GET | `/verify/[badgeId]` | ❌ | Verificación JSON-LD (Content-Type: application/ld+json) |

> 🔒 = Requiere autenticación (JWT cookie)  
> 👑 = Requiere rol ADMIN

---

## 🔐 Arquitectura

### Autenticación
- **Access Token**: JWT (HS256), 15 min, en cookie `access_token` (httpOnly, SameSite=Strict)
- **Refresh Token**: JWT almacenado en BD (tabla `RefreshToken`), 7 días, cookie `refresh_token` (httpOnly, path=/api/auth/refresh)
- **Rate Limiting**: 5 intentos/min en auth, 10/min en upload de pagos, 100/min en verify

### Pagos Georresistentes
- Sin dependencia de Stripe/PayPal
- Soporte para: EnZona, Transfermóvil, transferencias bancarias (CUP/internacional), crypto (USDT/USDC)
- Instrucciones de pago configurables desde admin panel con restricción geográfica
- Comprobantes subidos a Supabase Storage (fallback: Cloudflare R2)

### Certificados Open Badges 3.0
1. Estudiante completa 100% del curso + aprueba evaluación (≥80%)
2. Sistema genera JSON-LD conforme a W3C Verifiable Credentials v2 + Open Badges 3.0
3. Firma criptográfica EdDSA (Ed25519) con clave privada de entorno
4. Verificación pública en `/verify/[badgeId]` sin autenticación
5. Revocación con audit log, reflejada en verificador público

---

## ♿ Accesibilidad y SEO

- **Landmarks**: `role="banner"` (header), `role="main"`, `role="contentinfo"` (footer)
- **ARIA**: `radiogroup` en evaluaciones, `aria-label` en CourseCards y botones de pago, `aria-pressed` en selectores
- **Semantic HTML**: jerarquía h1-h6, `<nav>` en navbar, `<main>` en contenido
- **SEO**: Open Graph + Twitter Cards, schema.org `EducationalOrganization`, sitemap.xml bilingüe dinámico, robots.txt
- **Componentes accesibles**: Radix UI (headless, WAI-ARIA compliant), Lucide icons

---

## 📋 Variables de Entorno

```bash
# Base de Datos
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="min-32-chars"
JWT_REFRESH_SECRET="min-32-chars"

# EdDSA (opcional en dev)
EDDSA_PRIVATE_KEY="hex-64-chars"

# Storage
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""
STORAGE_FALLBACK="r2"  # "supabase" | "r2"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="edplatform-uploads"

# Rate Limiting
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="EdPlatform"
```

---

## 📝 Scripts

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run start        # Iniciar producción
npm run lint         # ESLint
npm run db:push      # Sincronizar schema
npm run db:seed      # Sembrar datos
npm run db:studio    # Prisma Studio
npm run db:setup     # push + seed
```
