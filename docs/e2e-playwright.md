# Pruebas E2E con Playwright

## Requisitos

- PostgreSQL disponible en `localhost:5432`.
- `DATABASE_URL` configurada o compatible con:

```bash
postgresql://postgres:postgres@localhost:5432/edplatform?schema=public
```

- Base sincronizada y sembrada:

```bash
npm run db:setup
```

## Ejecutar

En Windows, la forma más estable es levantar el servidor en una terminal:

```bash
npm run dev
```

Y ejecutar las pruebas en otra:

```bash
npm run test:e2e
```

También hay un comando local que arranca `next start`, espera readiness, ejecuta Playwright y cierra solo ese servidor:

```bash
npm run build
npm run test:e2e:local
```

Por defecto este comando usa `http://127.0.0.1:3100` para no interferir con el servidor de desarrollo visible en `3000`.

Si quieres que Playwright intente levantar el servidor automáticamente:

```powershell
$env:PLAYWRIGHT_START_SERVER="1"; npm run test:e2e
```

Para abrir el reporte:

```bash
npm run test:e2e:report
```

## Alcance inicial

La suite `tests/e2e/r1-critical.spec.ts` cubre:

- login admin;
- acceso al CMS académico;
- creación de curso, módulo, sesión y evaluación mediante APIs CMS;
- login estudiante;
- entrada al curso gratuito del seed;
- marcado de sesiones;
- evaluación automática;
- emisión de certificado;
- verificación pública del badge.

## Notas

- Las pruebas dependen de las credenciales del seed.
- La ejecución usa Chrome instalado en el sistema mediante el canal `chrome`.
- Los artefactos locales quedan ignorados por Git en `test-results/` y `playwright-report/`.
