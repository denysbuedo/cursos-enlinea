# Checklist QA - Flujo MOOC piloto

Fecha: 2026-07-13  
Objetivo: validar de extremo a extremo que la plataforma permite crear, publicar, cursar, evaluar y certificar un MOOC sin tocar directamente la base de datos.

## Datos del curso piloto

| Campo | Valor |
| --- | --- |
| Título del curso |  |
| Slug |  |
| Instructor responsable |  |
| Modalidad | Autodirigido / Por edición |
| Precio | Gratis / Pago |
| Certificado | Sí / No |
| Cantidad de módulos |  |
| Cantidad de sesiones |  |
| Cantidad de preguntas |  |

## Cuentas de prueba

| Rol | Email | Resultado |
| --- | --- | --- |
| Admin |  |  |
| Instructor |  |  |
| Estudiante |  |  |

## 1. Preparación del curso en CMS

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| CMS-01 | Entrar al CMS como Admin o Instructor. | El panel carga sin error y muestra cursos existentes o estado vacío. |  | Pendiente |
| CMS-02 | Crear un curso nuevo completando ficha básica y ficha MOOC. | El curso se guarda como Borrador, sin exigir sesiones todavía. |  | Pendiente |
| CMS-03 | Verificar que el estado inicial sea Borrador. | No se puede publicar desde la creación inicial si faltan sesiones con video. |  | Pendiente |
| CMS-04 | Crear al menos una edición del curso o revisar la edición inicial. | La edición queda asociada al curso y visible en el CMS. |  | Pendiente |
| CMS-05 | Crear Módulo 1 con título, orden y descripción/objetivo. | El módulo aparece en la lista con su descripción. |  | Pendiente |
| CMS-06 | Crear Módulo 2 con título, orden y descripción/objetivo. | El módulo aparece ordenado correctamente. |  | Pendiente |
| CMS-07 | Crear una sesión grabada dentro del Módulo 1. | La sesión se guarda asociada al módulo correcto. |  | Pendiente |
| CMS-08 | Agregar video por URL externa, por ejemplo YouTube o Vimeo. | La sesión guarda la URL y la plataforma detecta o muestra el proveedor. |  | Pendiente |
| CMS-09 | Agregar una práctica a la sesión. | La práctica queda visible al editar y luego en la vista del curso. |  | Pendiente |
| CMS-10 | Agregar bibliografía/material complementario por URL externa. | El recurso queda asociado a la sesión y no se confunde con el video. |  | Pendiente |
| CMS-11 | Agregar un material complementario subido a la plataforma, si aplica. | El archivo sube sin error y queda disponible en la sesión. |  | Pendiente |
| CMS-12 | Crear el resto de sesiones necesarias del piloto. | Todas las sesiones quedan ordenadas dentro de sus módulos. |  | Pendiente |
| CMS-13 | Intentar publicar el curso antes de cumplir requisitos mínimos. | Si falta video o sesión publicada, el sistema informa qué falta. |  | Pendiente |
| CMS-14 | Publicar sesiones necesarias y publicar el curso. | El curso cambia a Publicado y queda visible en catálogo. |  | Pendiente |

## 2. Banco de preguntas y evaluación

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| EVA-01 | Crear preguntas en el banco con módulo/tema, dificultad y etiquetas. | Las preguntas se guardan y pueden editarse. |  | Pendiente |
| EVA-02 | Crear al menos una pregunta de opción múltiple. | Se puede definir respuesta correcta y retroalimentación. |  | Pendiente |
| EVA-03 | Crear al menos una pregunta verdadero/falso. | La pregunta queda disponible en el banco. |  | Pendiente |
| EVA-04 | Configurar evaluación final con puntuación mínima. | La evaluación se guarda asociada al curso. |  | Pendiente |
| EVA-05 | Configurar selección aleatoria por etiqueta, si aplica. | La evaluación respeta cantidad y filtros definidos. |  | Pendiente |
| EVA-06 | Revisar que la evaluación no sea visible antes de completar sesiones, si esa es la regla. | El estudiante no puede evaluarse antes de cumplir requisitos. |  | Pendiente |

## 3. Catálogo y vista pública del curso

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| PUB-01 | Abrir el catálogo sin sesión iniciada. | El curso publicado aparece si su visibilidad es pública. |  | Pendiente |
| PUB-02 | Abrir la vista del curso. | Se muestra título, descripción, ficha académica y programa del curso. |  | Pendiente |
| PUB-03 | Revisar la jerarquía visual. | Se entiende la estructura Módulo -> Sesión -> Video / Práctica / Bibliografía. |  | Pendiente |
| PUB-04 | Revisar una sesión con video externo. | El video se renderiza dentro de la sesión o se ofrece enlace funcional. |  | Pendiente |
| PUB-05 | Revisar bibliografía/materiales complementarios. | Los materiales aparecen en sección propia, separados del video. |  | Pendiente |
| PUB-06 | Revisar prácticas. | Las prácticas aparecen como actividad de aprendizaje, no como descripción del video. |  | Pendiente |
| PUB-07 | Revisar sesiones bloqueadas para usuario no matriculado. | El contenido no permitido queda bloqueado y las vistas previas funcionan. |  | Pendiente |

## 4. Matrícula del estudiante

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| MAT-01 | Registrar o iniciar sesión como estudiante. | El login/registro funciona y redirige correctamente. |  | Pendiente |
| MAT-02 | Matricularse en el curso gratuito. | La matrícula queda activa inmediatamente. |  | Pendiente |
| MAT-03 | Matricularse en un curso de pago, si aplica. | La matrícula queda pendiente de pago/aprobación. |  | Pendiente |
| MAT-04 | Intentar matricularse dos veces en la misma edición. | El sistema impide duplicado y muestra mensaje claro. |  | Pendiente |
| MAT-05 | Matricularse en otra edición del mismo curso, si aplica. | El sistema permite matrícula si es una edición diferente y las reglas lo permiten. |  | Pendiente |

## 5. Experiencia de aprendizaje

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| APR-01 | Entrar al curso como estudiante matriculado. | Todas las sesiones permitidas se muestran correctamente. |  | Pendiente |
| APR-02 | Reproducir un video externo. | El video carga sin romper la página. |  | Pendiente |
| APR-03 | Abrir un material complementario externo. | El enlace abre en nueva pestaña. |  | Pendiente |
| APR-04 | Descargar o abrir un material subido, si aplica. | El archivo se sirve correctamente desde la plataforma. |  | Pendiente |
| APR-05 | Leer y completar una práctica. | La práctica es clara y queda dentro de la sesión correspondiente. |  | Pendiente |
| APR-06 | Marcar una sesión como completada. | El progreso aumenta y la sesión queda marcada. |  | Pendiente |
| APR-07 | Completar todas las sesiones. | El progreso llega a 100% y se habilita la evaluación, si aplica. |  | Pendiente |

## 6. Evaluación y certificación

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| CERT-01 | Abrir la evaluación final. | La evaluación carga con preguntas válidas. |  | Pendiente |
| CERT-02 | Enviar respuestas incorrectas. | El sistema calcula nota, informa resultado y respeta intentos. |  | Pendiente |
| CERT-03 | Enviar respuestas correctas suficientes. | El estudiante aprueba la evaluación. |  | Pendiente |
| CERT-04 | Emitir certificado. | Se genera certificado con identificador verificable. |  | Pendiente |
| CERT-05 | Descargar certificado PDF. | El PDF descarga o abre correctamente. |  | Pendiente |
| CERT-06 | Abrir URL de verificación. | La página muestra certificado válido y datos coherentes. |  | Pendiente |
| CERT-07 | Intentar emitir certificado sin aprobar. | El sistema lo bloquea con mensaje claro. |  | Pendiente |

## 7. Administración y seguimiento

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| ADM-01 | Entrar al panel de administración. | El panel carga sin errores. |  | Pendiente |
| ADM-02 | Revisar usuarios registrados. | El estudiante aparece con datos básicos. |  | Pendiente |
| ADM-03 | Revisar matrículas del curso/edición. | La matrícula aparece una sola vez por estudiante y edición. |  | Pendiente |
| ADM-04 | Revisar pagos pendientes, si aplica. | El pago aparece en estado correcto y puede aprobarse/rechazarse. |  | Pendiente |
| ADM-05 | Revisar certificados emitidos. | El certificado aparece en administración. |  | Pendiente |
| ADM-06 | Revisar trazabilidad/auditoría, si aplica. | Las acciones relevantes aparecen registradas. |  | Pendiente |

## 8. Pruebas técnicas mínimas

| ID | Paso | Resultado esperado | Resultado real | Estado |
| --- | --- | --- | --- | --- |
| TEC-01 | Ejecutar `npm run lint`. | Termina sin errores. |  | Pendiente |
| TEC-02 | Ejecutar `npm run build`. | Compila correctamente. |  | Pendiente |
| TEC-03 | Ejecutar `npx prisma migrate deploy` sobre BD local limpia o actualizada. | Migraciones aplican sin error. |  | Pendiente |
| TEC-04 | Probar expiración de sesión en CMS. | Las peticiones intentan refresh o muestran error de autorización claro. |  | Pendiente |
| TEC-05 | Probar subida de archivo grande dentro del límite definido. | La plataforma acepta o rechaza con mensaje claro. |  | Pendiente |

## 9. Criterios de cierre del piloto

| Criterio | Estado |
| --- | --- |
| El curso puede crearse sin tocar la base de datos. | Pendiente |
| El curso puede publicarse con módulos, sesiones y videos. | Pendiente |
| Los materiales complementarios se gestionan correctamente. | Pendiente |
| El estudiante puede matricularse una sola vez por edición. | Pendiente |
| El estudiante puede completar sesiones y ver progreso. | Pendiente |
| La evaluación final funciona de extremo a extremo. | Pendiente |
| El certificado se emite y verifica correctamente. | Pendiente |
| Admin/CMS/estudiante tienen flujos comprensibles. | Pendiente |
| No hay errores 500 en el flujo principal. | Pendiente |
| Lint y build pasan. | Pendiente |

## Hallazgos

| ID | Área | Severidad | Descripción | Evidencia | Decisión |
| --- | --- | --- | --- | --- | --- |
| H-001 |  | Alta / Media / Baja |  |  |  |
| H-002 |  | Alta / Media / Baja |  |  |  |
| H-003 |  | Alta / Media / Baja |  |  |  |

## Notas de la prueba


