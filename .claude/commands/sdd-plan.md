---
description: SDD · Genera el plan técnico de una spec aprobada
agent: plan
---

Lee docs/constitution.md, CLAUDE.md y specs/$0/spec.md. Usa la skill sdd.

No escribas código.

Genera specs/$0/plan.md con: los archivos que se crean o modifican y la responsabilidad de cada uno, la API pública (lo que se exporta desde `libs/nest-tools/src/index.ts`: clases, decoradores, opciones y tipos), la configuración y sus valores por defecto, la integración con Nest (módulo, providers, uso global o por ruta), la compatibilidad (`peerDependencies`, Express y Fastify, impacto semver), la documentación pública (README en inglés y JSDoc), las decisiones técnicas justificadas (con su alternativa descartada) y la estrategia de tests con Jest y `@nestjs/testing`, incluido lo que se valida con e2e en `nest-tools-app`.

Todo debe respetar la constitución y cubrir cada FR. Marca qué FR cubre cada parte. Si la spec no está aprobada o tiene preguntas abiertas, para y avísame.
