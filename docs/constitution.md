# Constitución — Nest Tools Workspace

Principios innegociables para la app y para la librería publicada en npm. Si un cambio choca con uno, se cambia el cambio o primero se enmienda esta constitución.

1. **Stack mínimo.** Solo lo ya instalado (NestJS, Nx, pnpm, TypeScript, Jest, webpack). Una dependencia nueva exige una spec que la justifique y aprobación explícita. *Se comprueba:* `package.json` solo cambia junto a una spec aprobada.
2. **La spec manda.** No hay código sin `specs/NNN-nombre/spec.md` aprobada, y cada requisito (FR) tiene al menos un test cuyo nombre lo cita. *Se comprueba:* cada FR de la spec aparece en algún `it('FR-n …')`.
3. **Lógica separada de Nest.** Las reglas, cálculos y formateos viven en funciones o servicios sin decoradores; controladores, filtros, interceptores, pipes y decoradores solo conectan esa lógica con Nest. *Se comprueba:* la lógica tiene tests unitarios que no levantan un módulo de Nest.
4. **Tests con lo que ya hay.** Jest + `@nestjs/testing` para unidades y Jest + axios para e2e; no se instalan librerías de test. Cada export público de la librería tiene al menos un test. *Se comprueba:* `pnpm nx run-many -t lint test build` en verde antes de cerrar una tarea.
5. **Datos del usuario protegidos.** Toda entrada se valida antes de llegar a la lógica. Ni la app ni la librería exponen en respuestas, errores o logs datos personales, secretos, cabeceras de autenticación ni trazas internas, y la librería no registra bodies ni cabeceras por defecto. *Se comprueba:* hay tests de entrada inválida que esperan `400` y tests que comprueban que un `500` no incluye el `stack`.
6. **Idioma.** Código, nombres, comentarios, JSDoc, mensajes de la API y el README publicado en npm, en inglés; specs, docs internos y textos para el equipo, en español. *Se comprueba:* revisión del diff.
7. **Librería pública estable.** La API pública es solo lo que exporta `libs/nest-tools/src/index.ts`, sigue semver (un cambio incompatible es versión mayor) y no hace nada solo por importarse. NestJS y `rxjs` van en `peerDependencies`, en `dependencies` solo `tslib`, y nunca se importan `express` ni `fastify` directamente. *Se comprueba:* `libs/nest-tools/package.json` y un grep de imports en `libs/nest-tools/src`.

Enmiendas: 2026-11-14 — librería pública en npm (principio 7; ajustes en 1, 3, 4, 5 y 6).
