# Arquitectura, funcionamiento y stack del proyecto

## Resumen

El proyecto es una plataforma de cursos online llamada **EdPlatform**. Permite publicar cursos bilingües, matricular estudiantes, gestionar pagos manuales o georresistentes, controlar progreso por sesiones, evaluar a los estudiantes y emitir certificados digitales verificables basados en Open Badges 3.0 / W3C Verifiable Credentials.

La aplicación está construida como una app full-stack con **Next.js App Router**: las páginas, componentes React y endpoints API viven en el mismo proyecto. La persistencia se gestiona con **PostgreSQL** mediante **Prisma ORM**.

## Stack tecnológico

| Capa | Tecnología | Uso |
| --- | --- | --- |
| Framework full-stack | Next.js 16 | Renderizado de páginas, rutas App Router y API routes |
| UI | React 19 | Componentes de interfaz y pantallas interactivas |
| Lenguaje | TypeScript 5 | Tipado de app, componentes, API y librerías |
| Estilos | Tailwind CSS 4 | Sistema principal de estilos |
| Componentes base | Radix UI | Primitivas accesibles para dialog, select, tabs, toast, etc. |
| Iconos | lucide-react | Iconografía de navegación, acciones y estados |
| Base de datos | PostgreSQL | Persistencia principal |
| ORM | Prisma 6 | Modelado, consultas y seed |
| Autenticación | jose + bcrypt | JWT HS256, cookies httpOnly y hash de contraseñas |
| Criptografía | @noble/ed25519 | Firma EdDSA de credenciales digitales |
| PDF | pdfkit | Generación de certificados en PDF |
| Storage | Supabase Storage, Cloudflare R2 o local | Comprobantes de pago y archivos subidos |
| Rate limiting | Upstash Redis o memoria | Límite de intentos en auth, pagos y verificación |
| Linting | ESLint 9 + eslint-config-next | Revisión estática |

## Estructura general

```text
src/
  app/
    [lang]/                    Rutas públicas bilingües: /es y /en
    api/                       Endpoints internos y públicos
    layout.tsx                 Layout raíz
    page.tsx                   Redirección/entrada raíz
    robots.ts, sitemap.ts      SEO
  components/
    certificates/              Visualización de certificados
    courses/                   Tarjetas y filtros de cursos
    evaluations/               Formulario de evaluación
    layout/                    Navbar y footer
    payments/                  Selector de pago y subida de comprobantes
    sessions/                  Lista de sesiones y marcado de progreso
  lib/
    auth.ts                    JWT, refresh tokens, cookies y RBAC
    prisma.ts                  Singleton de Prisma Client
    storage.ts                 Abstracción de storage
    rate-limit.ts              Rate limiting
    i18n/                      Diccionarios y helpers de idioma
    crypto/                    Firma EdDSA y generación de Open Badge
  messages/
    es.json, en.json           Textos de interfaz
  types/
    index.ts                   Tipos compartidos

prisma/
  schema.prisma                Modelo de datos
  seed.ts                      Datos iniciales

docs/
  *.html, *.md                 Documentación existente
```

## Funcionamiento por capas

### Frontend

Las pantallas principales están bajo `src/app/[lang]`, por lo que la aplicación trabaja con prefijo de idioma:

- `/es` y `/en`: página inicial.
- `/es/courses` y `/en/courses`: catálogo con búsqueda, filtros por moneda/modelo de precio y paginación.
- `/[lang]/courses/[slug]`: detalle del curso, sesiones, progreso, evaluación y emisión de certificado.
- `/[lang]/checkout?course=slug`: flujo de pago para cursos de pago.
- `/[lang]/dashboard`: cursos y certificados del estudiante.
- `/[lang]/dashboard/admin`: panel administrativo para pagos pendientes y usuarios.
- `/[lang]/verify/[badgeId]`: vista pública de verificación de certificado.
- `/[lang]/login` y `/[lang]/register`: autenticación.

Muchas páginas son componentes cliente porque consumen API routes con `fetch`, manejan estados de carga, formularios y navegación con `next/navigation`.

### Backend/API

La API está implementada con route handlers de Next.js bajo `src/app/api`. Los endpoints principales son:

| Módulo | Rutas | Responsabilidad |
| --- | --- | --- |
| Auth | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | Registro, inicio y cierre de sesión |
| Courses | `/api/courses`, `/api/courses/[id]`, `/api/courses/[id]/sessions` | Catálogo, detalle, creación/actualización y sesiones |
| Enrollments | `/api/enrollments`, `/api/enrollments/me` | Matrícula de usuario y consulta de cursos propios |
| Payments | `/api/payments/instructions`, `/api/payments/upload` | Instrucciones de pago y carga de comprobantes |
| Admin | `/api/admin/*` | Revisión de pagos, usuarios, certificados y auditoría |
| Sessions | `/api/sessions/[id]/mark-complete` | Registro de sesiones completadas |
| Evaluations | `/api/evaluations`, `/api/evaluations/[id]/submit` | Obtención segura de evaluación y corrección server-side |
| Certificates | `/api/certificates`, `/api/certificates/[id]`, `/api/certificates/[id]/pdf` | Listado, emisión y PDF de certificados |
| Verify | `/api/verify/[badgeId]` | Verificación pública JSON-LD |
| SEO | `/api/sitemap`, `sitemap.ts`, `robots.ts` | Sitemap y robots |

### Persistencia

El archivo `prisma/schema.prisma` define el dominio principal:

- `User`: usuarios con roles `ADMIN`, `INSTRUCTOR` y `STUDENT`.
- `RefreshToken`: tokens de refresh persistidos.
- `Course`: cursos con título/descripción en JSON bilingüe, precio, moneda, estado y visibilidad.
- `Session`: sesiones del curso, con orden, tipo, preview y URL de video.
- `Enrollment`: matrícula entre usuario y curso, estado y progreso.
- `Payment`: pagos asociados a una matrícula.
- `PaymentInstruction`: métodos e instrucciones de pago configurables por moneda y país.
- `SessionCompletion`: sesiones completadas por matrícula.
- `Evaluation`: evaluación de un curso, con preguntas en JSON.
- `EvaluationAttempt`: intentos, respuestas, puntuación y estado aprobado.
- `Certificate`: certificado emitido, badge ID, verificación, datos de credential subject y revocación.
- `AuditLog`: eventos administrativos y de pagos.

## Flujos principales

### 1. Navegación e idioma

El `middleware.ts` detecta idioma por URL, cookie `NEXT_LOCALE` o header `Accept-Language`. Si el usuario entra a `/`, redirige a `/es` o `/en`. Si entra a una ruta pública sin prefijo de idioma, la redirige al idioma correspondiente.

También añade headers de seguridad como:

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 2. Registro e inicio de sesión

El registro (`/api/auth/register`) valida email, contraseña y nombre, crea el usuario con contraseña hasheada mediante `bcrypt`, genera un access token y un refresh token, y los coloca en cookies httpOnly.

El login (`/api/auth/login`) valida credenciales, aplica rate limiting por IP y también emite cookies:

- `access_token`: JWT HS256 con expiración de 15 minutos.
- `refresh_token`: JWT HS256 persistido en la tabla `RefreshToken`, con expiración de 7 días.

Los helpers de `src/lib/auth.ts` centralizan:

- `hashPassword`
- `verifyPassword`
- `signAccessToken`
- `verifyAccessToken`
- `createRefreshToken`
- `revokeRefreshToken`
- `setAuthCookies`
- `clearAuthCookies`
- `getSession`
- `requireAuth`

`requireAuth(role?)` protege endpoints y permite que `ADMIN` actúe como rol superior.

### 3. Catálogo y cursos

La página de catálogo llama a `/api/courses` con filtros:

- `currency`
- `pricingModel`
- `search`
- `page`
- `pageSize`

La API devuelve cursos publicados y públicos. La búsqueda usa PostgreSQL con `ILIKE` sobre campos JSON (`title.es`, `title.en`) y `slug`.

En la página de detalle de curso se carga:

- información del curso;
- instructor;
- sesiones;
- estado de matrícula;
- progreso;
- sesiones completadas;
- certificado existente, si lo hay.

Las sesiones con `preview: true` pueden mostrarse como vista previa. Las sesiones completas dependen de matrícula activa.

### 4. Matrícula

La matrícula se crea en `/api/enrollments` enviando `courseSlug`.

Si el curso es gratuito:

- crea `Enrollment` con `status = ACTIVE`;
- usa `admissionType = CALL_SYSTEM`.

Si el curso es de pago:

- crea `Enrollment` con `status = PENDING_PAYMENT`;
- usa `admissionType = COMMERCIAL`;
- el usuario debe continuar por checkout y subir comprobante.

La relación `User + Course` es única, por lo que un usuario no puede matricularse dos veces en el mismo curso.

### 5. Pagos georresistentes

El checkout consulta `/api/payments/instructions?courseSlug=...`. Si el curso es gratis, el frontend intenta matricular directamente y redirige al curso.

Para cursos pagos:

1. Se muestran instrucciones activas según moneda del curso y, opcionalmente, país.
2. El usuario selecciona método de pago.
3. Sube comprobante mediante `/api/payments/upload`.
4. Se crea un `Payment` en estado `PENDING`.
5. Se registra un `AuditLog` con `PAYMENT_SUBMITTED`.

Los métodos modelados son:

- `ENZONA`
- `TRANSFERMOVIL`
- `BANK_TRANSFER_CUP`
- `BANK_TRANSFER_INTL`
- `CRYPTO_USDT`
- `CRYPTO_USDC`
- `MANUAL`

El panel admin muestra pagos pendientes. Al verificar un pago, la matrícula pasa a activa; al rechazarlo, se conserva el motivo.

### 6. Storage de comprobantes

`src/lib/storage.ts` decide el proveedor así:

1. Si `STORAGE_FALLBACK` está configurado como `supabase`, `r2` o `local`, usa ese valor.
2. Si no hay Supabase ni R2 configurados, usa almacenamiento local.
3. Si hay Supabase, intenta Supabase Storage.
4. Si no, intenta Cloudflare R2.

Si Supabase o R2 fallan, el sistema cae a local y guarda archivos en:

```text
uploads/{bucket}/{filePath}
```

Para comprobantes locales, devuelve URLs bajo `/api/uploads/...`.

### 7. Progreso

Cada sesión completada se registra en `SessionCompletion` con una restricción única por `enrollmentId + sessionId`.

El endpoint `/api/sessions/[id]/mark-complete` marca la sesión como completada y recalcula el progreso del enrollment. Cuando el progreso llega a 100%, la página de detalle habilita la evaluación.

### 8. Evaluaciones

El endpoint `/api/evaluations?courseSlug=...` exige:

- usuario autenticado;
- matrícula activa;
- progreso de 100%;
- evaluación existente para el curso.

Las respuestas correctas se eliminan antes de enviar las preguntas al cliente.

El submit ocurre en `/api/evaluations/[id]/submit`. La corrección es server-side:

- compara respuestas normalizadas (`trim` + lowercase);
- calcula puntos obtenidos;
- convierte a porcentaje;
- marca `passed` si alcanza `passingScore`.

Por defecto, el seed usa `passingScore = 80`.

### 9. Certificados

El certificado se emite desde `/api/certificates/[enrollmentId]`. Para emitirlo se requiere:

- matrícula perteneciente al usuario;
- progreso de 100%;
- evaluación aprobada;
- no tener certificado previo para esa matrícula.

El sistema genera:

- `badgeId` único;
- `verificationUrl`;
- `credentialSubject`;
- `issuerProfile`;
- narrativa de criterios;
- registro `Certificate`.

Cuando `EDDSA_PRIVATE_KEY` está configurada, `src/lib/crypto/badge.ts` genera una credencial compatible con Open Badges 3.0 / W3C Verifiable Credentials y la firma con EdDSA usando `@noble/ed25519`.

Si no hay clave EdDSA, el código permite emitir certificado en modo desarrollo sin firma criptográfica completa.

### 10. Verificación pública

`/api/verify/[badgeId]` devuelve JSON-LD con `Content-Type: application/ld+json`.

Si el request viene de navegador con `Accept: text/html`, redirige a la vista HTML `/{lang}/verify/{badgeId}`.

La respuesta indica:

- `valid`;
- `revoked`;
- `revocationReason`;
- estudiante;
- curso;
- fecha de emisión;
- `badgeId`;
- credential reconstruido.

Si el certificado fue revocado, `valid` devuelve `false`.

## Seguridad

El proyecto implementa varias medidas:

- Cookies httpOnly para tokens.
- `SameSite=Strict`.
- `secure` en cookies cuando `NODE_ENV=production`.
- Contraseñas con `bcrypt`.
- Autorización por rol con `requireAuth`.
- Rate limiting en login/registro, subida de pagos y verificación.
- Headers de seguridad desde `middleware.ts` y `next.config.ts`.
- Corrección de evaluaciones exclusivamente del lado servidor.
- No se envían respuestas correctas al cliente.
- Auditoría de eventos administrativos y pagos.

## Internacionalización

La app soporta español e inglés:

- rutas con prefijo `/es` y `/en`;
- diccionarios en `src/messages/es.json` y `src/messages/en.json`;
- helpers en `src/lib/i18n/index.ts`;
- títulos y descripciones de cursos/sesiones/evaluaciones guardados como JSON bilingüe en la base de datos.

## SEO y accesibilidad

El proyecto incluye:

- `robots.ts`;
- `sitemap.ts`;
- endpoint `/api/sitemap`;
- metadatos para rutas principales;
- uso de HTML semántico;
- componentes Radix UI para patrones accesibles;
- ARIA en varios componentes de interacción.

## Variables de entorno

Las variables esperadas están en `.env.example`. Las más importantes son:

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
EDDSA_PRIVATE_KEY="..."

SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

STORAGE_FALLBACK="r2"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="edplatform-uploads"

UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="EdPlatform"
```

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # ESLint
npm run db:migrate   # Migraciones Prisma en desarrollo
npm run db:push      # Sincronizar schema sin migración formal
npm run db:seed      # Cargar datos iniciales
npm run db:studio    # Prisma Studio
npm run db:generate  # Regenerar Prisma Client
npm run db:setup     # db:push + db:seed
```

## Datos iniciales

`prisma/seed.ts` crea:

- un administrador;
- un instructor;
- dos estudiantes;
- tres cursos publicados;
- sesiones de prueba;
- una matrícula inicial;
- instrucciones de pago para EnZona, Transfermóvil y USDT;
- una evaluación para el curso gratuito de programación web.

Credenciales de prueba:

| Rol | Email | Contraseña |
| --- | --- | --- |
| Admin | `admin@edplatform.com` | `password123` |
| Instructor | `profesor@edplatform.com` | `password123` |
| Estudiante CU | `alumno@edplatform.com` | `password123` |
| Estudiante internacional | `student@edplatform.com` | `password123` |

## Observaciones detectadas

- El middleware y el README mencionan `/api/auth/refresh`, pero no aparece un archivo `src/app/api/auth/refresh/route.ts` en el árbol actual. La creación y persistencia del refresh token sí existe en `src/lib/auth.ts`, pero falta o no está presente el endpoint de rotación.
- `README.md` ya documenta gran parte de la intención del sistema. Este documento resume el estado observado directamente en archivos de código y estructura.
- La emisión de certificados funciona en modo desarrollo sin `EDDSA_PRIVATE_KEY`, pero para producción debe configurarse la clave para que la credencial quede firmada.
- El storage local escribe en `uploads/`, directorio que no aparece como parte del árbol versionado actual y normalmente debería estar ignorado por Git.
- Hay soporte para Supabase y R2, pero la URL devuelta para R2 es `/storage/{filePath}`; conviene confirmar que exista una ruta pública o proxy equivalente en despliegue.

## Lectura rápida del flujo completo

1. Un usuario entra a `/`, el middleware lo redirige a `/es` o `/en`.
2. Explora cursos desde `/[lang]/courses`.
3. Entra al detalle de un curso.
4. Si el curso es gratis, se matricula y queda activo.
5. Si es pago, va a checkout, selecciona método, sube comprobante y queda pendiente.
6. Un administrador verifica o rechaza el pago.
7. Con matrícula activa, el estudiante completa sesiones.
8. Al llegar a 100%, puede tomar la evaluación.
9. Si aprueba, puede emitir certificado.
10. El certificado se puede descargar en PDF y verificar públicamente por `badgeId`.
