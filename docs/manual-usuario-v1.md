# Manual de usuario v1

Plataforma de aprendizaje en línea orientada a cursos tipo MOOC.

Fecha de corte: 2026-07-05

## 1. Acceso al sistema

La plataforma usa rutas por idioma:

- Español: `/es`
- Inglés: `/en`

Pantallas principales:

- Catálogo: `/es/courses`
- Login: `/es/login`
- Panel personal: `/es/dashboard`
- CMS académico: `/es/dashboard/cms`
- Administración: `/es/dashboard/admin`

## 2. Usuarios de prueba

Después de ejecutar el seed, quedan disponibles estos usuarios:

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `admin@edplatform.com` | `password123` |
| Instructor | `profesor@edplatform.com` | `password123` |
| Estudiante | `alumno@edplatform.com` | `password123` |
| Estudiante EN | `student@edplatform.com` | `password123` |

## 3. Roles

### Administrador

Puede:

- acceder al panel de administración;
- revisar pagos;
- crear usuarios;
- cambiar roles;
- consultar certificados;
- revocar certificados;
- consultar auditoría;
- gestionar cursos desde el CMS.

### Instructor

Puede:

- acceder al CMS académico;
- gestionar sus cursos;
- crear ediciones;
- crear módulos;
- crear sesiones;
- agregar videos;
- agregar materiales complementarios;
- crear evaluaciones;
- gestionar banco de preguntas;
- revisar analítica de sus cursos.

### Estudiante

Puede:

- ver catálogo;
- matricularse en cursos disponibles;
- acceder a cursos activos;
- marcar sesiones como completadas;
- realizar evaluaciones;
- recibir feedback inmediato;
- emitir certificado si cumple criterios;
- verificar certificados.

## 4. Catálogo y matrícula

1. Entrar a `/es/courses`.
2. Buscar o seleccionar un curso.
3. Abrir el detalle del curso.
4. Revisar la ficha:
   - objetivos;
   - público objetivo;
   - requisitos;
   - competencias;
   - duración;
   - dedicación semanal;
   - nivel;
   - certificado disponible.
5. Seleccionar edición si el curso tiene ediciones.
6. Matricularse.

Los cursos gratuitos permiten acceso directo después de la matrícula. Los cursos pagos pueden requerir pago y verificación administrativa.

## 5. Experiencia del estudiante

En el detalle del curso, el estudiante ve:

- módulos;
- sesiones;
- videos;
- materiales complementarios;
- actividades de práctica;
- progreso;
- evaluación final;
- certificado, si aplica.

### Completar una sesión

1. Abrir el curso.
2. Revisar la sesión.
3. Ver el video o recurso principal.
4. Consultar materiales complementarios.
5. Pulsar `Completar`.

El progreso se recalcula automáticamente. Solo cuentan sesiones publicadas.

## 6. Videos

Las sesiones pueden usar:

- YouTube;
- Vimeo;
- enlace externo;
- video subido a la plataforma.

Recomendación de uso:

- usar YouTube/Vimeo cuando el contenido esté en una plataforma externa;
- subir video local solo cuando sea necesario.

## 7. Materiales complementarios

Cada sesión puede incluir recursos como:

- PDF;
- lecturas;
- diapositivas;
- datasets;
- enlaces externos;
- objetos de aprendizaje en repositorios;
- archivos subidos.

Los materiales se muestran dentro de la sesión cuando el estudiante tiene acceso.

## 8. Evaluaciones

La evaluación puede incluir:

- selección múltiple;
- verdadero/falso;
- respuesta corta.

La plataforma soporta:

- nota mínima;
- límite de intentos;
- retroalimentación inmediata;
- aleatorización de preguntas;
- aleatorización de opciones;
- corrección automática del lado servidor.

Las respuestas correctas no se envían al navegador antes del envío de respuestas.

## 9. Certificados

Para emitir certificado, el estudiante debe cumplir:

- matrícula activa;
- progreso 100%;
- curso con certificado habilitado;
- evaluación configurada;
- evaluación aprobada;
- no tener certificado previo para esa matrícula.

El certificado incluye:

- `Badge ID`;
- URL de verificación;
- criterio de emisión;
- datos del estudiante;
- datos del curso;
- PDF descargable;
- verificación pública.

La verificación se consulta en:

```text
/es/verify/{badgeId}
```

También existe endpoint JSON-LD:

```text
/api/verify/{badgeId}
```

## 10. Uso del CMS académico

Ruta:

```text
/es/dashboard/cms
```

### Crear un curso

1. Entrar como administrador o instructor.
2. Abrir `CMS Académico`.
3. Pulsar `Nuevo`.
4. Completar:
   - slug;
   - título;
   - descripción;
   - objetivos;
   - público objetivo;
   - requisitos;
   - competencias;
   - duración estimada;
   - dedicación semanal;
   - nivel;
   - idioma;
   - precio;
   - visibilidad.
5. Guardar.

### Publicar un curso

Para publicar, el CMS exige:

- ficha básica completa;
- al menos una edición publicada;
- al menos una sesión publicada con video;
- precio válido si el curso es pago.

Cuando todos los requisitos están completos, pulsar `Publicar curso`.

## 11. Ediciones

Una edición representa una cohorte o versión de un curso.

Desde la pestaña `Ediciones` se puede:

- crear edición;
- definir fecha de inicio;
- definir fecha de fin;
- definir cupo;
- marcar edición por defecto;
- matricular estudiantes manualmente;
- cambiar estado de matrícula.

## 12. Módulos

Los módulos organizan el contenido.

Desde la pestaña `Módulos` se puede:

- crear módulo;
- editar título y descripción;
- definir orden;
- asociar sesiones.

## 13. Sesiones

Desde la pestaña `Sesiones` se puede:

- crear sesiones;
- asociarlas a módulo;
- definir tipo: grabada, en vivo o híbrida;
- definir duración;
- agregar URL de video;
- subir video;
- agregar descripción;
- agregar actividad de práctica;
- agregar materiales complementarios;
- marcar como vista previa gratuita;
- archivar sesiones.

Las sesiones archivadas dejan de mostrarse a estudiantes.

## 14. Banco de preguntas

Ruta dentro del CMS:

```text
CMS Académico > Banco
```

El banco permite reutilizar preguntas por curso.

Cada pregunta puede tener:

- tipo;
- texto bilingüe;
- opciones;
- respuesta correcta;
- retroalimentación;
- puntos;
- etiquetas;
- dificultad;
- tema;
- módulo asociado.

### Guardar preguntas en el banco

1. Crear preguntas en `Evaluación`.
2. Ir a `Banco`.
3. Pulsar `Guardar evaluación como banco`.

### Usar preguntas del banco

1. Ir a `Banco`.
2. Definir filtros opcionales:
   - cantidad;
   - etiqueta;
   - dificultad;
   - módulo;
   - tema.
3. Pulsar `Usar banco en evaluación`.

La plataforma selecciona preguntas que coincidan con los filtros y las carga en la evaluación.

## 15. Evaluación desde el CMS

Desde la pestaña `Evaluación` se puede:

- definir título;
- definir descripción;
- configurar nota mínima;
- configurar intentos permitidos;
- activar/desactivar feedback inmediato;
- activar/desactivar aleatorización de preguntas;
- activar/desactivar aleatorización de opciones;
- crear preguntas;
- editar opciones;
- definir respuesta correcta;
- definir retroalimentación.

## 16. Analítica MOOC

Ruta dentro del CMS:

```text
CMS Académico > Analítica
```

Muestra:

- matrículas totales;
- matrículas activas;
- progreso promedio;
- tasa de finalización;
- tasa de aprobación;
- certificados emitidos;
- intentos de evaluación;
- mejor nota promedio;
- desglose por edición.

## 17. Panel de administración

Ruta:

```text
/es/dashboard/admin
```

El administrador puede gestionar:

- pagos;
- instrucciones de pago;
- usuarios;
- certificados;
- auditoría.

### Crear usuario

1. Ir a `Usuarios`.
2. Completar nombre, email, país y rol.
3. Pulsar `Crear usuario`.

### Certificados

El administrador puede:

- listar certificados;
- abrir verificación;
- revocar certificados indicando motivo.

## 18. Estado actual y limitaciones

La versión actual es funcional para operación local y validación de producto.

Pendientes relevantes:

- importación/exportación masiva de banco de preguntas;
- analítica histórica con series temporales;
- almacenamiento externo definitivo en producción;
- CI/CD completo;
- refinamiento visual del CMS;
- permisos más granulares para equipos docentes.

## 19. Validación técnica

Comandos de validación usados durante el cierre:

```bash
npx prisma migrate status
npm run lint
npm run build
npm run test:e2e:local
```

Resultado esperado:

```text
Database schema is up to date
5 passed
```

