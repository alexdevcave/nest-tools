# Constitución — Nest Tools Workspace

Principios innegociables. Si un cambio choca con uno, se cambia el cambio o primero se enmienda esta constitución.

1. **Stack mínimo.** Solo NestJS, Nx, pnpm, TypeScript y Jest. Una dependencia nueva exige una spec que la justifique y aprobación explícita. *Se comprueba:* `package.json` solo cambia junto a una spec aprobada.
2. **La spec manda.** No hay código sin `specs/NNN-nombre/spec.md` aprobada, y cada requisito (FR) tiene al menos un test cuyo nombre lo cita. *Se comprueba:* cada FR de la spec aparece en algún `it('FR-n …')`.
3. **Lógica en servicios, HTTP en controladores.** Los controladores solo reciben, delegan y devuelven; las reglas, cálculos y errores viven en `*.service.ts`. *Se comprueba:* ningún controlador contiene `if`, bucles ni acceso a datos.
4. **Tests con lo que ya hay.** Jest + `@nestjs/testing` para servicios y Jest + axios para e2e; no se instalan librerías de test. *Se comprueba:* `pnpm nx run-many -t lint test build` en verde antes de cerrar una tarea.
5. **Datos del usuario protegidos.** Toda entrada se valida antes de llegar a la lógica, y ninguna respuesta, error o log expone datos personales, secretos o trazas internas. *Se comprueba:* hay tests de entrada inválida que esperan `400`.
6. **Idioma.** Código, nombres, comentarios y mensajes de la API en inglés; specs, docs y textos para el equipo en español. *Se comprueba:* revisión del diff.
