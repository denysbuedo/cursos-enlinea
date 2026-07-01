# Hoja de Ruta para Finalizar EdPlatform

## Diagnostico Actual

El proyecto tiene una base solida: Next.js 16, Prisma/PostgreSQL, autenticacion, catalogo, matricula, pagos manuales, progreso, evaluaciones y certificados. Sin embargo, aun no esta listo como producto terminado. El estado real es mas cercano a una demo avanzada con varias piezas funcionales, pero con flujos incompletos, UI administrativa parcial y deuda tecnica pendiente.

Estado tecnico observado:

- `npm.cmd run build` pasa correctamente.
- `npm.cmd run lint` falla con 4 errores y 16 warnings.
- La app corre en produccion local.
- Hay documentacion, pero parte esta desactualizada o tiene problemas de encoding.
- Falta una ruta real para `/api/auth/refresh`, aunque el sistema usa refresh tokens.
- El panel de instructor practicamente no existe en interfaz.
- El panel admin existe, pero necesita limpieza, tipado y pruebas completas.
- Hay archivo residual `src/app/[lang]/dashboard/admin/page.tsx.bak`.
- Los certificados, pagos y evaluaciones existen, pero falta cerrar y probar el flujo completo de punta a punta.

## Objetivo

Convertir el proyecto desde una demo funcional a una plataforma lista para uso real, cerrando los flujos principales, estabilizando la base tecnica, completando los paneles de gestion y preparando el despliegue.

## Prioridad 1: Estabilizar la Base

### 1. Corregir lint y deuda tecnica inmediata

Tareas:

- Corregir errores en catalogo, detalle de curso y panel admin.
- Eliminar usos de `any` donde sea posible.
- Eliminar variables sin uso.
- Revisar hooks `useEffect` marcados por ESLint.
- Eliminar archivos residuales como `page.tsx.bak`.
- Confirmar que `npm run build` y `npm run lint` pasen limpios.

Criterio de cierre:

- Build exitoso.
- Lint sin errores.
- No quedan archivos temporales o `.bak` dentro de `src/`.

### 2. Corregir autenticacion y sesiones

Tareas:

- Crear endpoint `/api/auth/refresh`.
- Validar refresh token contra la base de datos.
- Rotar refresh tokens correctamente.
- Implementar logout real revocando refresh token en base de datos.
- Revisar cookies `httpOnly`, `sameSite`, `secure` y expiraciones.
- Reforzar proteccion de rutas sensibles desde backend, no solo desde cliente.

Criterio de cierre:

- Login funciona.
- Access token expira y puede renovarse.
- Logout elimina cookies y revoca refresh token.
- Rutas protegidas devuelven `401` o `403` correctamente.

### 3. Normalizar documentacion

Tareas:

- Corregir problemas de encoding en README y documentos HTML.
- Actualizar README para reflejar el estado real del proyecto.
- Separar documentacion en:
  - Instalacion local.
  - Manual de usuario.
  - Manual tecnico.
  - Protocolo de pruebas.
  - Hoja de ruta.

Criterio de cierre:

- La documentacion no afirma que el proyecto esta completo si aun hay pendientes.
- Las instrucciones de instalacion permiten levantar el proyecto desde cero.

## Prioridad 2: Cerrar Flujo del Estudiante

### 4. Matricula gratuita

Tareas:

- Validar flujo: login, curso gratis, matricularse, curso activo.
- Evitar matriculas duplicadas.
- Mostrar estados claros:
  - No matriculado.
  - Matriculado.
  - Pendiente de pago.
  - Activo.
- Mejorar feedback visual despues de matricularse.

Criterio de cierre:

- Un estudiante nuevo puede matricularse en un curso gratuito sin errores.
- El dashboard muestra el curso inmediatamente.

### 5. Matricula en curso de pago

Tareas:

- Revisar flujo completo de checkout.
- Validar metodos de pago por pais y moneda.
- Definir si el comprobante es obligatorio por metodo de pago.
- Mostrar pantalla final clara: pago registrado y pendiente de revision.
- Evitar doble pago.
- Mostrar cursos pendientes de pago en dashboard.

Criterio de cierre:

- Un estudiante puede seleccionar un curso de pago, crear matricula pendiente, subir comprobante y quedar en estado pendiente.
- El administrador puede aprobar el pago y activar la matricula.

### 6. Progreso y sesiones

Tareas:

- Dar funcionalidad visible a las sesiones.
- Sustituir videos placeholder por contenido real o demo controlado.
- Marcar sesiones completadas con feedback claro.
- Recalcular progreso correctamente.
- Impedir completar sesiones de cursos no matriculados.

Criterio de cierre:

- El progreso pasa de 0% a 100% al completar sesiones.
- Las sesiones bloqueadas no permiten acciones no autorizadas.

## Prioridad 3: Evaluaciones y Certificados

### 7. Evaluaciones

Tareas:

- Crear interfaz para gestionar evaluaciones por curso.
- Validar tipos de preguntas:
  - Opcion multiple.
  - Verdadero/falso.
  - Respuesta corta.
- Manejar intentos y reintentos.
- Mostrar resultado de forma clara.
- Ocultar acciones de evaluacion cuando el curso no tiene evaluacion configurada.

Criterio de cierre:

- Un estudiante con 100% de progreso puede realizar evaluacion.
- El sistema calcula nota y determina aprobado/reprobado.

### 8. Certificados

Tareas:

- Completar flujo: progreso 100%, evaluacion aprobada, emitir certificado.
- Configurar `EDDSA_PRIVATE_KEY` real para produccion.
- Generar Open Badge verificable.
- Generar PDF descargable.
- Mostrar certificado en dashboard.
- Crear pagina publica de verificacion.
- Probar revocacion y estado publico de certificado revocado.

Criterio de cierre:

- El estudiante puede emitir, descargar y verificar su certificado.
- Un certificado revocado aparece como revocado en la verificacion publica.

## Prioridad 4: Paneles de Gestion

### 9. Panel de instructor

Tareas:

- Crear dashboard especifico para instructor.
- Listar cursos propios.
- Crear y editar cursos.
- Crear y editar sesiones.
- Crear evaluaciones.
- Ver estudiantes matriculados.
- Ver progreso basico por estudiante.

Criterio de cierre:

- El instructor puede gestionar sus cursos sin usar API manualmente.
- El instructor no puede acceder a funciones administrativas.

### 10. Panel de administrador

Tareas:

- Limpiar y tipar el componente actual del panel admin.
- Gestionar pagos pendientes:
  - Aprobar.
  - Rechazar.
  - Ver comprobante.
- Gestionar usuarios:
  - Listar.
  - Buscar.
  - Cambiar roles.
- Gestionar certificados:
  - Listar.
  - Revocar.
- Gestionar instrucciones de pago desde UI.
- Agregar vista de auditoria con filtros.

Criterio de cierre:

- El administrador puede operar pagos, usuarios, certificados e instrucciones desde la interfaz.
- Las acciones quedan registradas en auditoria.

## Prioridad 5: Preparacion para Produccion

### 11. Storage

Tareas:

- Decidir proveedor final: Supabase Storage o Cloudflare R2.
- Validar subida y lectura de comprobantes.
- Definir permisos de acceso.
- Evitar exposicion publica indebida de comprobantes.
- Validar tamano y tipo de archivos.

Criterio de cierre:

- Los comprobantes se suben y consultan de forma controlada.
- No se aceptan archivos peligrosos o demasiado grandes.

### 12. Seguridad

Tareas:

- Revisar rate limits.
- Validar permisos por rol en cada endpoint.
- Revisar uso de `prisma.$queryRawUnsafe`.
- Revisar CSRF para acciones sensibles.
- Auditar rutas publicas y privadas.
- Revisar headers de seguridad.

Criterio de cierre:

- Endpoints administrativos devuelven `403` para usuarios no autorizados.
- Las acciones sensibles estan protegidas y auditadas.

### 13. SEO y accesibilidad

Tareas:

- Confirmar funcionamiento de `robots.txt`.
- Confirmar funcionamiento de `sitemap.xml`.
- Revisar metadata Open Graph y Twitter.
- Revisar jerarquia de headings.
- Verificar navegacion por teclado.
- Verificar focus visible.
- Revisar experiencia mobile.

Criterio de cierre:

- La app pasa una revision manual basica de SEO y accesibilidad.

## Prioridad 6: QA y Entrega

### 14. Pruebas manuales completas

Roles a probar:

- Visitante.
- Estudiante.
- Instructor.
- Administrador.

Flujos principales:

- Registro.
- Login.
- Matricula gratuita.
- Matricula de pago.
- Revision de pago.
- Progreso.
- Evaluacion.
- Certificado.
- Verificacion publica.
- Revocacion.
- Logout.

### 15. Pruebas automatizadas minimas

Tareas:

- Agregar pruebas para autenticacion.
- Agregar pruebas para matriculas.
- Agregar pruebas para pagos.
- Agregar pruebas para evaluaciones.
- Agregar pruebas para certificados.
- Agregar pruebas de permisos por rol.

Criterio de cierre:

- Existe una suite minima que protege los flujos criticos antes de desplegar.

### 16. Preparacion de despliegue

Tareas:

- Crear `.env.production` documentado.
- Pasar de `prisma db push` a migraciones formales.
- Separar seed de demo y seed productivo.
- Crear checklist de despliegue.
- Definir estrategia de backup de base de datos.
- Definir dominio, SSL y proveedor de hosting.

Criterio de cierre:

- El proyecto puede desplegarse de forma reproducible.
- Hay instrucciones claras para mantenimiento.

## Cronograma Recomendado

### Semana 1: Estabilizacion tecnica

- Corregir lint.
- Completar refresh token.
- Corregir logout.
- Limpiar archivos residuales.
- Actualizar documentacion base.

### Semana 2: Flujo estudiante

- Cerrar matricula gratuita.
- Cerrar matricula de pago.
- Mejorar dashboard de estudiante.
- Validar progreso y sesiones.

### Semana 3: Evaluaciones y certificados

- Completar evaluaciones.
- Emitir certificados.
- Descargar PDF.
- Verificar certificado publico.
- Probar revocacion.

### Semana 4: Paneles

- Crear panel instructor.
- Mejorar panel admin.
- Gestionar pagos, usuarios, certificados e instrucciones desde UI.

### Semana 5: Produccion y QA

- Configurar storage real.
- Revisar seguridad.
- Revisar accesibilidad y SEO.
- Ejecutar pruebas manuales completas.
- Preparar despliegue.

## Primer Bloque de Trabajo Recomendado

El primer bloque que conviene atacar es:

1. Corregir lint.
2. Crear `/api/auth/refresh`.
3. Corregir logout real.
4. Validar flujo de matricula estudiante.
5. Limpiar README y documentacion.

Este bloque convierte la demo actual en una base confiable para seguir construyendo el resto del producto.

