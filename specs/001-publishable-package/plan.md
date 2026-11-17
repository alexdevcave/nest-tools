# Plan 001 — Paquete publicable

Spec: `specs/001-publishable-package/spec.md` (approved). Este plan solo toca `libs/nest-tools` y la documentación interna; no cambia la app, el lint del workspace ni las dependencias del workspace (principio 1).

Actualizado el 2026-11-15 por el cambio de la spec (FR-1, FR-5, FR-9 y NFR-1, a raíz de la spec 003); los cambios se aplican en T9-T10. Aprobado el 2026-11-15.

Actualizado el 2026-11-17 por el cambio de la spec (FR-3, FR-7 y FR-8, a raíz de la spec 002): `private` solo hasta la primera release, `CHANGELOG.md` en `files` y V2-V3 al día (V3 con las listas reales de `npm pack`, sin y con registro de cambios); los cambios se aplican en T11-T12.

## Archivos y responsabilidades

| Archivo                                        | Acción     | Responsabilidad                                                                                                                                                                                           | FR          |
| ---------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `libs/nest-tools/src/lib/nest-tools.module.ts` | Borrar     | Módulo vacío generado por Nx; deja de formar parte de la API.                                                                                                                                             | FR-1, FR-5  |
| `libs/nest-tools/src/index.ts`                 | Modificar  | Punto de entrada público vacío (`export {}`) con un comentario JSDoc en inglés que explica que las herramientas llegarán en próximas versiones.                                                           | FR-5        |
| `libs/nest-tools/src/index.spec.ts`            | Crear      | Tests Jest del punto de entrada, en un `describe` por spec: exporta solo la lista explícita (vacía) y no tiene efectos secundarios propios.                                                               | FR-5, NFR-1 |
| `libs/nest-tools/package.json`                 | Modificar  | Manifiesto del paquete: dependencias, metadatos, punto de entrada, `exports` y lista de archivos.                                                                                                         | FR-1 a FR-8 |
| `libs/nest-tools/tsconfig.lib.json`            | Modificar  | `sourceMap: false` y `declarationMap: false` para que el build no genere source maps.                                                                                                                     | FR-8        |
| `libs/nest-tools/project.json`                 | Modificar  | Añadir `libs/nest-tools/LICENSE` a `assets` del build, junto al `libs/nest-tools/*.md` que ya había (README, traducciones y, si existe, `CHANGELOG.md`); quitar `passWithNoTests`, porque ya habrá tests. | FR-7        |
| `libs/nest-tools/LICENSE`                      | Crear      | Texto MIT, `Copyright (c) 2026 brickstodev`.                                                                                                                                                              | FR-7        |
| `libs/nest-tools/README.md`                    | Reescribir | README en inglés que se publica con el paquete.                                                                                                                                                           | FR-9        |
| `CLAUDE.md`                                    | Modificar  | La línea de `libs/nest-tools` deja de citar `NestToolsModule`.                                                                                                                                            | —           |
| `MEMORY.md`                                    | Modificar  | Estado tras cada tarea (skill sdd).                                                                                                                                                                       | —           |

## API pública

`libs/nest-tools/src/index.ts` exporta solo la API pública de las herramientas (FR-5); en esta spec, ninguna: ni clases, ni decoradores, ni opciones, ni tipos. Se mantiene como `export {}` para que el compilador genere `index.js` e `index.d.ts`, que son el punto de entrada del paquete. La primera exportación llega con la spec `003-all-exceptions-filter`. El test FR-5 fija los exports con una lista explícita, que actualiza cada spec que añada una herramienta.

## Configuración y valores por defecto

Campos del manifiesto `libs/nest-tools/package.json` (el build lo copia tal cual a `dist/libs/nest-tools`):

| Campo                     | Valor                                                                                                           | FR         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `name` / `version`        | `@brickstodev/nest-tools` / `0.0.1` (sin cambios; versionar es de la 002)                                       | FR-3       |
| `private`                 | `true` hasta la primera release, que lo quita la spec 002 (su FR-8)                                             | FR-3       |
| `publishConfig`           | `{ "access": "public" }`                                                                                        | FR-3       |
| `license` / `author`      | `MIT` / `brickstodev` (sin email)                                                                               | FR-3       |
| `description`             | `Small, opt-in utilities for NestJS applications.`                                                              | FR-3       |
| `keywords`                | `nestjs`, `nest`, `utilities`, `tools`, `typescript`                                                            | FR-3       |
| `engines`                 | `{ "node": ">=20" }`                                                                                            | FR-3       |
| `repository`              | `{ "type": "git", "url": "git+https://github.com/brickstodev/nest-tools.git", "directory": "libs/nest-tools" }` | FR-4       |
| `homepage`                | `https://github.com/brickstodev/nest-tools/tree/main/libs/nest-tools#readme`                                    | FR-4       |
| `type` / `main` / `types` | `commonjs` / `./src/index.js` / `./src/index.d.ts`                                                              | FR-5       |
| `exports`                 | `{ ".": { "types": "./src/index.d.ts", "default": "./src/index.js" }, "./package.json": "./package.json" }`     | FR-5, FR-6 |
| `files`                   | `["src/**/*.js", "src/**/*.d.ts", "CHANGELOG.md"]` (ver la nota bajo la tabla)                                  | FR-7, FR-8 |
| `dependencies`            | `{ "tslib": "^2.3.0" }`; se quita `@nestjs/common`                                                              | FR-1, FR-2 |
| `peerDependencies`        | No se declara mientras la lib no importe NestJS ni `rxjs` (tampoco solo para tipos); la 003 añade los suyos     | FR-1       |

**`files`:** es una lista blanca. npm añade siempre `package.json`, `LICENSE` y todos los `README*` (también `README.<es|fr|it|de>.md`), pero no `CHANGELOG.md`, aunque esté junto al manifiesto: por eso se lista, para que el registro de cambios que crea la primera release entre en el paquete (FR-7). Antes de esa release no existe, y `npm pack` genera el paquete sin él, sin error ni aviso (comprobado con npm 12.2.0).

## Integración con Nest

Ninguna en esta spec: no hay módulo, providers, filtros ni registro global o por ruta. La librería no importa NestJS ni `rxjs` (FR-1).

## Compatibilidad

- **`peerDependencies`:** ninguna mientras la lib no importe NestJS ni `rxjs`, aunque sea solo para tipos (FR-1, principio 7); la spec de cada herramienta añade los suyos. La política de soporte «NestJS 11 y 12, Node.js 20+ (con NestJS 12, 20.19+ o 22.12+)» solo se declara en el README (FR-9) y en `engines` (FR-3), que sigue en `>=20`: la versión de Node para NestJS 12 es un requisito de NestJS, no de la librería.
- **Express y Fastify:** la lib no los importa (NFR-2).
- **Semver:** quitar `NestToolsModule` sería incompatible, pero el paquete nunca se ha publicado (privado, 0.0.1), así que no afecta a nadie. El commit no lleva `!`: la 002 fija la 0.1.0 a mano con «Initial release».
- **Consumidores:** CommonJS cargable con `require` y con `import` desde ESM en Node.js; tipos encontrables con `node10` (campo `types`), y con `node16`/`nodenext` y `bundler` (condición `types` de `exports`) (FR-5, FR-6).

## Documentación pública

- **README (inglés, FR-9):** qué es (utilidades pequeñas y opcionales para NestJS, todavía sin herramientas publicadas), instalación (`npm install @brickstodev/nest-tools` y `pnpm add @brickstodev/nest-tools`), política de soporte (NestJS 11 y 12, Node.js 20+, con una nota de que NestJS 12 exige Node.js 20.19+ o 22.12+), licencia (MIT, enlace a `LICENSE`).
- **JSDoc (inglés):** un comentario en `src/index.ts` que describe el punto de entrada público.

## Decisiones

| Decisión                                                            | Alternativa descartada y por qué                                                                                                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exports` escrito a mano en el manifiesto.                          | `generateExportsField: true` en el build: añade comportamiento implícito de Nx. Con el valor por defecto (`false`) Nx solo rellena lo que falta, así que respeta el campo escrito a mano (`update-package-json.js`). |
| Condiciones `types` + `default` en `exports`.                       | `require` + `import` separados: el paquete es solo CommonJS y Node carga el mismo archivo con `require` e `import`.                                                                                                  |
| Lista blanca `files`.                                               | `.npmignore`: con una lista negra, cualquier archivo nuevo se publicaría por defecto.                                                                                                                                |
| `CHANGELOG.md` listado en `files`.                                  | Confiar en que npm lo incluya solo: con npm 12.2.0 no lo hace, aunque esté junto al manifiesto.                                                                                                                      |
| Desactivar los source maps en `tsconfig.lib.json`.                  | Solo filtrarlos con `files`: dejaría `.map` en `dist` que alguien podría acabar publicando; `files` queda como segunda barrera.                                                                                      |
| LICENSE propio en la carpeta de la lib, copiado con `assets`.       | Usar la licencia de la raíz: el paquete se publica desde `dist/libs/nest-tools` y no la incluiría.                                                                                                                   |
| Verificar la configuración con comandos documentados (principio 2). | Un script o un test Jest que empaquete e instale: es más código que mantener; se reconsidera en la 002, que también lo necesitará.                                                                                   |
| Un `describe` por spec en `index.spec.ts`.                          | Prefijar el número de spec en cada nombre (`it('001 FR-5 …')`): nombres más largos y que se apartan de la forma `it('FR-n …')` del principio 2.                                                                      |

## Estrategia de tests

**Jest (`libs/nest-tools/src/index.spec.ts`, sin levantar Nest, principio 3):** la 001 y la 003 reutilizan los mismos números de requisito, así que el archivo agrupa los tests en un `describe` por spec: `describe('spec 001 publishable package', …)` y, cuando la 003 añada el suyo, `describe('spec 003 all exceptions filter', …)`. Los nombres siguen la forma `it('FR-n …')` del principio 2.

- `it('FR-5 public entry point exports only the listed public API')`: las claves exportadas por el módulo importado son exactamente las de una lista explícita (`[]` en la 001; la actualiza cada spec que añada exports).
- `it('NFR-1 importing has no side effects of its own')`: tras una primera carga que calienta la caché de transformación, dentro del mismo `jest.isolateModulesAsync` carga `@nestjs/common` y `@nestjs/core` (sus efectos al cargarse no cuentan), después espía `setTimeout`, `setInterval`, `setImmediate`, `console.*`, `process.stdout.write`/`process.stderr.write` y las lecturas de `process.env` (sustituido por un `Proxy`) y por último importa `./index`; comprueba que no hay ninguna llamada ni lectura. Registrar providers o filtros globales no se puede espiar: lo cubre que el punto de entrada no tenga módulo ni llamadas a Nest al cargarse, comprobado en la revisión del diff.

**Comandos de verificación (FR de configuración, principio 2):** se ejecutan desde la raíz del workspace en `/sdd-validate`. Nunca se ejecuta `npm publish`.

| Id  | Comando                                                                                                                                                                                                                                                                                                                                                                                                      | Comprueba                                                                                                                      | FR                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| V1  | `pnpm nx run-many -t lint test build -p nest-tools,nest-tools-app`                                                                                                                                                                                                                                                                                                                                           | Lint (incluida `@nx/dependency-checks`), tests y build en verde.                                                               | FR-1, FR-2, NFR-1 |
| V2  | `node -p "require('./dist/libs/nest-tools/package.json')"`                                                                                                                                                                                                                                                                                                                                                   | Campos según la tabla de configuración; `private` es `true` antes de la primera release, y falta o es `false` después.         | FR-1 a FR-5       |
| V3  | V3a: `cd dist/libs/nest-tools && npm pack --dry-run`. V3b, solo antes de la 0.1.0: `cp -R dist/libs/nest-tools <tmp>/`, crear `<tmp>/nest-tools/CHANGELOG.md` con cualquier texto y `cd <tmp>/nest-tools && npm pack --dry-run`, siendo `<tmp>` un directorio nuevo y vacío, por ejemplo el de `mktemp -d` (nunca `dist/` ni el repositorio).                                                                | Listas exactas: V3a, sin registro de cambios (desde la 0.1.0, con él); V3b, con él. Sin `.map`, specs, `.ts` ni configuración. | FR-7, FR-8        |
| V4  | `npm pack` del paquete a un directorio temporal, `npm install` del `.tgz` en un proyecto vacío y, allí: `node -e "require('@brickstodev/nest-tools')"`, `node --input-type=module -e "import '@brickstodev/nest-tools'"`, `node -e "require('@brickstodev/nest-tools/package.json')"` (funcionan) y `node -e "require('@brickstodev/nest-tools/src/index.js')"` (falla con `ERR_PACKAGE_PATH_NOT_EXPORTED`). | Carga en Node y bloqueo de rutas internas.                                                                                     | FR-5, FR-6        |
| V5  | En ese proyecto temporal, un `consumer.ts` con `import * as tools from '@brickstodev/nest-tools'` y el `tsc` del workspace con `--noEmit` en tres modos: `--module commonjs --moduleResolution node10 --ignoreDeprecations 6.0`, `--module node16 --moduleResolution node16` y `--module esnext --moduleResolution bundler`.                                                                                 | Los tipos se encuentran en las tres resoluciones.                                                                              | FR-5              |
| V6  | `grep -rnE "(from \|import \|require\()['\"](express\|fastify)(/[^'\"]*)?['\"]" libs/nest-tools/src`                                                                                                                                                                                                                                                                                                         | Sin coincidencias: no importa Express ni Fastify.                                                                              | NFR-2             |
| V7  | Leer `libs/nest-tools/README.md` y `libs/nest-tools/LICENSE`.                                                                                                                                                                                                                                                                                                                                                | Contenido en inglés y MIT 2026 a nombre de «brickstodev».                                                                      | FR-7, FR-9        |

**Listas de V3** (comprobadas con npm 12.2.0 sobre el build actual; las amplía cada spec que añada archivos compilados a `src/`):

- **Sin registro de cambios (27 archivos):** `LICENSE`, `README.md`, `README.de.md`, `README.es.md`, `README.fr.md`, `README.it.md`, `package.json`, `src/index.js`, `src/index.d.ts` y, en `src/lib/all-exceptions-filter/`, el `.js` y el `.d.ts` (18) de `all-exceptions.filter`, `all-exceptions-filter.options`, `exception-body`, `exception-log`, `value-type`, `interfaces/all-exceptions-filter-options.interface`, `interfaces/classified-exception.interface`, `interfaces/exception-log-entry.interface` e `interfaces/exception-response-body.interface`.
- **Con registro de cambios (28 archivos):** la anterior más `CHANGELOG.md`.

`V4` y `V5` instalan desde el `.tgz` local; si `tslib` no está en la caché, `npm install` necesita red. Con TypeScript 6.0, `node10` está obsoleto y requiere `--ignoreDeprecations 6.0`.

**e2e en `nest-tools-app`:** nada que validar en esta spec: la API pública está vacía y la app empieza a usar la librería con la 003. `nest-tools-app` se incluye en V1 solo para comprobar que quitar `NestToolsModule` no rompe nada.

## Cobertura de la spec

| Requisito | Dónde                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| FR-1      | Manifiesto (`dependencies` y `peerDependencies`), V1, V2                                                                        |
| FR-2      | Manifiesto (`dependencies`), V1, V2                                                                                             |
| FR-3      | Manifiesto (`private` hasta la primera release, `publishConfig`, `license`, `author`, `description`, `keywords`, `engines`), V2 |
| FR-4      | Manifiesto (`repository`, `homepage`), V2                                                                                       |
| FR-5      | `index.ts`, `exports`/`types`, test FR-5, V4, V5                                                                                |
| FR-6      | `exports`, V4                                                                                                                   |
| FR-7      | `files` (con `CHANGELOG.md`), `LICENSE`, `assets` (`*.md` y `LICENSE`), V3a, V3b, V7                                            |
| FR-8      | `files`, `tsconfig.lib.json`, V3a, V3b                                                                                          |
| FR-9      | README, V7                                                                                                                      |
| NFR-1     | Test NFR-1 (con Nest precargado) y revisión del diff                                                                            |
| NFR-2     | V6                                                                                                                              |
