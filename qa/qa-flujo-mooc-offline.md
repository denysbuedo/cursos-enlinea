# QA del flujo MOOC y sincronización offline

## Fecha de ejecución

19 de septiembre de 2026.

## Alcance

Curso de demostración `Diseño de MOOCs: desde la idea hasta la publicación`, con seis sesiones publicadas, evaluación automática y recursos PDF.

## Casos ejecutados

| Caso | Resultado | Evidencia |
|---|---|---|
| Crear curso desde plantilla / API | Pasa | Cubierto por `tests/e2e/r1-critical.spec.ts` |
| Importar curso en CMS | Pasa | Flujo de importación disponible y validado en el curso de demostración |
| Publicar curso | Pasa | La publicación exige módulo/sesión publicada con video |
| Matricular estudiante | Pasa | Matrícula activa usada para exportación y sincronización |
| Subir PDF/PPT | Pasa | El PDF y el PPTX aparecen en el curso y se incluyen en el ZIP; los enlaces externos se conservan |
| Exportar ZIP | Pasa | ZIP con `index.html`, `manifest.json` y recursos locales |
| Abrir y usar offline | Pasa | Progreso y evaluación se guardan en `localStorage` |
| Sincronizar sesiones | Pasa | Primer envío: 1 sesión y 16,7%; envío repetido: sin duplicados |
| Resolver conflicto de progreso | Pasa | La unión de sesiones conserva avances del servidor y el progreso es monotónico |
| Sincronizar evaluación | Pasa | Resultado 0% almacenado y posteriormente resultado 100% almacenado |
| No aceptar token inválido | Pasa | La API responde `401` |
| CORS para archivo local | Pasa | `OPTIONS /api/offline/sync` responde `204` y permite el origen |

## Regla de conflictos

- Las sesiones completadas se combinan por unión. Nunca se elimina una finalización existente en el servidor.
- El progreso se recalcula en el servidor sobre las sesiones publicadas.
- Las respuestas de evaluación se corrigen en el servidor.
- Se conserva el mejor intento existente; un resultado inferior no reemplaza uno superior.
- El token offline está vinculado a usuario, curso y matrícula, y expira en 30 días.

## Suite E2E

Resultado de `npm run test:e2e:local`: **6 de 6 pruebas pasan**.

La suite cubre autenticación, creación y publicación de cursos, subida y exportación de PPTX, usuarios, matrícula, evaluación, certificado, paquete offline, desconexión del navegador, sincronización al reconectar, conflicto de progreso y token expirado.

## Cierre

No quedan casos funcionales pendientes para este release. La prueba de expiración usa un token ya vencido; la expiración natural a 30 días queda cubierta por la misma validación criptográfica del servidor.
