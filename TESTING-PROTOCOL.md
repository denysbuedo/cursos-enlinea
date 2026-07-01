# Protocolo de Pruebas — EdPlatform

> **URL base:** `http://localhost:3000`
> **Fecha inicio:** 2026-05-30

---

## Credenciales de Prueba

| Rol | Email | Contraseña | País |
|:---|:---|:---|:---:|
| **Admin** | admin@edplatform.com | password123 | — |
| **Instructor** | profesor@edplatform.com | password123 | — |
| **Estudiante (Cuba)** | alumno@edplatform.com | password123 | CU |
| **Estudiante (Intl)** | student@edplatform.com | password123 | US |

---

## Cursos de Prueba (seed)

| # | Curso | Tipo | Precio | Sesiones |
|:---:|:---|:---|:---|:---:|
| 1 | Marketing Digital Avanzado | PAID | $25 USD | 2 (1 preview) |
| 2 | Introducción a la Programación Web | FREE | — | 2 (1 preview) + Evaluación |
| 3 | Emprendimiento Digital en Cuba | PAID | $15 CUP | 1 (preview) |

---

# ROL 1: VISITANTE (Usuario sin autenticación)

### V1 — Landing Page
- [x] **V1.1** Acceder a `http://localhost:3000` → redirige a `/es`
- [x] **V1.2** Acceder a `http://localhost:3000/en` → página en inglés
- [x] **V1.3** Ver hero con título "Cursos Online con Certificados Verificables"
- [x] **V1.4** Ver botones: "Cursos" y "Mi Panel"
- [x] **V1.5** Ver Navbar con enlaces: Inicio, Cursos, Iniciar Sesión, Registrarse
- [x] **V1.6** Ver Footer con Términos, Privacidad, Contacto

### V2 — Navegación i18n
- [x] **V2.1** Cambiar idioma a EN → toda la UI se traduce
- [x] **V2.2** Cambiar idioma a ES → toda la UI vuelve a español
- [x] **V2.3** El cambio de idioma se mantiene al navegar entre páginas

### V3 — Catálogo de Cursos
- [x] **V3.1** Acceder a `/es/courses` → ver los 3 cursos del seed
- [x] **V3.2** Cada CourseCard muestra: título, descripción, precio/tipo, #sesiones, #estudiantes
- [x] **V3.3** Filtrar por moneda (CUP) → solo "Emprendimiento Digital en Cuba"
- [x] **V3.4** Filtrar por moneda (USD) → solo "Marketing Digital Avanzado" (y el gratuito en USD)
- [x] **V3.5** Filtrar por tipo FREE → solo "Introducción a la Programación Web"
- [x] **V3.6** Filtrar por tipo PAID → los 2 cursos de pago
- [x] **V3.7** 🐛 Buscar "marketing" → solo "Marketing Digital Avanzado" (⚠️ solo case-sensitive: "Marketing" funciona, "marketing" no)
- [x] **V3.8** 🐛 Buscar "programación" → solo "Introducción a la Programación Web" (⚠️ solo con acento y case exacto)
- [x] **V3.9** Combinar filtros (ej. USD + PAID) → resultado correcto
- [x] **V3.10** Limpiar filtros → vuelven todos los cursos
- [ ] **V3.11** Paginación: si hay > 12 cursos, se muestran controles (⚠️ N/A - solo 3 cursos en seed)

### V4 — Detalle de Curso (sin login)
- [x] **V4.1** Click en curso "Marketing Digital Avanzado" → `/es/courses/marketing-digital-avanzado`
- [x] **V4.2** Ver título, descripción, precio ($25 USD), breadcrumb
- [x] **V4.3** Ver sidebar con #estudiantes, visibilidad, fecha
- [x] **V4.4** Ver lista de sesiones: 1 preview (accesible), 1 bloqueada (por diseño sin login)
- [x] **V4.5** Sesión preview muestra "Vista previa gratuita"
- [x] **V4.6** Sesión bloqueada muestra "Requiere matrícula"
- [x] **V4.7** Ver botón "Matricularse" (redirige a checkout o login)
- [x] **V4.8** Curso gratuito ("Introducción a la Programación Web") → ver botón "Matricularse"

### V5 — Login / Registro
- [x] **V5.1** Acceder a `/es/login` → formulario de login
- [x] **V5.2** Login con credenciales inválidas → mensaje de error
- [x] **V5.3** Login con credenciales válidas → redirige a dashboard
- [x] **V5.4** Rate limiting: 3+ intentos fallidos → bloqueo temporal (429)
- [x] **V5.5** Acceder a `/es/register` → formulario de registro
- [x] **V5.6** Registrar nuevo usuario con email, nombre, contraseña → éxito
- [x] **V5.7** Registrar con email ya existente → mensaje de error
- [x] **V5.8** Enlace "¿No tienes cuenta?" → va a register
- [x] **V5.9** Enlace "¿Ya tienes cuenta?" → va a login

### V6 — Verificación Pública de Certificados
- [x] **V6.1** Acceder a `/es/verify/badge-inexistente` → "Certificado no encontrado"
- [ ] **V6.2** ⏳ Acceder a URL de un badge válido → "✅ Certificado Válido" (requiere crear certificado)
- [ ] **V6.3** ⏳ Ver datos: estudiante, curso, fecha emisión, badge ID
- [ ] **V6.4** ⏳ Acceder a URL de un badge revocado → "❌ Certificado Revocado" + razón

### V7 — SEO
- [ ] **V7.1** 🔴 BUG: `robots.txt` redirige 307 → `/es/robots.txt` → 404 (middleware no excluye robots.txt)
- [ ] **V7.2** 🔴 BUG: `sitemap.xml` redirige 307 → `/es/sitemap.xml` → 404 (mismo problema)
- [x] **V7.3** Verificar meta tags Open Graph en páginas (título, descripción)
- [x] **V7.4** Verificar meta tags Twitter Card
- [x] **V7.5** Verificar schema.org `EducationalOrganization` en landing

### V8 — Seguridad
- [x] **V8.1** Headers de seguridad presentes: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- [ ] **V8.2** ⏳ Cookies httpOnly (access_token, refresh_token) — se verifican al hacer login
- [ ] **V8.3** ⏳ Cookies SameSite=Strict — se verifican al hacer login

### V9 — Accesibilidad
- [x] **V9.1** Roles ARIA landmarks presentes: `role="banner"`, `role="main"`, `role="contentinfo"`
- [x] **V9.2** Elementos `<nav>` en navegación
- [ ] **V9.3** Jerarquía correcta de headings (h1-h6) — requiere verificación manual
- [ ] **V9.4** Navegación por teclado funcional (Tab, Enter, Escape) — requiere verificación manual
- [ ] **V9.5** Focus visible en elementos interactivos — requiere verificación manual

### V10 — Rutas Protegidas
- [x] **V10.1** Acceder a `/es/dashboard` sin login → redirige a login (client-side)
- [x] **V10.2** Acceder a `/es/dashboard/admin` sin login → redirige a login (client-side)
- [x] **V10.3** Acceder a `/es/checkout?course=xxx` sin login → redirige a login (client-side)

---

# ROL 2: ESTUDIANTE (Student)

> **Login:** alumno@edplatform.com (Cuba) / student@edplatform.com (Internacional)
> **Estado inicial:** alumno@edplatform.com ya tiene matrícula en "Introducción a la Programación Web" (50% progreso)

### S1 — Dashboard del Estudiante
- [ ] **S1.1** Login como estudiante → redirige a `/es/dashboard`
- [ ] **S1.2** Sección "Mis Cursos": ver curso(s) matriculado(s) con barra de progreso
- [ ] **S1.3** Sección "Mis Certificados": vacía o con certificados existentes
- [ ] **S1.4** Click en un curso → va al detalle del curso
- [ ] **S1.5** Estado "Sin cursos": mensaje + botón "Cursos"
- [ ] **S1.6** Navbar muestra "Mi Panel" y opción de cerrar sesión (ya no "Login")

### S2 — Progreso de Sesiones
- [ ] **S2.1** Abrir curso matriculado → ver barra de progreso actual
- [ ] **S2.2** Sesiones completadas → marcadas con check ✅
- [ ] **S2.3** Sesiones no completadas → botón "Marcar como completada"
- [ ] **S2.4** Click en "Marcar como completada" → sesión se marca + progreso se recalcula
- [ ] **S2.5** Progreso va del 50% → 100% al completar todas las sesiones
- [ ] **S2.6** Sesiones preview visibles sin estar matriculado
- [ ] **S2.7** No se puede marcar sesiones de cursos donde no está matriculado

### S3 — Matrícula en Curso Gratuito
- [ ] **S3.1** Ir al catálogo → curso "Introducción a la Programación Web" (FREE)
- [ ] **S3.2** Click en "Matricularse" → matrícula creada, redirige al curso
- [ ] **S3.3** Si ya está matriculado → redirige directamente al curso (sin duplicar)
- [ ] **S3.4** Estado de matrícula: ACTIVE

### S4 — Matrícula en Curso de Pago (Flujo Completo)
- [ ] **S4.1** Ir a curso "Marketing Digital Avanzado" → click en "Matricularse"
- [ ] **S4.2** Redirige a `/es/checkout?course=marketing-digital-avanzado`
- [ ] **S4.3** Ver métodos de pago disponibles filtrados por país y moneda
- [ ] **S4.4** Estudiante Cuba (CU) → ve EnZona (CUP), Transfermóvil (CUP), USDT (USD)
- [ ] **S4.5** Estudiante Intl (US) → ve USDT (USD), Bank Transfer Intl (sin métodos CU)
- [ ] **S4.6** Paso 1: Seleccionar método de pago
- [ ] **S4.7** Paso 2: Ver instrucciones específicas del método elegido
- [ ] **S4.8** Paso 3: Ver datos de cuenta (phoneNumber, walletAddress, etc.)
- [ ] **S4.9** Paso 4: Subir comprobante (imagen o PDF)
- [ ] **S4.10** Vista previa del archivo seleccionado
- [ ] **S4.11** Click en "Enviar" → pantalla de éxito "¡Pago registrado!"
- [ ] **S4.12** Redirigir al dashboard después del envío exitoso
- [ ] **S4.13** Intentar pagar de nuevo el mismo curso → prevención de doble pago
- [ ] **S4.14** Curso gratis: checkout redirige directamente sin pasar por pago

### S5 — Evaluación (curso gratuito)
- [ ] **S5.1** Completar 100% del curso "Introducción a la Programación Web"
- [ ] **S5.2** Aparece sección "Elegible para certificado"
- [ ] **S5.3** Click en "Realizar evaluación" → carga preguntas
- [ ] **S5.4** Pregunta tipo MCQ: seleccionar opción
- [ ] **S5.5** Pregunta tipo TRUEFALSE: seleccionar verdadero/falso
- [ ] **S5.6** Pregunta tipo SHORT: escribir respuesta
- [ ] **S5.7** Enviar evaluación → corrección server-side
- [ ] **S5.8** Aprobado (≥80%): mensaje de éxito con score
- [ ] **S5.9** Reprobado (<80%): opción de "Intentar de nuevo"
- [ ] **S5.10** No se puede acceder a la evaluación sin 100% de progreso

> **Nota:** La evaluación solo existe para "Introducción a la Programación Web". Los otros cursos necesitan:
> - Completar todas las sesiones → 100% progreso
> - La evaluación se crea manualmente en el seed o por admin

### S6 — Emisión de Certificado
- [ ] **S6.1** Tras aprobar evaluación → aparece botón "Emitir certificado"
- [ ] **S6.2** Click en "Emitir certificado" → sistema genera Open Badge 3.0 + firma EdDSA
- [ ] **S6.3** Badge ID generado y mostrado
- [ ] **S6.4** Botón "Descargar PDF" → genera y descarga PDF del certificado
- [ ] **S6.5** Botón "Verificar online" → abre página de verificación pública
- [ ] **S6.6** El certificado aparece en el dashboard en "Mis Certificados"
- [ ] **S6.7** No se puede emitir certificado sin aprobar evaluación
- [ ] **S6.8** No se puede emitir duplicado para la misma matrícula

### S7 — Mis Certificados (Dashboard)
- [ ] **S7.1** Ver certificados emitidos con fecha e información del curso
- [ ] **S7.2** Descargar PDF desde el dashboard
- [ ] **S7.3** Verificar certificado desde el dashboard (enlace a /verify/[badgeId])

### S8 — Logout
- [ ] **S8.1** Click en "Cerrar Sesión" → cookies eliminadas, redirige a home
- [ ] **S8.2** Tras logout, rutas protegidas redirigen a login
- [ ] **S8.3** Refresh token revocado en BD al hacer logout

### S9 — Refresh Token
- [ ] **S9.1** Dejar sesión inactiva > 15 min (access token expira)
- [ ] **S9.2** Realizar una acción → refresh automático sin re-login
- [ ] **S9.3** Dejar sesión inactiva > 7 días → refresh token expira, requiere re-login

### S10 — Verificación Pública de Certificado Propio
- [ ] **S10.1** Acceder a URL de verificación de un badge propio sin login → visible
- [ ] **S10.2** Verificar firma criptográfica EdDSA (JSON-LD en `/api/verify/[badgeId]`)
- [ ] **S10.3** Content-Type es `application/ld+json`

---

# ROL 3: INSTRUCTOR (Profesor)

> **Login:** profesor@edplatform.com / password123
> **Contexto:** En esta fase el rol INSTRUCTOR tiene acceso básico. Sus permisos son similares a STUDENT + puede ver sus cursos. Verificar que no tiene acceso a panel admin.

### I1 — Acceso y Navegación
- [ ] **I1.1** Login como instructor → redirige a dashboard
- [ ] **I1.2** Dashboard muestra "Mis Cursos" (cursos donde es instructor)
- [ ] **I1.3** Navbar NO muestra "Administración" (es solo para ADMIN)

### I2 — Permisos Restringidos
- [ ] **I2.1** Acceder a `/es/dashboard/admin` → redirigido (403/redirección)
- [ ] **I2.2** Acceder a `/api/admin/payments/pending` → 403 Forbidden
- [ ] **I2.3** Intentar verificar un pago vía API admin → 403
- [ ] **I2.4** Intentar revocar certificado vía API admin → 403

---

# ROL 4: ADMIN (Administrador)

> **Login:** admin@edplatform.com / password123

### A1 — Dashboard Admin
- [ ] **A1.1** Login como admin → dashboard normal (o botón "Administración")
- [ ] **A1.2** Acceder a `/es/dashboard/admin` → panel de gestión de pagos
- [ ] **A1.3** Ver contador de "Pagos Pendientes: N"

### A2 — Gestión de Pagos Pendientes
- [ ] **A2.1** Ver lista de pagos pendientes con: usuario, curso, método, monto, moneda, fecha
- [ ] **A2.2** Ver información del estudiante: nombre, email, país
- [ ] **A2.3** Ver comprobante de pago (imagen incrustada o enlace)
- [ ] **A2.4** Ver TX Hash para pagos crypto
- [ ] **A2.5** Ver referencia bancaria para transferencias
- [ ] **A2.6** Botón "Actualizar" refresca la lista

### A3 — Verificar Pago
- [ ] **A3.1** Click en "Verificar Pago" → pago pasa a VERIFIED
- [ ] **A3.2** Pago verificado desaparece de la lista de pendientes
- [ ] **A3.3** Matrícula del estudiante pasa a ACTIVE (acceso al curso)
- [ ] **A3.4** Transacción atómica: verificar pago + activar matrícula juntos

### A4 — Rechazar Pago
- [ ] **A4.1** Escribir motivo en el campo "Motivo..."
- [ ] **A4.2** Click en "Rechazar Pago" → pago pasa a REJECTED
- [ ] **A4.3** Pago rechazado desaparece de la lista de pendientes
- [ ] **A4.4** Sin motivo → se permite rechazar igualmente (motivo vacío)

### A5 — Gestión de Certificados
- [ ] **A5.1** Listar todos los certificados (`/api/admin/certificates`)
- [ ] **A5.2** Ver detalle de cada certificado: badgeId, estudiante, curso, fecha, estado
- [ ] **A5.3** Revocar certificado con motivo → `isRevoked: true`
- [ ] **A5.4** Certificado revocado se refleja en verificación pública
- [ ] **A5.5** Registro de auditoría creado al revocar

### A6 — Instrucciones de Pago (CRUD)
- [ ] **A6.1** Listar instrucciones de pago existentes (3 del seed)
- [ ] **A6.2** Crear nueva instrucción de pago (método, moneda, instrucciones i18n)
- [ ] **A6.3** Editar instrucción existente (cambiar accountInfo, geoRestriction)
- [ ] **A6.4** Desactivar instrucción (`isActive: false`) → no aparece en checkout
- [ ] **A6.5** Reactivar instrucción

### A7 — Auditoría
- [ ] **A7.1** Ver registro de auditoría (AuditLog) con acciones, entidad, usuario, IP, fecha

### A8 — Seguridad Admin
- [ ] **A8.1** API admin endpoints requieren rol ADMIN
- [ ] **A8.2** Estudiante intentando acceder a endpoints admin → 403
- [ ] **A8.3** Instructor intentando acceder a endpoints admin → 403
- [ ] **A8.4** Visitante (sin login) intentando acceder a endpoints admin → 401

---

# Resumen de Conteo

| Rol | Tests |
|:---|---:|
| VISITANTE | 48 |
| ESTUDIANTE | 47 |
| INSTRUCTOR | 7 |
| ADMIN | 22 |
| **TOTAL** | **124** |

---

## Notas de Prueba

- ⏳ Marcar `[x]` al superar cada test
- 🐛 Si un test falla, anotar el bug encontrado junto al ítem
- 🔄 Al corregir un bug, re-ejecutar los tests relacionados
- 📝 Los campos de descripción y títulos son bilingües (JSON `{es, en}`)
- 🌍 La detección de país para filtrado de pagos puede depender de IP/geolocalización o del campo `country` del usuario
- ⚠️ La evaluación solo existe en el seed para "Introducción a la Programación Web" — testear certificados en otros cursos requiere crear evaluación manualmente

---

# 🐛 Registro de Bugs y Correcciones

## Bug #1: robots.txt y sitemap.xml dan 404
- **Severidad**: 🔴 Alta
- **Fecha**: 2026-05-30
- **Descripción**: El middleware interceptaba `/robots.txt` y `/sitemap.xml` y los redirigía a `/es/robots.txt` (404) porque no tenían prefijo de idioma.
- **Archivos afectados**: `src/middleware.ts`
- **Solución**: 
  1. Se añadió exclusión explícita al inicio de la función middleware: `pathname === "/robots.txt" || pathname === "/sitemap.xml"` → `NextResponse.next()`
  2. Se añadieron al matcher regex: `robots\\.txt|sitemap\\.xml`
- **Estado**: ✅ Verificado — `robots.txt` devuelve HTTP 200 con contenido correcto. ⚠️ `sitemap.xml` tiene conflicto de ruta con `[lang]` (se trata como idioma "sitemap" en lugar de XML). Se requiere mover sitemap fuera de App Router o usar enfoque alternativo.

## Bug #2: Búsqueda case-sensitive en catálogo de cursos
- **Severidad**: 🟠 Media
- **Fecha**: 2026-05-30
- **Descripción**: La búsqueda en `/api/courses` usaba `string_contains` de Prisma sobre campos JSON, lo cual es case-sensitive en PostgreSQL. "marketing" no encontraba "Marketing", "programacion" no encontraba "Programación".
- **Archivos afectados**: `src/app/api/courses/route.ts`
- **Solución**: Se reemplazó `string_contains` por `$queryRawUnsafe` con PostgreSQL `ILIKE`, que es case-insensitive. También se añadió búsqueda por slug.
  ```sql
  "title"->>'es' ILIKE $1 OR "title"->>'en' ILIKE $1 OR "slug" ILIKE $1
  ```
- **Estado**: ✅ Verificado — `marketing` lowercase → 1 resultado, `programacion` sin acento → 1 resultado, `DIGITAL` uppercase → 2 resultados.

## Bug #3: JSON-LD de verificación incompleto
- **Severidad**: 🟡 Media-Baja
- **Fecha**: 2026-05-30
- **Descripción**: `/api/verify/[badgeId]` devolvía solo `credentialSubject` (datos del estudiante/logro) sin los campos requeridos por Open Badges 3.0: `@context`, `type`, `issuer`, `proof`.
- **Archivos afectados**: `src/app/api/verify/[badgeId]/route.ts`
- **Solución**: Se reconstruye el credential completo con `@context` (W3C VC v2 + OB 3.0), `type: ["VerifiableCredential", "OpenBadgeCredential"]`, `issuer`, y `proof` a partir de los datos almacenados en BD (`issuerProfile`, `verificationUrl`, `issuedAt`).
- **Estado**: ✅ Verificado — respuesta incluye `@context`, `type`, `issuer`, `proof`, `credentialSubject`.

## Bug #4: FALSO POSITIVO — "Administración" visible al instructor
- **Severidad**: ✅ Descartado
- **Fecha**: 2026-05-30
- **Descripción**: Se observó texto "admin"/"Administración" en el HTML del dashboard del instructor, pero provenía del diccionario i18n embebido en el bundle JS, no de un enlace visible.
- **Verificación**: El componente Navbar (`src/components/layout/Navbar.tsx`, línea 58) correctamente condiciona `session?.role === "ADMIN"` para mostrar el enlace.
- **Estado**: ✅ No es un bug — RBAC frontend correcto
