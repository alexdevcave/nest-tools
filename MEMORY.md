# MEMORY.md — Nest Tools Workspace

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual

- `apps/nest-tools-app` (generada con `@nx/nest`, build con webpack) sustituye a `apps/api`: expone `GET /` (hello) y la demo del filtro en `/errors`; desde el 2026-11-15 no usa prefijo global (decisión del usuario). Se fueron `health`, `todos`, el `Dockerfile` y tsdown.
- `libs/nest-tools` (`@brickstodev/nest-tools`): API pública `AllExceptionsFilter` y el tipo `AllExceptionsFilterOptions`; `index.spec.ts` con un `describe` por spec (FR-5 con la lista `PUBLIC_API_EXPORTS`, NFR-1 con Nest precargado); solo `tslib` como dependencia; metadatos públicos, `exports`, `files`, LICENSE MIT y README en inglés (soporte NestJS 11 y 12) con traducciones `README.<es|fr|it|de>.md` (2026-11-15, principio 6: se actualizan en el mismo cambio; el build las copia y npm las empaqueta). **Publicada en npm la 0.1.0** (2026-11-18) con `latest`, sin `private` y con `CHANGELOG.md` (commit `4c05f70`, tag anotado `nest-tools@0.1.0` en `origin`).
- `tools/release` (`release-tools`, spec 002): la herramienta de release. Flujo: `pnpm run release:dry-run` → `pnpm run release` (commit `chore(release)` y tag en local) → `git push --atomic origin main nest-tools@x.y.z` → `pnpm run release:publish`, siempre desde un terminal interactivo (con `!` npm da `EOTP`). La release y la publicación las lanza el mantenedor.
- `packages/types` ya no lo importa ningún proyecto.
- Workspace en pnpm 12 (`packageManager: pnpm@12.18.0`), comandos `pnpm nx` en `CLAUDE.md` y `README.md`.
- `CLAUDE.md` en español con la plantilla del proyecto; el bloque de Nx va al final, entre sus marcadores.
- `docs/constitution.md`: 7 principios, enmendada el 2026-11-14 (librería pública en npm; principio 5: respuestas frente a logs) y el 2026-11-15 (principio 7: efectos propios al importar y peers aunque sean solo tipos; principio 4: demostración en la app; principio 6: traducciones del README; principio 7: `perf` sube el patch en 0.x). Principio 2: los FR de configuración o de proceso se verifican con un comando documentado en el plan.
- Spec `001-publishable-package` `implemented` de nuevo (2026-11-17) tras el `/sdd-change` por la 002 (`private` solo hasta la primera release; CHANGELOG en el paquete con `"CHANGELOG.md"` en `files`): T1-T12 hechas; V1-V3 en verde sobre build limpio (V3a 27 archivos, V3b 28 con un CHANGELOG temporal).

## Decisiones (y por qué)

- pnpm en lugar de npm: es el gestor del resto de proyectos; se borró `package-lock.json`.
- Solo configuración para Claude: se borraron `AGENTS.md`, `opencode.json` y las carpetas `.codex`, `.gemini`, `.cursor`, `.opencode`, `.github`. Se conserva `.agents/skills/`.
- webpack (`@nx/webpack`, `webpack`, `webpack-cli`, `webpack-dev-server`) entra porque lo añadió el generador de la app y la lib; aprobado por el usuario. Se quitaron `tsdown` y `unrun`, que solo usaba `apps/api`.
- Scope `@brickstodev` solo para la lib (cambiado el 2026-11-15, antes de la primera publicación, porque el repositorio pasó a `brickstodev`); la raíz y la app siguen con `@nestjs-template`. El 2026-11-17 el usuario pasó también el autor y el copyright (LICENSE, README y traducciones, specs) a «brickstodev».
- Tooling SDD (skill, agentes y comandos) sin restos de Angular; los tests se lanzan con `pnpm nx run-many -t test -p nest-tools,nest-tools-app`. Desde el 2026-11-15 se trabaja con los agentes `planner`, `implementer` y `reviewer` (petición del usuario).
- Estilo del código (2026-11-15, petición del usuario; detalle en `CLAUDE.md`): funciones con nombre como `function`, constantes antes que variables y lógica (salvo las que dependen de una comprobación), todo tipado (también variables y callbacks) y modificadores de acceso en los miembros de clase. En la lib, ESLint exige `func-style`, `explicit-function-return-type` y `explicit-member-accessibility`; los tipos de variables y callbacks se revisan en el diff (`typedef` está obsoleta).
- Herramientas candidatas para la lib: `AllExceptionsFilter`, `@Pagination()`, `RequestIdInterceptor`, `TimeoutInterceptor`, `LoggingInterceptor`. Se descartan `HealthModule`, `EnvService` y un pipe de validación propio porque ya los cubren `@nestjs/terminus`, `@nestjs/config` y `class-validator`/`zod`.
- Spec 001: sus decisiones están en su spec y su plan (CommonJS, Node 20+, MIT a nombre de «brickstodev» sin email, sin source maps, `private` hasta la 002, sin peers hasta importar Nest, solo `tslib`, soporte NestJS 11 y 12).
- Spec 002 (clarificación del 2026-11-16 con el usuario): se publica solo desde el commit del tag, que debe ser la versión más alta y estar en `main` del remoto (así `latest` nunca retrocede; una release superada sin publicar no llega a npm); si la release falla tras las comprobaciones, deshace lo suyo; se aceptan sin cambios el `revert` de un commit sin publicar, los commits mal tipados ya subidos y los cambios fuera de la lib (llegan con la siguiente versión).

## Aprendizajes y errores a evitar

- `nx configure-ai-agents` (o actualizar Nx) vuelve a meter su bloque en inglés en `CLAUDE.md` y puede recrear `AGENTS.md`: no ejecutarlo aunque Nx lo sugiera. El 2026-11-17 el bloque volvió al inglés sin que nadie lo pidiera (probablemente Nx Console): revisar el diff de `CLAUDE.md` antes de cada commit.
- `pnpm-workspace.yaml` no declara `packages:`; las libs solo se resuelven por los alias de `tsconfig.base.json`.
- En 0.x, Nx baja major→minor y minor→patch por defecto (`adjustSemverBumpsForZeroMajorVersion`).
- `@nx/dependency-checks` está en `error` en la lib, marca como obsoletas las peers que no se importan y solo mira los archivos de `production` (no los specs).
- `tslib` se da por usado porque el build de la lib es `@nx/js:tsc` con `importHelpers: true`.
- `tsconfig.base.json` tiene `sourceMap: true`: la lib lo desactiva en `tsconfig.lib.json`, y `files` es la segunda barrera.
- `@nx/js:tsc` con `generateExportsField: false` (por defecto) respeta un `exports` escrito a mano en el manifiesto.
- TypeScript 6.0 marca `moduleResolution: node10` como obsoleto: hace falta `--ignoreDeprecations 6.0`. En zsh las opciones de `tsc` guardadas en una variable no se parten en palabras.
- V4/V5 se ejecutan en un proyecto temporal del scratchpad con `npm pack` + `npm install` del `.tgz` (necesita red).
- npm 12 con `files` empaqueta siempre `package.json`, `LICENSE` y todos los `README*`, pero no `CHANGELOG.md` si `files` no lo lista; listado y ausente, `npm pack` no da error.
- En tablas Markdown, los `|` dentro de código se escriben `\|`; si no, Prettier los toma como columnas y rompe el comando.
- Desde ESM, Node muestra en el namespace de un paquete CommonJS `__esModule`, `default` y `module.exports`: es interoperabilidad de Node, no API pública.
- Importar `@nestjs/common` lee `process.env.NO_COLOR`; el grep de imports del principio 7 encuentra `@nestjs/*` en `index.spec.ts` (test NFR-1): al aplicarlo, excluir los specs.
- NestJS 12 es `latest` en npm (12.5.0 a 2026-11-14) y la 11 está en `legacy`; la 12 es solo ESM y exige Node 20.19+ o 22.12+.
- Nest 11: el 404 de ruta inexistente lleva la query string en el mensaje (`Cannot GET /x?…`); el JSON inválido de Express pasa a 400 con el mensaje del parser, que incluye un trozo del body; los errores de Fastify con `statusCode` pasan a `HttpException`, pero los `http-errors` de Express no. Un `Logger` con contexto trata siempre el segundo texto como stack.
- El agente `reviewer` solo puede ejecutar los tests y `git`: el build, el lint, `npm pack`/V4/V5 y el e2e de una validación los ejecuta la sesión principal.
- Jest 30: `--testFile` no filtra (ejecuta todas las suites); el filtro es `--testPathPatterns=<patrón>`, y `--testPathPattern` en singular da error.
- Nunca ejecutar `pnpm` ni `pnpm exec` dentro de `libs/*`: como no son paquetes del workspace, pnpm instala allí un `node_modules` propio (con NestJS 12 en ESM) y un `pnpm-lock.yaml`. Los comandos, siempre desde la raíz con `pnpm nx`.
- Fastify rechaza un body demasiado grande por su `Content-Length` y cierra la conexión sin leerlo: un cliente que siga enviando puede recibir `ECONNRESET`. El test del 413 usa `node:http` y a Fastify solo le envía las cabeceras.
- Con Express, el parser del body es un middleware global: un JSON roto o un body demasiado grande dan 400/413 antes de buscar la ruta (aunque no exista).
- Para la prueba a mano: arrancar `pnpm nx run nest-tools-app:serve` en segundo plano con `NO_COLOR=1` y el log a un archivo, esperar con `curl --retry-connrefused` (el `sleep` en primer plano está bloqueado) y, al terminar, parar todo el árbol de procesos de `serve` y comprobar el puerto 3000.
- Si el e2e falla en `globalSetup` con «Waiting for nest-tools-app:serve in another nx process», hay un `nx run nest-tools-app:serve` colgado: pararlo (con permiso) y repetir.

## Próximos pasos

- Spec `003-all-exceptions-filter` `implemented` (2026-11-15): `AllExceptionsFilter` con T1-T10, validada por el `reviewer` y con sus mejoras finales aplicadas (README sobre API pública, microservicios y causas; el log se construye después de responder); lib 128 tests, app 2 y e2e 2, V1-V7 en verde (V5 con NestJS 12.5.0). Porqués que no recoge la spec:
  - Soporte NestJS 11 y 12: la 10 no recibe cambios desde enero de 2026, y ampliar el rango después es compatible (quitar una versión, no).
  - 4xx sin mensaje en el log: Nest mete la query y trozos del body en sus mensajes. 5xx con mensaje y stack, nunca el objeto entero (Nest lo vuelca con `inspect`).
  - Errores HTTP externos solo con la marca `expose` de `http-errors`: respetar cualquier `statusCode` filtraría errores de SDK de terceros. Una excepción fuera de 4xx/5xx da 500 porque Fastify rechaza códigos que Express acepta.
  - Fuera de HTTP devuelve el error sin cambios (lo que Nest documenta para GraphQL). Riesgo para una futura spec de RPC: ahí un filtro debe devolver un Observable.
- Demo de la 003 (principio 4): 13 rutas bajo `/errors` (`ErrorsController` delega en `ErrorsService` los errores de negocio), e2e 17/17 y prueba a mano (V8), también con `LOG_CLIENT_ERRORS=false`.
- Push a `main` hasta `4c05f70` (2026-11-18, la release 0.1.0). Sin commit: las marcas de T10-T12, `Status: implemented` de la 002, el resultado de K3 en su plan, el aviso del terminal interactivo en `CLAUDE.md` y esta memoria.
- Spec `002-release-process` `implemented` (2026-11-18): T1-T12 hechas, validada por el `reviewer` (APPROVED; tests: lib 128, app 11, release-tools 28; V1-V12 y K1-K6 correctos). Porqués: herramienta propia en TypeScript, sin dependencias, porque `nx release` cuenta commits por grafo de afectados (un `fix:` en `tsconfig.base.json` o el lock subiría la lib), `perf` no sube, su changelog no cumple FR-7 y su publish solo admite `--otp`; se publica solo desde el commit del tag más alto y ya en `origin/main` (así `latest` nunca retrocede); la release deshace lo suyo si falla tras las comprobaciones. La fecha del CHANGELOG va en UTC: justo después de medianoche en España sale la del día anterior.
- Spec `004` (nombre por decidir): una función para crear errores HTTP de forma uniforme (código, mensaje y datos extra como `code`); que devuelva una excepción HTTP de Nest y el `throw` lo escriba el desarrollador.
- Decidir si se borra `packages/types`.
