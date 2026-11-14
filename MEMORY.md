# MEMORY.md — Nest Tools Workspace

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual

- `apps/nest-tools-app` (generada con `@nx/nest`, build con webpack) sustituye a `apps/api`: solo expone `GET /api` (hello). Se fueron `health`, `todos`, el `Dockerfile` y tsdown.
- `libs/nest-tools` (`@alexdevcave/nest-tools`): librería NestJS vacía (`NestToolsModule`), todavía sin tests (`passWithNoTests`).
- `packages/types` ya no lo importa ningún proyecto.
- Workspace en pnpm 12 (`packageManager: pnpm@12.18.0`), comandos `pnpm nx` en `CLAUDE.md` y `README.md`.
- `CLAUDE.md` en español con la plantilla del proyecto; el bloque de Nx va al final, entre sus marcadores.
- `docs/constitution.md` aprobada (6 principios).

## Decisiones (y por qué)

- pnpm en lugar de npm: es el gestor del resto de proyectos; se borró `package-lock.json`.
- Solo configuración para Claude: se borraron `AGENTS.md`, `opencode.json` y las carpetas `.codex`, `.gemini`, `.cursor`, `.opencode`, `.github`. Se conserva `.agents/skills/`.
- webpack (`@nx/webpack`, `webpack`, `webpack-cli`, `webpack-dev-server`) entra porque lo añadió el generador de la app y la lib; aprobado por el usuario. Se quitaron `tsdown` y `unrun`, que solo usaba `apps/api`.
- Scope `@alexdevcave` solo para la lib; la raíz y la app siguen con `@nestjs-template`.

## Aprendizajes y errores a evitar

- `nx configure-ai-agents` (o actualizar Nx) vuelve a meter su bloque en inglés en `CLAUDE.md` y puede recrear `AGENTS.md`.
- `pnpm-workspace.yaml` no declara `packages:`; las libs solo se resuelven por los alias de `tsconfig.base.json`.
- Los generadores de Nx dejan `tags: []`, y la lib sin tests rompe `test` si no lleva `passWithNoTests`.

## Próximos pasos

- Poner `tags` a `nest-tools-app` y `nest-tools` para que apliquen los límites de módulos.
- Decidir si se borra `packages/types`.
