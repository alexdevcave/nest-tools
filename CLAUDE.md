# CLAUDE.md — Nest Tools Workspace

API REST de ejemplo con NestJS dentro de un monorepo Nx, pensada como base para construir servicios con tipos compartidos, límites entre módulos y despliegue en Docker.

## Stack y estructura

- Nx 24, pnpm 12, NestJS 11, TypeScript 6.0, Jest 30, ESLint 9 (flat config), Prettier 3.
- `apps/api`: la app NestJS. La compila **tsdown** (rolldown + oxc) mediante `nx:run-commands`, no webpack ni `@nx/js:tsc`. La salida es `dist/apps/api/main.cjs` (CommonJS, node22). Todas las rutas cuelgan del prefijo global `/api`, en el puerto `PORT` (por defecto 3000).
- `apps/api/tsdown.config.mts`: la configuración del build. Lee `apps/api/tsconfig.app.json` para respetar `experimentalDecorators` y `emitDecoratorMetadata`.
- `packages/types` (`@nestjs-template/types`): DTOs e interfaces compartidos entre proyectos, compilados con `@nx/js:tsc`.
- `apps/api-e2e`: tests e2e con Jest + axios contra un servidor en marcha. El target `e2e` depende de `api:build` y `api:serve`, y `global-setup` espera a que el puerto esté abierto.
- `apps/api/Dockerfile`: build multi-etapa que usa `nx run api:prune` (build + lockfile podado + módulos del workspace).
- `.agents/skills/`: skills de Nx para otros agentes. Claude recibe las mismas skills por el plugin `nx@nx-claude-plugins` (`.claude/settings.json`).

## Comandos

```bash
pnpm nx run api:serve                                    # dev: tsdown --watch + node --watch
pnpm nx run api:build
pnpm nx run api:test                                     # Jest (vía plugin @nx/jest)
pnpm nx run api:test --testFile=app.service.spec.ts      # un solo spec
pnpm nx run api-e2e:e2e                                  # levanta la API y lanza los e2e
pnpm nx run-many -t lint test build
pnpm nx affected -t build,test,lint
pnpm nx g @nx/nest:resource --project=api --name=users   # scaffold CRUD
docker build -f apps/api/Dockerfile -t nestjs-api .
```

## Convenciones

- Prettier: comillas simples, `printWidth: 200`; indentación de 2 espacios (`.editorconfig`).
- Los tipos compartidos son `interface` en `packages/types/src/lib/types.ts` y se importan con `import type` desde `@nestjs-template/types`.
- Patrón de referencia para un recurso: `apps/api/src/app/todos.controller.ts` + `todos.service.ts` (servicio `@Injectable()` inyectado por constructor, `ParseIntPipe` en los `:id`, `NotFoundException` cuando no existe, `@HttpCode(204)` en `DELETE`). Registra controladores y servicios en `app.module.ts`.
- Tests unitarios junto al archivo (`*.spec.ts`) con `Test.createTestingModule` de `@nestjs/testing`.
- El código y sus comentarios están en inglés; las respuestas al usuario, en español.

## Reglas de dominio / trampas conocidas

- `main.ts` debe importar `reflect-metadata` lo primero, y `tsconfig.app.json` debe mantener `experimentalDecorators` + `emitDecoratorMetadata`. Si falta cualquiera, la DI y el enrutado de Nest se rompen sin error de compilación.
- `@nestjs-template/types` se resuelve mediante **dos** alias: `paths` en `tsconfig.base.json` y `alias` en `apps/api/tsdown.config.mts`. Una nueva lib compartida necesita ambos.
- `pnpm-workspace.yaml` no declara `packages:`, así que `apps/*` y `packages/*` no son paquetes del workspace de pnpm; las libs solo se resuelven por esos alias.
- Los DTOs son interfaces: no existen en tiempo de ejecución y **no hay validación** del body (no hay `class-validator` ni `ValidationPipe`).
- `TodosService` guarda los datos en un array en memoria: se pierden al reiniciar.
- Límites de módulos (`eslint.config.mjs`): `scope:api` puede depender de `scope:shared`/`scope:api`, y `scope:shared` solo de `scope:shared`. Etiqueta (`tags`) cada proyecto nuevo o el lint fallará.
- `tsconfig.base.json` tiene `strict: false`; `packages/types` usa `strict: true`.
- En el `Dockerfile`, la instalación final usa `pnpm install --prod --fix-lockfile` porque el `pnpm-lock.yaml` que genera `@nx/js:prune-lockfile` deja mal la dependencia local `@nestjs-template/types` (con `--frozen-lockfile` falla).
- `nx configure-ai-agents` puede volver a crear `AGENTS.md` o insertar su bloque en este archivo.

## Forma de trabajar

- Propón el cambio (diff o fragmento con la ruta del archivo) y espera la aprobación antes de aplicarlo. La aprobación vale solo para esa acción.
- Si el cambio toca más de un archivo, la configuración o el formato de datos, explica antes el plan en pocas líneas.
- Cambios pequeños y centrados en lo que se pidió; nada de refactors o mejoras no solicitadas.
- Al terminar, di en una o dos frases qué cambió, qué has verificado y qué no.

## Límites

- ✅ Siempre: leer archivos, buscar en el código, ejecutar `lint`, `test`, `build` y `typecheck` a través de `pnpm nx`; actualizar `MEMORY.md` al terminar cada tarea.
- ⚠ Pregunta antes: editar, crear, mover o borrar archivos; añadir dependencias o ejecutar `pnpm install`; tocar `nx.json`, `tsconfig*`, `package.json`, `pnpm-workspace.yaml`, `Dockerfile` o `eslint.config.mjs`; cambiar los tipos de `packages/types`; ejecutar generadores de Nx o cualquier comando de git.
- 🚫 Nunca: hacer commit, push o `nx release` sin que se pida; editar `pnpm-lock.yaml` a mano; desactivar reglas de ESLint o relajar el `tsconfig` para que algo pase; tocar `dist/`, `.nx/` o `node_modules/`.

## Verificación

- `pnpm nx run-many -t lint test build` en verde.
- Si cambia un endpoint: `pnpm nx run api-e2e:e2e`, o `pnpm nx run api:serve` y `curl localhost:3000/api/<ruta>`.
- Si cambia el build, las dependencias o el `Dockerfile`: `docker build -f apps/api/Dockerfile -t nestjs-api .`, arrancar la imagen y comprobar `GET /api/health`.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `CLAUDE.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Comandos
- Tests: `pnpm nx run api:test`

## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# Pautas generales para trabajar con Nx

- Para navegar o explorar el workspace, invoca primero la skill `nx-workspace`: tiene patrones para consultar proyectos, targets y dependencias.
- Al ejecutar tareas (build, lint, test, e2e, etc.), ejecútalas siempre a través de `nx` (`nx run`, `nx run-many`, `nx affected`) en lugar de usar directamente la herramienta subyacente.
- Antepón a los comandos de nx el gestor de paquetes del workspace (p. ej. `pnpm nx build`, `npm exec nx test`) para no usar una CLI instalada globalmente.
- Tienes acceso al servidor MCP de Nx y a sus herramientas; úsalos para ayudar al usuario.
- Para buenas prácticas de un plugin de Nx, consulta `node_modules/@nx/<plugin>/PLUGIN.md`. No todos los plugins tienen este archivo; si no existe, continúa sin él.
- NUNCA adivines flags de la CLI: si dudas, consulta antes nx_docs o `--help`.

## Scaffolding y generadores

- Para tareas de scaffolding (crear apps, libs, estructura del proyecto, configuración inicial), invoca SIEMPRE PRIMERO la skill `nx-generate`, antes de explorar o llamar a herramientas MCP.

## Cuándo usar nx_docs

- ÚSALO para: opciones de configuración avanzadas, flags desconocidos, guías de migración, configuración de plugins, casos límite.
- NO lo uses para: sintaxis básica de generadores (`nx g @nx/react:app`), comandos estándar, cosas que ya sabes.
- La skill `nx-generate` se encarga internamente de descubrir generadores; no llames a nx_docs solo para consultar su sintaxis.

<!-- nx configuration end-->
