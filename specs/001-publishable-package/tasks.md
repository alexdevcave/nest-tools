# Tareas 001 — Paquete publicable

Spec: `spec.md` (approved) · Plan: `plan.md` (approved). Los comandos V1-V7 están definidos en la estrategia de tests del plan. T9-T10 aplican el cambio del 2026-11-15 (FR-1, FR-5, FR-9 y NFR-1, a raíz de la spec 003).

T11-T12 aplican el cambio del 2026-11-17 (FR-3, FR-7 y FR-8, a raíz de la spec 002: `private` solo hasta la primera release y el registro de cambios en el paquete). T1-T10 siguen hechas y no se reabren.

- [x] **T1. Vaciar la API pública con sus tests primero.** FR-5, NFR-1
      Crear `libs/nest-tools/src/index.spec.ts` con `FR-5 public entry point exports nothing` y `NFR-1 importing has no side effects` y verlos fallar; después borrar `nest-tools.module.ts`, dejar `index.ts` como `export {}` con su JSDoc en inglés y quitar `passWithNoTests` de `project.json`.
- Hecho cuando: `pnpm nx run nest-tools:test` pasa con los 2 tests y V6 no devuelve coincidencias.

- [x] **T2. Dependencias del manifiesto.** FR-1, FR-2
      Quitar `@nestjs/common` de `dependencies`, dejar solo `tslib` y no declarar `peerDependencies`.
- Hecho cuando: `pnpm nx run nest-tools:lint` está en verde y V2 muestra `dependencies` solo con `tslib` y sin `peerDependencies`.

- [x] **T3. Metadatos públicos.** FR-3, FR-4
      Añadir `publishConfig`, `license`, `author`, `description`, `keywords`, `engines`, `repository` y `homepage` según la tabla del plan, manteniendo `private: true` y la versión `0.0.1`.
- Hecho cuando: V2 muestra todos esos campos con los valores del plan.

- [x] **T4. Punto de entrada y `exports`.** FR-5, FR-6
      Fijar `type`, `main`, `types` y `exports` (`.` con `types` + `default`, y `./package.json`).
- Hecho cuando: V4 da el resultado esperado (las tres cargas funcionan y la ruta interna falla con `ERR_PACKAGE_PATH_NOT_EXPORTED`) y V5 compila sin errores en las tres resoluciones.

- [x] **T5. Contenido del paquete y licencia.** FR-7, FR-8
      Crear `libs/nest-tools/LICENSE` (MIT, `Copyright (c) 2026 brickstodev`), añadirlo a `assets` en `project.json`, añadir `files` al manifiesto y poner `sourceMap: false` y `declarationMap: false` en `tsconfig.lib.json`.
- Hecho cuando: V3 lista exactamente `LICENSE`, `README.md`, `package.json`, `src/index.js` y `src/index.d.ts`.

- [x] **T6. README en inglés.** FR-9
      Reescribir `libs/nest-tools/README.md` con qué es la librería, instalación con npm y pnpm, política de soporte (NestJS 10 y 11, Node.js 20+) y licencia.
- Hecho cuando: V7 confirma que el README está en inglés y cubre los cuatro apartados.

- [x] **T7. Documentación interna.**
      Actualizar la línea de `libs/nest-tools` en `CLAUDE.md` (sin `NestToolsModule`) y el estado en `MEMORY.md`.
- Hecho cuando: `grep -n NestToolsModule CLAUDE.md` no devuelve nada y `MEMORY.md` refleja la spec implementada.

- [x] **T8. Verificación completa.** FR-1 a FR-9, NFR-1, NFR-2
      Ejecutar V1 a V7 de una vez sobre un build limpio.
- Hecho cuando: V1 a V7 dan el resultado esperado y la tabla de cobertura del plan queda comprobada requisito a requisito.

- [x] **T9. Tests del punto de entrada agrupados por spec.** FR-5, NFR-1
      En `libs/nest-tools/src/index.spec.ts`, agrupar los tests en `describe('spec 001 publishable package', …)`; cambiar `FR-5 public entry point exports nothing` por `FR-5 public entry point exports only the listed public API`, que compara `Object.keys` del módulo con una lista explícita (`[]`); y en `NFR-1 importing has no side effects of its own`, dentro del mismo `jest.isolateModulesAsync`, cargar `@nestjs/common` y `@nestjs/core`, después poner los espías y por último importar `./index`.
- Hecho cuando: `pnpm nx run nest-tools:test` pasa con los 2 tests dentro de `describe('spec 001 publishable package', …)`. Opcional: con un `import '@nestjs/common'` temporal en `index.ts` el test NFR-1 sigue en verde, y con una lectura temporal de `process.env` falla (deshacer los dos cambios).

- [x] **T10. README, V6 nuevo y verificación.** FR-9, NFR-2
      En la tabla de soporte de `libs/nest-tools/README.md`, NestJS pasa de `10 and 11` a `11 and 12`, con una nota de que NestJS 12 requiere Node.js 20.19+ o 22.12+; ejecutar V1, V6 y V7, volver a poner `Status: implemented` en la spec y actualizar `MEMORY.md`.
- Hecho cuando: V1 está en verde, V6 no devuelve coincidencias, V7 confirma la tabla con `11 and 12` y la nota de Node para NestJS 12, y `grep -n "10 and 11" libs/nest-tools/README.md` no devuelve nada.

- [x] **T11. `CHANGELOG.md` en `files`.** FR-7, FR-8
      Añadir `"CHANGELOG.md"` a `files` en `libs/nest-tools/package.json`, detrás de `"src/**/*.d.ts"`; `private` sigue en `true` y `project.json` no cambia (su glob `libs/nest-tools/*.md` ya copia el registro de cambios cuando exista).
- Hecho cuando: tras `pnpm nx run nest-tools:build`, V3 da las dos listas exactas del plan: V3a, la de 27 archivos sin registro de cambios, y V3b, la de 28 con `CHANGELOG.md`.

- [x] **T12. Verificación del cambio.** FR-3, FR-7, FR-8
      Ejecutar V1-V3 sobre un build limpio, volver a poner `Status: implemented` en la spec y actualizar `MEMORY.md`.
- Hecho cuando: V1 está en verde, V2 muestra `private: true` y el resto de campos de la tabla de configuración (con `CHANGELOG.md` en `files`), V3a y V3b dan las listas exactas del plan, la spec dice `Status: implemented` y `MEMORY.md` refleja el cambio.
