# Tareas 001 — Paquete publicable

Spec: `spec.md` (approved) · Plan: `plan.md` (approved). Los comandos V1-V7 están definidos en la estrategia de tests del plan.

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
      Crear `libs/nest-tools/LICENSE` (MIT, `Copyright (c) 2026 alexdevcave`), añadirlo a `assets` en `project.json`, añadir `files` al manifiesto y poner `sourceMap: false` y `declarationMap: false` en `tsconfig.lib.json`.
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
