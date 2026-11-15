# Tareas 003 — Filtro de excepciones para todas las peticiones HTTP

Spec: `spec.md` (approved) · Plan: `plan.md` (approved). Los comandos V1-V7 están en la estrategia de tests del plan; los archivos nuevos van en `libs/nest-tools/src/lib/all-exceptions-filter/`.

Requisito previo: el `/sdd-change` de la 001 (NFR-1, FR-5, FR-9 y V6) aplicado y en verde antes de T1.

- [x] **T1. Opciones del filtro, primero los tests.** FR-7
      Crear `all-exceptions-filter.options.spec.ts` (valor por defecto `true`, `false`, `'false'` y opciones que no son objeto) y verlo fallar; después `all-exceptions-filter.options.ts` con la interfaz `AllExceptionsFilterOptions` y la función que aplica el valor por defecto y lanza `TypeError`. Ajustada el 2026-11-15: la interfaz vive en `interfaces/all-exceptions-filter-options.interface.ts`.
- Hecho cuando: `pnpm nx run nest-tools:test --testPathPatterns=all-exceptions-filter.options` pasa con los tests FR-7.

- [x] **T2. Cuerpo de la respuesta, primero los tests.** FR-2, FR-3, FR-4
      Crear `exception-body.spec.ts` con los casos del plan (cuerpo texto, lista, `error` propio, campos extra sin pisar los cinco, cuerpo sin mensaje, error externo con `expose` a `true`/`false`, desconocidos incluida `HttpException` con 302 y 200, nombres de Node y respaldo 499/520, ruta sin query, formato de `timestamp`) y verlo fallar; después `exception-body.ts` con funciones puras, y declarar `@nestjs/common` en `peerDependencies` (`^11.0.0 || ^12.0.0`), porque el lint exige declarar lo que se importa. Ajustada el 2026-11-15: `stack` y `cause` del cuerpo propio no se copian (FR-4) e interfaces en `interfaces/`.
- Hecho cuando: `pnpm nx run nest-tools:test --testPathPatterns=exception-body` pasa y ningún cuerpo de los tests contiene `stack` ni `cause`.

- [x] **T3. Líneas de log y traza, primero los tests.** FR-5, FR-6, FR-8
      Crear `exception-log.spec.ts` (línea de 5xx con mensaje, línea de 4xx sin mensaje, sufijo de respuesta ya enviada, mensaje original de `Error`, texto y objeto, traza con causas, cadena circular sin repeticiones, sin traza si no hay stack, ruta sin query) y verlo fallar; después `exception-log.ts` con funciones puras.
- Hecho cuando: `pnpm nx run nest-tools:test --testPathPatterns=exception-log` pasa con los tests FR-5, FR-6 y FR-8.

- [x] **T4. Filtro con contexto y adaptador simulados.** FR-5, FR-6, FR-7, FR-9
      Crear `all-exceptions.filter.spec.ts` (fuera de HTTP con `rpc`, `ws` y `graphql`; respuesta ya enviada; opción a `false`) y verlo fallar; después `all-exceptions.filter.ts`: `@Catch()`, constructor con `HttpAdapterHost` y opciones `@Optional()`, `Logger` creado en el constructor y `catch()` que solo conecta con las funciones de T1-T3. JSDoc en inglés. Declarar `@nestjs/core` en `peerDependencies` con el mismo rango, al importar `HttpAdapterHost`.
- Hecho cuando: `pnpm nx run nest-tools:test --testPathPatterns=all-exceptions.filter.spec` pasa: fuera de HTTP devuelve la misma excepción sin llamar a `reply` ni al logger, y con la respuesta enviada llama a `end` y el log lo indica.

- [x] **T5. API pública y comprobación de las dependencias de pares.** FR-1, NFR-3
      En `index.spec.ts`, cambiar la lista explícita del test FR-5 de la 001 a `['AllExceptionsFilter']` y añadir en `describe('spec 003 all exceptions filter', …)` el test `FR-1 exports AllExceptionsFilter from the public entry point`, y verlos fallar; exportar `AllExceptionsFilter` y el tipo `AllExceptionsFilterOptions` desde `index.ts`; las dos dependencias de pares ya están declaradas desde T2 y T4.
- Hecho cuando: `pnpm nx run-many -t test lint build -p nest-tools` está en verde (incluidos `@nx/dependency-checks` y el test NFR-1 ajustado de la 001) y V3 muestra las dos peers y solo `tslib` en `dependencies`.

- [x] **T6. Fastify y tests de integración de activación y respuestas.** FR-1, FR-2, FR-3, NFR-1
      Con aprobación, `pnpm add -D -w @nestjs/platform-fastify@^11.0.0`. Crear `all-exceptions.filter.http.spec.ts` con `describe.each(['express', 'fastify'])`, `app.listen(0)` y `fetch`: las cuatro formas de activación (`APP_FILTER` con clase, `useGlobalFilters(new …)`, `@UseFilters` en controlador y en ruta) y las respuestas a `NotFoundException`, lista de validación, cuerpo con `code`, 503 con texto propio, `Error` y texto lanzado.
- Hecho cuando: `pnpm nx run nest-tools:test --testPathPatterns=all-exceptions.filter.http` pasa con las dos plataformas, incluidas las formas en que Nest crea el filtro (comprueba que `@Optional()` funciona).

- [x] **T7. Tests de integración de activación global y logs.** FR-5, FR-6, FR-7, FR-8, NFR-1
      Ampliar `all-exceptions.filter.http.spec.ts` con: ruta inexistente con query, JSON roto y body demasiado grande; un `LoggerService` falso vía `app.useLogger()` para nivel, contexto y datos, con la opción activada y desactivada; y una petición con `?token=secret`, `Authorization: Bearer secret` y body con `"password":"secret"`.
- Hecho cuando: el archivo pasa con las dos plataformas, los tres casos globales dan el mismo código y la misma forma de cuerpo en ambas, y ningún log capturado contiene `secret`.

- [x] **T8. Ejemplo en la app y e2e.** FR-1, FR-2
      Registrar el filtro con `APP_FILTER` en `apps/nest-tools-app/src/app/app.module.ts` y añadir al e2e `GET /api/does-not-exist?x=1` (404 con los cinco campos y `path` `/api/does-not-exist`).
- Hecho cuando: V2 (`pnpm nx run nest-tools-app-e2e:e2e`) está en verde con el test nuevo y el de `GET /api`.

- [x] **T9. README en inglés.** FR-10
      Añadir a `libs/nest-tools/README.md` la sección del filtro: qué hace, formas de activación y qué cubre cada una, la de la opción, formato con ejemplos, qué se registra con cada nivel y el aviso sobre mensajes y stacks de 5xx, la opción y su validación, GraphQL/WebSockets/microservicios, Express/Fastify y que los mensajes que genera NestJS pueden repetir parte de la petición en la respuesta.
- Hecho cuando: V7 confirma que el README está en inglés y cubre cada punto de FR-10.

- [x] **T10. Verificación completa y documentación interna.** FR-1 a FR-10, NFR-1 a NFR-4
      Ejecutar V1 a V7 sobre un build limpio, incluido V5 con NestJS 12 en un proyecto temporal; actualizar la línea de `libs/nest-tools` en `CLAUDE.md` y el estado en `MEMORY.md`.
- Hecho cuando: V1 a V7 dan el resultado esperado, la tabla de cobertura del plan queda comprobada requisito a requisito y `grep -n "hoy vacío" CLAUDE.md` no devuelve nada.
