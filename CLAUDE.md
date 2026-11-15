# CLAUDE.md — Nest Tools Workspace

API REST de ejemplo con NestJS dentro de un monorepo Nx, pensada como base para construir servicios con tipos compartidos, librerías compartidas y límites entre módulos.

## Stack y estructura

- Nx 24, pnpm 12, NestJS 11, TypeScript 6.0, Jest 30, ESLint 9 (flat config), Prettier 3.
- `apps/nest-tools-app`: la app NestJS. La compila **webpack** mediante `@nx/webpack` (`webpack.config.js`, compilador `tsc`); los targets `build` y `serve` los infiere el plugin de `nx.json`. La salida es `dist/apps/nest-tools-app/main.js`. Todas las rutas cuelgan del prefijo global `/api`, en el puerto `PORT` (por defecto 3000). Registra `AllExceptionsFilter` de la lib con `APP_FILTER` en `app.module.ts`.
- `apps/nest-tools-app-e2e`: tests e2e con Jest + axios contra un servidor en marcha. El target `e2e` depende de `nest-tools-app:build` y `nest-tools-app:serve`, y `global-setup` espera a que el puerto esté abierto.
- `libs/nest-tools` (`@alexdevcave/nest-tools`): librería NestJS que se publicará en npm, compilada con `@nx/js:tsc`. Su API pública es solo `src/index.ts`, que exporta `AllExceptionsFilter` y el tipo `AllExceptionsFilterOptions`; el manifiesto (`exports`, `files`, metadatos) y el `README.md`/`LICENSE` que se publican viven en la carpeta de la lib.
- `packages/types` (`@nestjs-template/types`): DTOs e interfaces compartidos, compilados con `@nx/js:tsc`. Ahora mismo no lo importa ningún proyecto.
- `.agents/skills/`: skills de Nx para otros agentes. Claude recibe las mismas skills por el plugin `nx@nx-claude-plugins` (`.claude/settings.json`).

## Comandos

```bash
pnpm nx run nest-tools-app:serve                                    # dev con webpack en modo watch
pnpm nx run nest-tools-app:build
pnpm nx run nest-tools-app:test                                     # Jest (vía plugin @nx/jest)
pnpm nx run nest-tools-app:test --testPathPatterns=app.service     # un solo spec (Jest 30)
pnpm nx run nest-tools-app-e2e:e2e                                  # levanta la app y lanza los e2e
pnpm nx run-many -t lint test build
pnpm nx affected -t build,test,lint
pnpm nx g @nx/nest:resource --project=nest-tools-app --name=users   # scaffold CRUD
```

## Convenciones

- Prettier: comillas simples, `printWidth: 200`; indentación de 2 espacios (`.editorconfig`).
- Los tipos compartidos son `interface` en `packages/types/src/lib/types.ts` y se importan con `import type` desde `@nestjs-template/types`.
- Patrón de referencia: `apps/nest-tools-app/src/app/app.controller.ts` + `app.service.ts` (el controlador delega en un servicio `@Injectable()` inyectado por constructor). Registra controladores y servicios en `app.module.ts`.
- Tests unitarios junto al archivo (`*.spec.ts`) con `Test.createTestingModule` de `@nestjs/testing`.
- El código y sus comentarios están en inglés; las respuestas al usuario, en español.
- Funciones con nombre como `function`, también las internas; las funciones flecha, solo para callbacks en línea.
- Dentro de cada función: primero las constantes, después las variables (`let`) y luego la lógica. Las constantes que dependen de una comprobación (por ejemplo, leer una propiedad de algo que puede ser `undefined`) van justo después de esa comprobación.
- Todo tipado: parámetros y retorno de todas las funciones (también los callbacks), campos de clase, constantes y variables, aunque TypeScript pudiera deducirlo, también con literales (`const path: string = '/api'`); `unknown` en lugar de `any`.
- Interfaces en archivos aparte, una por archivo, en una carpeta `interfaces/` junto al código que las usa (`<nombre>.interface.ts`), como hace NestJS.
- Miembros de clase con modificador explícito (`public`, `protected` o `private`) y `readonly` si no se reasignan; el constructor, sin `public`. Fuera de una clase los modificadores no existen: la visibilidad la da `export`, y la API pública de la lib es solo lo que exporta `libs/nest-tools/src/index.ts`.
- En `libs/nest-tools`, `apps/nest-tools-app` y `apps/nest-tools-app-e2e`, ESLint exige `func-style` (declaración), `@typescript-eslint/explicit-function-return-type` y `@typescript-eslint/explicit-member-accessibility`, y desactiva `@typescript-eslint/no-inferrable-types` para poder anotar también los literales (decisión del usuario); el tipo de las variables se revisa en el diff.

## Reglas de dominio / trampas conocidas

- `tsconfig.base.json` debe mantener `experimentalDecorators` + `emitDecoratorMetadata`: sin ellos, la DI y el enrutado de Nest se rompen sin error de compilación.
- Las libs se importan por los alias de `paths` en `tsconfig.base.json` (`@alexdevcave/nest-tools`, `@nestjs-template/types`). Una lib nueva necesita su alias ahí.
- `pnpm-workspace.yaml` no declara `packages:`, así que `apps/*` y `packages/*` no son paquetes del workspace de pnpm; las libs solo se resuelven por ese alias.
- Los DTOs son interfaces: no existen en tiempo de ejecución y **no hay validación** del body (no hay `class-validator` ni `ValidationPipe`).
- Límites de módulos (`eslint.config.mjs`): `scope:api` puede depender de `scope:shared`/`scope:api`, y `scope:shared` solo de `scope:shared`. `nest-tools-app` es `scope:api`; `nest-tools` y `types` son `scope:shared`. Etiqueta (`tags`) cada proyecto nuevo: los generadores lo dejan vacío.
- `tsconfig.base.json` tiene `strict: false`; `packages/types` usa `strict: true`.
- `nx configure-ai-agents` puede volver a crear `AGENTS.md` o insertar su bloque en este archivo.

## Forma de trabajar

- Propón el cambio (diff o fragmento con la ruta del archivo) y espera la aprobación antes de aplicarlo. La aprobación vale solo para esa acción.
- Si el cambio toca más de un archivo, la configuración o el formato de datos, explica antes el plan en pocas líneas.
- Cambios pequeños y centrados en lo que se pidió; nada de refactors o mejoras no solicitadas.
- Al terminar, di en una o dos frases qué cambió, qué has verificado y qué no.

## Límites

- ✅ Siempre: leer archivos, buscar en el código, ejecutar `lint`, `test`, `build` y `typecheck` a través de `pnpm nx`; actualizar `MEMORY.md` al terminar cada tarea.
- ⚠ Pregunta antes: editar, crear, mover o borrar archivos; añadir dependencias o ejecutar `pnpm install`; tocar `nx.json`, `tsconfig*`, `package.json`, `pnpm-workspace.yaml`, `eslint.config.mjs`; cambiar los tipos de `packages/types`; ejecutar generadores de Nx o cualquier comando de git.
- 🚫 Nunca: hacer commit, push o `nx release` sin que se pida; editar `pnpm-lock.yaml` a mano; desactivar reglas de ESLint o relajar el `tsconfig` para que algo pase; tocar `dist/`, `.nx/` o `node_modules/`.

## Verificación

- `pnpm nx run-many -t lint test build` en verde.
- Si cambia un endpoint: `pnpm nx run nest-tools-app-e2e:e2e`, o `pnpm nx run nest-tools-app:serve` y `curl localhost:3000/api/<ruta>`.

## Memoria

- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `CLAUDE.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Comandos

- Tests: `pnpm nx run-many -t test -p nest-tools,nest-tools-app`

## Reglas

- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Pautas generales para trabajar con Nx

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
