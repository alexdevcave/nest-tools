# MEMORY.md — Nest Tools Workspace

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual

- `apps/nest-tools-app` (generada con `@nx/nest`, build con webpack) sustituye a `apps/api`: solo expone `GET /api` (hello). Se fueron `health`, `todos`, el `Dockerfile` y tsdown.
- `libs/nest-tools` (`@alexdevcave/nest-tools`): API pública vacía (`export {}`), con tests de FR-5/NFR-1, solo `tslib` como dependencia, metadatos públicos, `exports`, `files`, LICENSE MIT y README en inglés. Sigue `private: true` en 0.0.1.
- `packages/types` ya no lo importa ningún proyecto.
- Workspace en pnpm 12 (`packageManager: pnpm@12.18.0`), comandos `pnpm nx` en `CLAUDE.md` y `README.md`.
- `CLAUDE.md` en español con la plantilla del proyecto; el bloque de Nx va al final, entre sus marcadores.
- `docs/constitution.md`: 7 principios, enmendada el 2026-11-14 (librería pública en npm). Principio 2: los FR de configuración o de proceso se verifican con un comando documentado en el plan. Principio 7: semver en 0.x, y NestJS y `rxjs`, si se importan, van en `peerDependencies`.
- Spec `001-publishable-package` `implemented`: solo la configuración del paquete `@alexdevcave/nest-tools` (9 FR, 2 NFR). T1-T8 hechas y validada con `/sdd-validate`: tests FR-5/NFR-1, V1-V7 y e2e de la app en verde.

## Decisiones (y por qué)

- pnpm en lugar de npm: es el gestor del resto de proyectos; se borró `package-lock.json`.
- Solo configuración para Claude: se borraron `AGENTS.md`, `opencode.json` y las carpetas `.codex`, `.gemini`, `.cursor`, `.opencode`, `.github`. Se conserva `.agents/skills/`.
- webpack (`@nx/webpack`, `webpack`, `webpack-cli`, `webpack-dev-server`) entra porque lo añadió el generador de la app y la lib; aprobado por el usuario. Se quitaron `tsdown` y `unrun`, que solo usaba `apps/api`.
- Scope `@alexdevcave` solo para la lib; la raíz y la app siguen con `@nestjs-template`.
- Tooling SDD (skill, agentes y comandos) sin restos de Angular; los tests se lanzan con `pnpm nx run-many -t test -p nest-tools,nest-tools-app` para cubrir librería y app con un solo comando.
- Herramientas candidatas para la lib: `AllExceptionsFilter`, `@Pagination()`, `RequestIdInterceptor`, `TimeoutInterceptor`, `LoggingInterceptor`. Se descartan `HealthModule`, `EnvService` y un pipe de validación propio porque ya los cubren `@nestjs/terminus`, `@nestjs/config` y `class-validator`/`zod`.
- Spec 001 (alcance: solo configuración del paquete):
  - NestJS 10 y 11 como política de soporte (cubre la mayoría de proyectos actuales): rango declarado en el README, no se prueba.
  - CommonJS (el formato de NestJS 10 y 11) y Node 20+ (mínimo de NestJS 11); sin source maps (el paquete no lleva las fuentes).
  - Licencia MIT (copyright 2026, la habitual en NestJS y la de la raíz) a nombre de «alexdevcave», sin email (principio 5).
  - La marca de privado se mantiene hasta la 002, para evitar un `npm publish` accidental.
  - Se quita `NestToolsModule` (vacío, generado por Nx): la API pública queda vacía.
  - Sin peers hasta que la lib importe Nest o `rxjs`: `@nx/dependency-checks` marcaría como obsoletas las que no se importan.
  - `tslib` es la única dependencia directa (principio 7), aunque la API esté vacía.
- División: la release va a la futura `002-release-process` (versión desde Conventional Commits con el comportamiento 0.x de Nx: incompatible sube el minor; `feat`, `fix` y `perf`, el patch; 0.1.0 fija con «Initial release»; tags `nest-tools@x.y.z`; ensayo; release solo en local, sin push; publicación; quitar la marca de privado). `AllExceptionsFilter` pasa a la spec 003.

## Aprendizajes y errores a evitar

- `nx configure-ai-agents` (o actualizar Nx) vuelve a meter su bloque en inglés en `CLAUDE.md` y puede recrear `AGENTS.md`.
- `pnpm-workspace.yaml` no declara `packages:`; las libs solo se resuelven por los alias de `tsconfig.base.json`.
- Los generadores de Nx dejan `tags: []`, y la lib sin tests rompe `test` si no lleva `passWithNoTests`.
- En 0.x, Nx baja major→minor y minor→patch por defecto (`adjustSemverBumpsForZeroMajorVersion`).
- `@nx/dependency-checks` está en `error` en `libs/nest-tools/eslint.config.mjs` y marca como obsoletas las peers que no se importan.
- `tslib` se da por usado porque el build de la lib es `@nx/js:tsc` con `importHelpers: true` (comprobado en T2: el lint pasa con la API vacía).
- `tsconfig.base.json` tiene `sourceMap: true`: la lib lo desactiva en `tsconfig.lib.json`, y `files` es la segunda barrera.
- `@nx/js:tsc` con `generateExportsField: false` (por defecto) respeta un `exports` escrito a mano en el manifiesto.
- TypeScript 6.0 marca `moduleResolution: node10` como obsoleto: hace falta `--ignoreDeprecations 6.0`.
- V4/V5 se ejecutan en un proyecto temporal con `npm pack` + `npm install` del `.tgz` (necesita red para `tslib`); en zsh las opciones de `tsc` guardadas en una variable no se parten en palabras, hay que escribirlas.
- En tablas Markdown, los `|` dentro de código se escriben `\|`; si no, Prettier los toma como columnas y rompe el comando.
- Desde ESM, Node muestra en el namespace de un paquete CommonJS `__esModule`, `default` y `module.exports`: es interoperabilidad de Node, no API pública.
- Importar `@nestjs/common` lee `process.env.NO_COLOR`: el test NFR-1 lo detecta, así que la primera herramienta que importe Nest tendrá que revisar NFR-1 en su spec.

## Próximos pasos

- Spec `003-all-exceptions-filter` (primera herramienta); después la `002-release-process`, que quita la marca de privado y publica.
- Decidir si se borra `packages/types`.
