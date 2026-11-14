# Plan 001 — Paquete publicable

Spec: `specs/001-publishable-package/spec.md` (approved). Este plan solo toca `libs/nest-tools` y la documentación interna; no cambia la app, el lint del workspace ni las dependencias del workspace (principio 1).

## Archivos y responsabilidades

| Archivo                                        | Acción     | Responsabilidad                                                                                                                                 | FR          |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `libs/nest-tools/src/lib/nest-tools.module.ts` | Borrar     | Módulo vacío generado por Nx; deja de formar parte de la API.                                                                                   | FR-1, FR-5  |
| `libs/nest-tools/src/index.ts`                 | Modificar  | Punto de entrada público vacío (`export {}`) con un comentario JSDoc en inglés que explica que las herramientas llegarán en próximas versiones. | FR-5        |
| `libs/nest-tools/src/index.spec.ts`            | Crear      | Tests Jest del punto de entrada: no exporta nada y no tiene efectos secundarios.                                                                | FR-5, NFR-1 |
| `libs/nest-tools/package.json`                 | Modificar  | Manifiesto del paquete: dependencias, metadatos, punto de entrada, `exports` y lista de archivos.                                               | FR-1 a FR-8 |
| `libs/nest-tools/tsconfig.lib.json`            | Modificar  | `sourceMap: false` y `declarationMap: false` para que el build no genere source maps.                                                           | FR-8        |
| `libs/nest-tools/project.json`                 | Modificar  | Añadir `libs/nest-tools/LICENSE` a `assets` del build; quitar `passWithNoTests`, porque ya habrá tests.                                         | FR-7        |
| `libs/nest-tools/LICENSE`                      | Crear      | Texto MIT, `Copyright (c) 2026 alexdevcave`.                                                                                                    | FR-7        |
| `libs/nest-tools/README.md`                    | Reescribir | README en inglés que se publica con el paquete.                                                                                                 | FR-9        |
| `CLAUDE.md`                                    | Modificar  | La línea de `libs/nest-tools` deja de citar `NestToolsModule`.                                                                                  | —           |
| `MEMORY.md`                                    | Modificar  | Estado tras cada tarea (skill sdd).                                                                                                             | —           |

## API pública

`libs/nest-tools/src/index.ts` no exporta nada: ni clases, ni decoradores, ni opciones, ni tipos (FR-5). Se mantiene como `export {}` para que el compilador genere `index.js` e `index.d.ts`, que son el punto de entrada del paquete. La primera exportación llega con la spec `003-all-exceptions-filter`.

## Configuración y valores por defecto

Campos del manifiesto `libs/nest-tools/package.json` (el build lo copia tal cual a `dist/libs/nest-tools`):

| Campo                     | Valor                                                                                                           | FR         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `name` / `version`        | `@alexdevcave/nest-tools` / `0.0.1` (sin cambios; versionar es de la 002)                                       | FR-3       |
| `private`                 | `true` (se mantiene hasta la 002)                                                                               | FR-3       |
| `publishConfig`           | `{ "access": "public" }`                                                                                        | FR-3       |
| `license` / `author`      | `MIT` / `alexdevcave` (sin email)                                                                               | FR-3       |
| `description`             | `Small, opt-in utilities for NestJS applications.`                                                              | FR-3       |
| `keywords`                | `nestjs`, `nest`, `utilities`, `tools`, `typescript`                                                            | FR-3       |
| `engines`                 | `{ "node": ">=20" }`                                                                                            | FR-3       |
| `repository`              | `{ "type": "git", "url": "git+https://github.com/alexdevcave/nest-tools.git", "directory": "libs/nest-tools" }` | FR-4       |
| `homepage`                | `https://github.com/alexdevcave/nest-tools/tree/main/libs/nest-tools#readme`                                    | FR-4       |
| `type` / `main` / `types` | `commonjs` / `./src/index.js` / `./src/index.d.ts`                                                              | FR-5       |
| `exports`                 | `{ ".": { "types": "./src/index.d.ts", "default": "./src/index.js" }, "./package.json": "./package.json" }`     | FR-5, FR-6 |
| `files`                   | `["src/**/*.js", "src/**/*.d.ts"]` (npm añade siempre `package.json`, `README.md` y `LICENSE`)                  | FR-7, FR-8 |
| `dependencies`            | `{ "tslib": "^2.3.0" }`; se quita `@nestjs/common`                                                              | FR-1, FR-2 |
| `peerDependencies`        | No se declara                                                                                                   | FR-1       |

## Integración con Nest

Ninguna en esta spec: no hay módulo, providers, filtros ni registro global o por ruta. La librería no importa NestJS ni `rxjs` (FR-1, NFR-1).

## Compatibilidad

- **`peerDependencies`:** ninguna mientras la lib no importe NestJS ni `rxjs` (principio 7 aclarado). La política de soporte «NestJS 10 y 11, Node.js 20+» solo se declara en el README (FR-9) y en `engines` (FR-3).
- **Express y Fastify:** la lib no los importa (NFR-2).
- **Semver:** quitar `NestToolsModule` sería incompatible, pero el paquete nunca se ha publicado (privado, 0.0.1), así que no afecta a nadie. El commit no lleva `!`: la 002 fija la 0.1.0 a mano con «Initial release».
- **Consumidores:** CommonJS cargable con `require` y con `import` desde ESM en Node.js; tipos encontrables con `node10` (campo `types`), y con `node16`/`nodenext` y `bundler` (condición `types` de `exports`) (FR-5, FR-6).

## Documentación pública

- **README (inglés, FR-9):** qué es (utilidades pequeñas y opcionales para NestJS, todavía sin herramientas publicadas), instalación (`npm install @alexdevcave/nest-tools` y `pnpm add @alexdevcave/nest-tools`), política de soporte (NestJS 10 y 11, Node.js 20+), licencia (MIT, enlace a `LICENSE`).
- **JSDoc (inglés):** un comentario en `src/index.ts` que describe el punto de entrada público.

## Decisiones

| Decisión                                                            | Alternativa descartada y por qué                                                                                                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exports` escrito a mano en el manifiesto.                          | `generateExportsField: true` en el build: añade comportamiento implícito de Nx. Con el valor por defecto (`false`) Nx solo rellena lo que falta, así que respeta el campo escrito a mano (`update-package-json.js`). |
| Condiciones `types` + `default` en `exports`.                       | `require` + `import` separados: el paquete es solo CommonJS y Node carga el mismo archivo con `require` e `import`.                                                                                                  |
| Lista blanca `files`.                                               | `.npmignore`: con una lista negra, cualquier archivo nuevo se publicaría por defecto.                                                                                                                                |
| Desactivar los source maps en `tsconfig.lib.json`.                  | Solo filtrarlos con `files`: dejaría `.map` en `dist` que alguien podría acabar publicando; `files` queda como segunda barrera.                                                                                      |
| LICENSE propio en la carpeta de la lib, copiado con `assets`.       | Usar la licencia de la raíz: el paquete se publica desde `dist/libs/nest-tools` y no la incluiría.                                                                                                                   |
| Verificar la configuración con comandos documentados (principio 2). | Un script o un test Jest que empaquete e instale: es más código que mantener; se reconsidera en la 002, que también lo necesitará.                                                                                   |

## Estrategia de tests

**Jest (`libs/nest-tools/src/index.spec.ts`, sin levantar Nest, principio 3):**

- `it('FR-5 public entry point exports nothing')`: el módulo importado no tiene claves exportadas.
- `it('NFR-1 importing has no side effects')`: con `jest.isolateModules`, importa el punto de entrada mientras espía `setTimeout`, `setInterval`, `setImmediate`, `console.*`, `process.stdout.write`/`process.stderr.write` y las lecturas de `process.env` (sustituido por un `Proxy`), y comprueba que no hay ninguna llamada ni lectura. Los providers y filtros globales quedan cubiertos porque la lib no importa Nest (V5).

**Comandos de verificación (FR de configuración, principio 2):** se ejecutan desde la raíz del workspace en `/sdd-validate`. Nunca se ejecuta `npm publish`.

| Id  | Comando                                                                                                                                                                                                                                                                                                                                                                                                      | Comprueba                                                                                                                          | FR                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| V1  | `pnpm nx run-many -t lint test build -p nest-tools,nest-tools-app`                                                                                                                                                                                                                                                                                                                                           | Lint (incluida `@nx/dependency-checks`), tests y build en verde.                                                                   | FR-1, FR-2, NFR-1  |
| V2  | `node -p "require('./dist/libs/nest-tools/package.json')"`                                                                                                                                                                                                                                                                                                                                                   | Campos del manifiesto publicado según la tabla de configuración.                                                                   | FR-1 a FR-5        |
| V3  | `cd dist/libs/nest-tools && npm pack --dry-run`                                                                                                                                                                                                                                                                                                                                                              | Lista exacta: `LICENSE`, `README.md`, `package.json`, `src/index.js`, `src/index.d.ts`; sin `.map`, specs, `.ts` ni configuración. | FR-7, FR-8         |
| V4  | `npm pack` del paquete a un directorio temporal, `npm install` del `.tgz` en un proyecto vacío y, allí: `node -e "require('@alexdevcave/nest-tools')"`, `node --input-type=module -e "import '@alexdevcave/nest-tools'"`, `node -e "require('@alexdevcave/nest-tools/package.json')"` (funcionan) y `node -e "require('@alexdevcave/nest-tools/src/index.js')"` (falla con `ERR_PACKAGE_PATH_NOT_EXPORTED`). | Carga en Node y bloqueo de rutas internas.                                                                                         | FR-5, FR-6         |
| V5  | En ese proyecto temporal, un `consumer.ts` con `import * as tools from '@alexdevcave/nest-tools'` y el `tsc` del workspace con `--noEmit` en tres modos: `--module commonjs --moduleResolution node10 --ignoreDeprecations 6.0`, `--module node16 --moduleResolution node16` y `--module esnext --moduleResolution bundler`.                                                                                 | Los tipos se encuentran en las tres resoluciones.                                                                                  | FR-5               |
| V6  | `grep -rnE "(express\|fastify\|@nestjs/\|rxjs)" libs/nest-tools/src`                                                                                                                                                                                                                                                                                                                                         | Sin coincidencias: no importa Express, Fastify, Nest ni `rxjs`.                                                                    | FR-1, NFR-1, NFR-2 |
| V7  | Leer `libs/nest-tools/README.md` y `libs/nest-tools/LICENSE`.                                                                                                                                                                                                                                                                                                                                                | Contenido en inglés y MIT 2026 a nombre de «alexdevcave».                                                                          | FR-7, FR-9         |

`V4` y `V5` instalan desde el `.tgz` local; si `tslib` no está en la caché, `npm install` necesita red. Con TypeScript 6.0, `node10` está obsoleto y requiere `--ignoreDeprecations 6.0`.

**e2e en `nest-tools-app`:** nada que validar; la app no usa la librería y la API pública está vacía. `nest-tools-app` se incluye en V1 solo para comprobar que quitar `NestToolsModule` no rompe nada.

## Cobertura de la spec

| Requisito | Dónde                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------ |
| FR-1      | Manifiesto (`dependencies`, sin peers), V1, V2, V6                                                     |
| FR-2      | Manifiesto (`dependencies`), V1, V2                                                                    |
| FR-3      | Manifiesto (`private`, `publishConfig`, `license`, `author`, `description`, `keywords`, `engines`), V2 |
| FR-4      | Manifiesto (`repository`, `homepage`), V2                                                              |
| FR-5      | `index.ts`, `exports`/`types`, test FR-5, V4, V5                                                       |
| FR-6      | `exports`, V4                                                                                          |
| FR-7      | `files`, `LICENSE`, `assets`, V3, V7                                                                   |
| FR-8      | `files`, `tsconfig.lib.json`, V3                                                                       |
| FR-9      | README, V7                                                                                             |
| NFR-1     | Test NFR-1, V6                                                                                         |
| NFR-2     | V6                                                                                                     |
