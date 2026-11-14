# MEMORY.md — Nest Tools Workspace

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual

- API NestJS funcionando en `/api`: hello, `health` y CRUD de `todos` en memoria (sin base de datos).
- Workspace migrado de npm a pnpm 12: `pnpm-lock.yaml`, `packageManager: pnpm@12.18.0`, comandos `pnpm nx` en `CLAUDE.md` y `README.md`.
- Imagen Docker construida y probada: arranca y `GET /api/health` responde `ok`.
- `CLAUDE.md` en español con la plantilla del proyecto; el bloque de Nx va al final, entre sus marcadores.
- Migración a pnpm y limpieza de agentes en `main` (commits `c8a4048`…`8e1d347`).
- `docs/constitution.md` aprobada (6 principios). El código actual incumple el principio 5: `POST /api/todos` acepta cualquier body.

## Decisiones (y por qué)

- pnpm en lugar de npm: es el gestor del resto de proyectos; se borró `package-lock.json`.
- Solo configuración para Claude: se borraron `AGENTS.md`, `opencode.json` y las carpetas `.codex`, `.gemini`, `.cursor`, `.opencode`, `.github`. Se conserva `.agents/skills/`.
- `--fix-lockfile` en la instalación final del `Dockerfile`: el lockfile podado por `@nx/js:prune-lockfile` rompe la dependencia local `@nestjs-template/types`; es el cambio más pequeño que funciona.

## Aprendizajes y errores a evitar

- Con `--frozen-lockfile` o `--no-frozen-lockfile`, el `pnpm install` dentro de `dist/apps/api` falla por la dependencia `file:` de `@nestjs-template/types`.
- `nx configure-ai-agents` (o actualizar Nx) vuelve a meter su bloque en inglés en `CLAUDE.md` y puede recrear `AGENTS.md`.
- `pnpm-workspace.yaml` no declara `packages:`; las libs solo se resuelven por los alias de `tsconfig.base.json` y `tsdown.config.mts`.

## Próximos pasos

- Valorar quitar `@nestjs-template/types` de `apps/api/package.json` (solo son tipos y tsdown ya los incluye) para volver a `--frozen-lockfile` en Docker.
- Spec para validar a mano la entrada de `todos` (sin `class-validator`) y cumplir el principio 5.
