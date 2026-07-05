# Cierre de etapa MOOC

Fecha de corte: 2026-07-04

## Resumen ejecutivo

La plataforma ya no es solo un LMS básico ni un prototipo documental. En esta etapa quedó implementado un núcleo funcional para montar cursos tipo MOOC:

- catálogo público de cursos;
- autenticación y sesiones;
- panel de administración;
- CMS académico;
- cursos con ficha MOOC;
- ediciones de curso;
- módulos;
- sesiones/lecciones;
- videos externos o subidos;
- materiales complementarios externos, de repositorio o subidos;
- progreso por estudiante;
- evaluación automática;
- retroalimentación inmediata;
- límite de intentos;
- certificación verificable;
- pruebas E2E mínimas de flujos críticos.

El estado actual es una base funcional validada localmente, no una plataforma final de producción. Todavía quedan pendientes de producto, UX, seguridad operacional, observabilidad y escalabilidad.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS, lucide-react |
| Backend | API routes de Next.js |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | Sesiones propias con cookies, refresh y logout |
| Archivos | Almacenamiento local vía API `/api/uploads` |
| Pruebas E2E | Playwright |
| Validación local | `npm run lint`, `npm run build`, `npm run test:e2e:local` |

## Alcance implementado

### Cursos MOOC

El curso soporta una ficha MOOC con:

- objetivos de aprendizaje;
- público objetivo;
- requisitos;
- competencias;
- duración estimada;
- dedicación semanal;
- nivel;
- idioma;
- modalidad autodirigida;
- disponibilidad de certificado;
- visibilidad y estado de publicación.

El curso puede estar en estado borrador, publicado o archivado. La publicación exige contenido mínimo: edición publicada, sesión publicada con video y datos comerciales válidos.

### Organización académica

El CMS permite crear y administrar:

- cursos;
- ediciones;
- módulos;
- sesiones;
- evaluaciones.

Las sesiones pueden pertenecer a módulos o quedar sin módulo. Las sesiones archivadas dejan de mostrarse al estudiante y no cuentan para progreso.

### Videos

La estrategia de video es híbrida:

- preferente: URL externa de YouTube, Vimeo u otro proveedor;
- alternativa: subida local de video.

La plataforma renderiza el video según su origen:

- iframe para YouTube/Vimeo;
- `<video>` para archivos subidos;
- enlace externo cuando no se puede embeber.

### Materiales complementarios

Los materiales complementarios siguen el mismo criterio que los videos:

- enlace externo;
- enlace a repositorio de objetos de aprendizaje;
- subida local.

Cada sesión puede tener varios recursos con título, URL, tipo y origen. El estudiante los ve cuando la sesión está disponible.

### Evaluación automática

La evaluación soporta:

- selección múltiple;
- verdadero/falso;
- respuesta corta;
- puntaje por pregunta;
- nota mínima;
- límite de intentos;
- retroalimentación inmediata por pregunta;
- corrección del lado servidor.

Las respuestas correctas y la retroalimentación no se envían al cliente antes de responder. Solo se devuelven después del envío, si la evaluación tiene feedback activado.

### Progreso

El progreso se calcula con base en sesiones publicadas. Las sesiones archivadas o no publicadas no cuentan.

El estudiante puede marcar sesiones como completadas. La evaluación y el certificado exigen progreso 100%.

### Certificación

La emisión de certificado exige:

- matrícula activa;
- progreso 100%;
- curso con certificado habilitado;
- evaluación configurada;
- evaluación aprobada;
- no tener certificado previo para esa matrícula.

El certificado incluye:

- `badgeId` único;
- URL de verificación;
- criterio de emisión;
- datos del estudiante;
- datos del curso;
- perfil del emisor;
- PDF descargable;
- endpoint público de verificación compatible con JSON-LD/Open Badge.

La página de verificación muestra si el certificado es válido o revocado, el estudiante, el curso, la fecha, el badge y el criterio.

## Estado de las preguntas clave

### ¿Cuánto está implementado y probado, y cuánto sigue siendo diseño?

Implementado y probado localmente:

- autenticación;
- catálogo;
- CMS académico;
- administración básica;
- creación de cursos, módulos, sesiones y ediciones;
- videos por URL y subida local;
- materiales por URL, repositorio y subida local;
- progreso;
- evaluación automática;
- feedback;
- límite de intentos;
- emisión y verificación de certificado.

Sigue siendo diseño o pendiente:

- analítica avanzada MOOC;
- cohortes masivas con métricas agregadas;
- banco de preguntas reutilizable;
- aleatorización de preguntas;
- importación masiva de contenidos;
- almacenamiento externo real tipo S3/R2/MinIO;
- moderación/comunidad;
- colas/background jobs;
- observabilidad;
- hardening de producción.

### ¿Qué porcentaje de las APIs funciona realmente de extremo a extremo?

Las APIs críticas de la etapa funcionan de extremo a extremo en local y están cubiertas por E2E:

- login, refresh y logout;
- creación de curso;
- creación de módulo;
- creación de sesión;
- publicación;
- archivo de sesión;
- matrícula manual;
- creación de usuario admin;
- progreso;
- evaluación;
- certificado;
- verificación de certificado.

No todas las APIs tienen pruebas exhaustivas por permutación, pero los flujos principales sí están cubiertos.

### ¿El panel de administración está completo o solo es un esqueleto?

No es solo un esqueleto. Ya permite gestionar:

- pagos;
- métodos/instrucciones de pago;
- usuarios;
- roles;
- certificados;
- auditoría.

Pendiente para producción:

- filtros avanzados;
- paginación completa;
- métricas operativas;
- permisos más granulares;
- mejor manejo de errores y estados vacíos.

### ¿La gestión de contenidos permite crear cursos y lecciones sin tocar la base de datos?

Sí. El CMS permite crear y editar cursos, módulos, ediciones, sesiones, videos, materiales y evaluaciones sin tocar la base de datos.

### ¿Cómo se suben y administran los videos?

Desde el CMS de sesiones:

- se recomienda pegar URL de YouTube/Vimeo;
- se permite URL externa genérica;
- se permite subir archivo local de video.

La subida local pasa por `/api/courses/[id]/videos/upload` y luego se sirve desde `/api/uploads`.

### ¿Cómo se suben y administran los materiales complementarios?

Desde el CMS de sesiones:

- se puede agregar URL externa;
- se puede agregar URL de repositorio de objetos de aprendizaje;
- se puede subir archivo local.

La subida local pasa por `/api/courses/[id]/resources/upload` y luego se sirve desde `/api/uploads`.

### ¿Existe soporte para varios instructores y múltiples ediciones de un curso?

Existe soporte base:

- los cursos tienen instructor propietario;
- el administrador puede gestionar globalmente;
- el instructor solo puede editar sus cursos;
- un curso puede tener múltiples ediciones;
- las matrículas pueden asociarse a una edición.

Pendiente:

- co-instructores;
- equipos docentes;
- permisos por módulo;
- reporting por edición;
- plantillas de edición.

### ¿Hay pruebas automatizadas mínimas para garantizar estabilidad?

Sí. Hay pruebas E2E con Playwright para los flujos críticos. La validación de cierre ejecutada fue:

```bash
npm run db:generate
npm run db:push
npm run lint
npm run build
npm run test:e2e:local
```

Resultado de cierre:

```text
5 passed
```

## Flujo E2E cubierto

La suite crítica valida:

1. Login, refresh y logout.
2. Creación de curso MOOC desde APIs/CMS.
3. Creación de módulo.
4. Creación de sesión con video.
5. Material complementario de repositorio.
6. Evaluación con feedback.
7. Publicación controlada.
8. Ocultamiento de borradores en catálogo público.
9. Archivo de sesión.
10. Creación de usuario desde admin.
11. Matrícula manual en edición.
12. Alumno completa curso gratuito.
13. Alumno aprueba evaluación.
14. Alumno emite certificado.
15. Verificación pública del certificado.

## Pendientes recomendados para la siguiente etapa

Prioridad alta:

- banco de preguntas reutilizable;
- aleatorización de preguntas y opciones;
- reportes de progreso por curso y edición;
- dashboard de analítica MOOC;
- almacenamiento externo de archivos;
- revisión de seguridad de subida de archivos;
- migraciones formales en vez de depender de `db push`.

Prioridad media:

- importación/exportación de cursos;
- duplicar curso o edición;
- co-instructores;
- vista previa completa como estudiante;
- mejora visual del CMS;
- paginación y búsqueda avanzada en admin.

Prioridad producción:

- observabilidad;
- logs estructurados;
- backups;
- rate limits más amplios;
- política de retención de archivos;
- despliegue y variables por entorno;
- CI/CD con ejecución automática de lint, build y E2E.

