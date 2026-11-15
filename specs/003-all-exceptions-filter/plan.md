# Plan 003 — Filtro de excepciones para todas las peticiones HTTP

Spec: `spec.md` (approved). Las decisiones de comportamiento están en la spec; este plan dice dónde vive cada cosa y cómo se comprueba.

## Requisito previo: cambio en la spec 001

Antes de la primera tarea de esta spec, un `/sdd-change` en la 001 ajusta lo que la 003 deja obsoleto:

- **NFR-1:** cubre solo el código propio; su test carga `@nestjs/common` y `@nestjs/core` en el registro aislado antes de poner los espías.
- **FR-5:** el punto de entrada exporta solo la API de las herramientas; el test `FR-5 public entry point exports nothing` pasa a comparar los exports con una lista explícita (vacía en la 001).
- **FR-9:** política de soporte NestJS 11 y 12 en el README.
- **V6 del plan 001:** el grep busca solo `express` y `fastify`, porque importar Nest pasa a estar permitido (FR-1 de la 001 ya lo preveía).

## Archivos y responsabilidades

Carpeta nueva: `libs/nest-tools/src/lib/all-exceptions-filter/`, con una subcarpeta `interfaces/` que guarda una interfaz por archivo (`<nombre>.interface.ts`); `exception-body.ts` y `all-exceptions-filter.options.ts` quedan solo con funciones.

| Archivo                                                                                    | Acción    | Responsabilidad                                                                                                                                                          | FR                     |
| ------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `exception-body.ts`                                                                        | Crear     | Funciones puras: clasificar el error (excepción HTTP, error HTTP externo, desconocido), su código, su nombre, su mensaje, la ruta sin query y el cuerpo.                 | FR-2, FR-3, FR-4       |
| `exception-log.ts`                                                                         | Crear     | Funciones puras: la línea de log, el mensaje original de un error desconocido y la traza con las causas encadenadas.                                                     | FR-5, FR-6, FR-8       |
| `all-exceptions-filter.options.ts`                                                         | Crear     | La función pura que aplica el valor por defecto y valida.                                                                                                                | FR-7                   |
| `value-type.ts`                                                                            | Crear     | La función pura compartida `getValueType` (`null`, `array` o el `typeof` del valor), usada por las opciones y los logs.                                                  | FR-5, FR-7             |
| `interfaces/all-exceptions-filter-options.interface.ts`                                    | Crear     | `AllExceptionsFilterOptions`, la interfaz pública de opciones.                                                                                                           | FR-7                   |
| `interfaces/classified-exception.interface.ts`                                             | Crear     | `ClassifiedException`, interna: el resultado de clasificar el error.                                                                                                     | FR-2, FR-3             |
| `interfaces/exception-response-body.interface.ts`                                          | Crear     | `ExceptionResponseBody`, interna: el cuerpo de la respuesta.                                                                                                             | FR-2, FR-3, FR-4       |
| `interfaces/exception-log-entry.interface.ts`                                              | Crear     | `ExceptionLogEntry`, interna: la entrada de log (nivel, línea y traza opcional).                                                                                         | FR-5, FR-6             |
| `all-exceptions.filter.ts`                                                                 | Crear     | La clase `@Catch()`: solo conecta con Nest (tipo de contexto, adaptador HTTP y `Logger`) y delega en las funciones puras (principio 3).                                  | FR-1, FR-5, FR-6, FR-9 |
| `exception-body.spec.ts`, `exception-log.spec.ts`, `all-exceptions-filter.options.spec.ts` | Crear     | Tests unitarios de la lógica, sin levantar Nest.                                                                                                                         | FR-2 a FR-8            |
| `all-exceptions.filter.spec.ts`                                                            | Crear     | Tests del filtro con contexto y adaptador simulados: fuera de HTTP y respuesta ya enviada.                                                                               | FR-5, FR-6, FR-7, FR-9 |
| `all-exceptions.filter.http.spec.ts`                                                       | Crear     | Tests de integración con `@nestjs/testing` y peticiones HTTP reales, los mismos casos con Express y con Fastify.                                                         | FR-1 a FR-8, NFR-1     |
| `libs/nest-tools/src/index.ts`                                                             | Modificar | Exporta `AllExceptionsFilter` y el tipo `AllExceptionsFilterOptions`.                                                                                                    | FR-1                   |
| `libs/nest-tools/src/index.spec.ts`                                                        | Modificar | La lista explícita del test FR-5 de la 001 pasa a ser `['AllExceptionsFilter']`, y `describe('spec 003 all exceptions filter', …)` comprueba que el export es el filtro. | FR-1                   |
| `libs/nest-tools/package.json`                                                             | Modificar | Añade `peerDependencies`.                                                                                                                                                | NFR-3                  |
| `libs/nest-tools/README.md`                                                                | Modificar | Sección de uso del filtro.                                                                                                                                               | FR-10                  |
| `package.json` (raíz) y `pnpm-lock.yaml`                                                   | Modificar | `@nestjs/platform-fastify@^11.2.10` en `devDependencies`, con `pnpm add -D -w` (el lock lo escribe pnpm).                                                                | NFR-1                  |
| `apps/nest-tools-app/src/app/app.module.ts`                                                | Modificar | Registra el filtro con `APP_FILTER`: la app sirve de ejemplo real a través del alias.                                                                                    | FR-1                   |
| `apps/nest-tools-app-e2e/src/nest-tools-app/nest-tools-app.spec.ts`                        | Modificar | e2e del 404 de una ruta inexistente con el formato del filtro.                                                                                                           | FR-1, FR-2             |
| `CLAUDE.md`, `MEMORY.md`                                                                   | Modificar | La línea de `libs/nest-tools` deja de decir «hoy vacío»; estado y decisiones.                                                                                            | —                      |

## API pública

Lo único que exporta `libs/nest-tools/src/index.ts` (FR-1):

- **`AllExceptionsFilter`**: clase con `@Catch()` que implementa `ExceptionFilter`.
  - `constructor(httpAdapterHost: HttpAdapterHost, options?: AllExceptionsFilterOptions)`. El segundo parámetro lleva `@Optional()` para que, cuando Nest crea el filtro, reciba `undefined` y use los valores por defecto.
  - `catch(exception: unknown, host: ArgumentsHost): unknown`: en HTTP responde y no devuelve nada; fuera de HTTP devuelve la excepción sin cambios (FR-9).
- **`AllExceptionsFilterOptions`**: interfaz con `logClientErrors?: boolean`, que `index.ts` exporta como tipo desde `interfaces/all-exceptions-filter-options.interface.ts`.

Las funciones puras, las interfaces internas (`ClassifiedException`, `ExceptionResponseBody` y `ExceptionLogEntry`) y el contexto del logger no se exportan: son internos (principio 7).

## Configuración y valores por defecto

| Opción            | Tipo      | Por defecto | Validación (FR-7)                                                                                                                                                                                                                                |
| ----------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `logClientErrors` | `boolean` | `true`      | Si `options` no es un objeto, o `logClientErrors` existe y no es booleano, el constructor lanza un `TypeError` en inglés con el valor recibido y su tipo. Las claves desconocidas se ignoran: TypeScript ya avisa de ellas en un objeto literal. |

**Cuerpo de la respuesta** (FR-2, FR-3, FR-4):

| Caso                                                                                            | Código        | `message`                                                            | `error`                                       | Campos extra                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Excepción HTTP: `instanceof HttpException` con `getStatus()` entre 400 y 599                    | `getStatus()` | Cuerpo texto: ese texto; `message` texto o lista: ese; si no, nombre | `error` del cuerpo si es texto; si no, nombre | Las propiedades propias de un cuerpo objeto, salvo los cinco campos, `stack` y `cause` |
| Error HTTP externo: `instanceof Error`, `statusCode` entero entre 400 y 599 y `expose` booleano | `statusCode`  | `message` si `expose` es `true`; si no, nombre                       | Nombre                                        | Ninguno (algunos llevan dentro el body original)                                       |
| Cualquier otro valor, incluida una `HttpException` con otro código                              | 500           | `Internal server error`                                              | `Internal Server Error`                       | Ninguno                                                                                |

- **Nombre del código:** `STATUS_CODES` de `node:http`; si no existe, `Client Error` (4xx) o `Server Error` (5xx).
- **`path`:** `httpAdapter.getRequestUrl(request)` cortado en el primer `?`.
- **`timestamp`:** `new Date().toISOString()` al construir la respuesta.

**Logs** (FR-5, FR-6, FR-8), con un `Logger` de Nest creado en el constructor con el contexto `AllExceptionsFilter`:

| Código del error                    | Nivel   | Línea                                  | Traza                                                                                                                             |
| ----------------------------------- | ------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 5xx                                 | `error` | `<MÉTODO> <ruta> <código> - <mensaje>` | `stack` del error y, por cada causa (`cause`), `Caused by: ` y su stack; un `Set` evita repetir causas; sin traza si no hay stack |
| 4xx, con `logClientErrors` a `true` | `warn`  | `<MÉTODO> <ruta> <código>`             | Ninguna                                                                                                                           |

- Si la respuesta ya se había enviado, la línea termina en ` (response already sent)`.
- Una causa que no es un `Error` aparece en la traza como `Caused by: ` y su mensaje original (su texto o `Non-Error value of type <tipo>`, nunca su contenido), y la cadena termina ahí; un `Error` sin stack aparece con su mensaje.
- **Mensaje en el log de un 5xx:** el de la tabla del cuerpo (una lista se une con `, `), salvo en un error desconocido, que usa el original: el `message` de un `Error`, el propio texto o `Non-Error value of type <tipo>`.
- La línea solo se construye con el método, la ruta sin query, el código y el mensaje: nunca se pasa la petición, el body ni las cabeceras al logger (FR-8).
- Los saltos de línea del mensaje (`\r\n`, `\n` o `\r`) se sustituyen por un espacio: la línea sigue siendo una sola (FR-5) y un mensaje no puede simular líneas de log falsas (_log injection_). La traza no cambia, porque Nest la escribe aparte.
- `logger.error(línea, traza)`: con un `Logger` con contexto, Nest 11 trata siempre el segundo texto como stack (comprobado en `console-logger.service.js`), aunque no tenga formato de stack.

## Integración con Nest

- **Sin módulo:** importar la librería no registra nada (NFR-2). Formas de activación (FR-1), que el README documenta:
  1. **Global, recomendada:** `{ provide: APP_FILTER, useClass: AllExceptionsFilter }` en un módulo.
  2. **Global con la opción:** `APP_FILTER` con `useFactory` e `inject: [HttpAdapterHost]`, o `app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }))` en `main.ts`.
  3. **Controlador o ruta:** `@UseFilters(AllExceptionsFilter)`, con los valores por defecto.
- **El adaptador** se lee de `HttpAdapterHost` dentro de `catch()`, no en el constructor, como recomienda la documentación de Nest.
- **Primero la respuesta, después el log:**
  - si `httpAdapter.isHeadersSent(response)`, llama a `httpAdapter.end(response)`, como hace el filtro base de Nest;
  - si no, llama a `httpAdapter.reply(response, body, status)`;
  - solo después construye la entrada de log (`ExceptionLogEntry`) y la registra, para que un fallo al construirla o al escribirla no deje al cliente sin respuesta.
- **Alcance de cada forma:** la activación global cubre también las rutas inexistentes, los errores del body y los middlewares; en un controlador o una ruta, solo el manejador, sus guards, pipes e interceptores.
- **Fuera de HTTP** (`host.getType() !== 'http'`), devuelve la excepción sin tocar nada (FR-9):
  - **GraphQL:** recibe los filtros globales, y devolver el error es lo que documenta Nest.
  - **WebSockets y microservicios conectados:** `useGlobalFilters` no llega a ellos salvo con `inheritAppConfig`. Como no se puede comprobar si `APP_FILTER` llega a los gateways (los paquetes no están instalados), el README recomienda `useGlobalFilters` en aplicaciones con WebSockets o microservicios y no compartir el filtro con `inheritAppConfig`. Además, Nest espera que un filtro de microservicios devuelva un `Observable`, y este devuelve el error sin cambios.

## Compatibilidad

- **`peerDependencies`:** `@nestjs/common` y `@nestjs/core` con `^11.0.0 || ^12.0.0` (NFR-3). `rxjs` y `reflect-metadata` no se importan, así que no se declaran (principio 7). En `dependencies` sigue solo `tslib`.
- **Express y Fastify:**
  - solo a través de `HttpAdapterHost` (`reply`, `end`, `isHeadersSent`, `getRequestUrl` y `getRequestMethod`, presentes en el adaptador abstracto de Nest 11);
  - nunca se importan `express` ni `fastify` (V4);
  - `node:http` es un módulo de Node, no una dependencia.
- **NestJS 12:** solo ESM, y nuestro paquete CommonJS lo carga con `require(esm)` (Node 20.19+ o 22.12+). Se comprueba en un proyecto temporal (V5). `engines` sigue en `>=20`, el mínimo de Nest 11.
- **Semver:** primera API pública, un `feat` (en 0.x sube el patch). La versión publicada la decide la 002. El formato, los niveles, el contexto, los datos de log y la opción pasan a ser API pública (NFR-4).
- **Workspace:** sigue en Nest 11. `@nestjs/platform-fastify@^11.2.10` (el rango que guardó pnpm al instalar la 11.2.10) es solo de desarrollo.

## Documentación pública

- **README (inglés, FR-10):** sección «AllExceptionsFilter» con:
  - qué hace;
  - las tres formas de activarlo, la de la opción y qué errores cubre cada una;
  - el formato con ejemplos (excepción con lista, campos extra, error externo, error desconocido);
  - qué se registra con cada nivel, el contexto y que los mensajes y stacks de los 5xx acaban en los logs (no poner datos personales en los mensajes);
  - cómo aparece en la traza una causa que no es un `Error`;
  - que el formato de respuesta, la opción y el nivel, el contexto y los datos de cada log son API pública, y el texto exacto de las líneas no (NFR-4);
  - la opción `logClientErrors` y su validación;
  - el comportamiento con GraphQL, WebSockets y microservicios, y por qué se recomienda `useGlobalFilters` con WebSockets o microservicios: Nest espera que un filtro de microservicios devuelva un `Observable`, y este devuelve el error sin cambios;
  - las plataformas Express y Fastify;
  - que los mensajes que genera NestJS (por ejemplo, el de un JSON roto con Express) pueden repetir parte de la petición en la respuesta, aunque nunca llegan a los logs.
- **JSDoc (inglés):** la clase (qué hace, ejemplo de `APP_FILTER`, enlace al README), los parámetros del constructor, `catch()` (fuera de HTTP devuelve el error) y la interfaz de opciones con su valor por defecto.

## Decisiones

| Decisión                                                                                     | Alternativa descartada                                                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `HttpAdapterHost` inyectado, como el ejemplo «catch everything» de la documentación de Nest. | Detectar Express o Fastify por la forma de la respuesta: frágil y dependiente de cada plataforma.                             |
| Lógica en funciones puras y el filtro solo como conexión (principio 3).                      | Toda la lógica en la clase: obliga a levantar Nest para probar cada regla.                                                    |
| `Logger` creado en el constructor.                                                           | Un `Logger` estático, como el filtro base de Nest: crea un objeto al importar (zona gris de NFR-2).                           |
| Nombres de `node:http` `STATUS_CODES`.                                                       | Una tabla propia: más código, y los nombres del RFC 9110 difieren de los de Nest.                                             |
| Error externo: `instanceof Error` + `statusCode` 400-599 + `expose` booleano.                | Cualquier `statusCode`, como Nest: dejaría pasar errores de SDK de terceros.                                                  |
| Validar la opción en el constructor (falla al arrancar).                                     | Ignorar o convertir el valor: un `'false'` dejaría los logs activos sin avisar.                                               |
| Sin módulo propio.                                                                           | Un `AllExceptionsFilterModule.forRoot()`: más API, y `APP_FILTER` y `@UseFilters` son la forma estándar de Nest.              |
| Integración por HTTP real con `fetch` de Node sobre `app.listen(0)`.                         | `supertest` (no está instalado, principio 4), axios en la lib (reservado a e2e) o `inject` de Fastify (no existe en Express). |
| Los mismos casos con `describe.each(['express', 'fastify'])` (NFR-1).                        | Dos suites separadas: duplicación y riesgo de que diverjan.                                                                   |
| Logs capturados con un `LoggerService` falso vía `app.useLogger()`.                          | Espiar el `ConsoleLogger`: ata los tests a detalles internos de Nest.                                                         |
| No exportar el tipo del cuerpo.                                                              | Exportar `ExceptionResponseBody`: más API pública sin que se haya pedido; se puede añadir después como `feat`.                |
| La app solo registra el filtro y prueba el 404 en e2e.                                       | Rutas de demostración que lancen errores: código de app que nadie ha pedido.                                                  |
| Una interfaz por archivo en `interfaces/*.interface.ts` (convención de Nest y del usuario).  | Interfaces junto a las funciones: mezcla tipos y lógica.                                                                      |
| `@typescript-eslint/no-inferrable-types` desactivada en la lib para anotar literales.        | No anotar los literales, como exige esa regla: el usuario decidió tipar también los literales.                                |

## Estrategia de tests

Todos los tests citan su requisito en el nombre (principio 2), por ejemplo `it('FR-2 keeps extra fields without overriding the five fields')`.

**Unitarios, sin Nest** (principio 3):

- **`exception-body.spec.ts`:**
  - FR-2: cuerpo texto, lista, `error` propio, campos extra y los cinco campos que siempre mandan (también `statusCode`), cuerpo sin mensaje o con mensaje de otro tipo, error externo con `expose` a `true` y a `false`, 413.
  - FR-3: `Error`, texto, objeto y `HttpException` con 302 y 200.
  - FR-4: sin `stack` ni `cause`, un cuerpo propio con `stack` y `cause` no los incluye, y un desconocido con exactamente los cinco campos.
  - Nombres de Node y respaldo para 499 y 520, ruta sin query y formato de `timestamp`.
- **`exception-log.spec.ts`:**
  - FR-5: línea, mensaje original de `Error`, texto y objeto, traza con causas, cadena circular sin repeticiones y sin traza si no hay stack.
  - FR-6: línea sin mensaje; sufijo de respuesta ya enviada.
  - FR-8: la línea no contiene la query.
- **`all-exceptions-filter.options.spec.ts`:** FR-7, con el valor por defecto `true`, `false`, `'false'` (lanza `TypeError`) y opciones que no son objeto.

**Filtro con dobles** (`all-exceptions.filter.spec.ts`):

- FR-9: con `rpc`, `ws` y `graphql` devuelve la misma excepción, sin responder ni registrar.
- Respuesta ya enviada: llama a `end`, no a `reply`, y el log lo indica.
- FR-7: con la opción a `false`, un 4xx no registra y un 5xx sí.

**Integración** (`all-exceptions.filter.http.spec.ts`): `@nestjs/testing`, `app.listen(0)` y `fetch`, con los mismos casos para Express y para Fastify (NFR-1):

- FR-1: las formas `APP_FILTER` con clase, `useGlobalFilters(new …)`, y `@UseFilters` en un controlador y en una ruta.
- FR-2 y FR-3 por HTTP: `NotFoundException`, lista de validación, cuerpo con `code`, 503 con texto propio, `Error` y texto lanzado.
- Solo activación global: ruta inexistente (con `path` sin query), JSON roto (400) y body demasiado grande (413). El código y la forma del cuerpo coinciden en las dos plataformas; el texto de `message` puede variar.
- FR-5, FR-6 y FR-8 con un logger falso: nivel, contexto y datos. Además, una petición con `?token=secret`, `Authorization: Bearer secret` y body `{"password":"secret"}`: ningún log contiene `secret`.
- FR-7 con la opción a `false`.

**`index.spec.ts`:**

- en el `describe` de la 001, la lista explícita del test FR-5 pasa a ser `['AllExceptionsFilter']`;
- en un `describe('spec 003 all exceptions filter', …)`, `FR-1 exports AllExceptionsFilter from the public entry point` comprueba que el export es la clase del filtro;
- NFR-2 queda cubierta por el test NFR-1 de la 001 ya ajustado.

**e2e en `nest-tools-app`:**

- `GET /api/does-not-exist?x=1` responde 404 con `statusCode`, `message`, `error`, `path` `/api/does-not-exist` y `timestamp`;
- `GET /api` sigue respondiendo 200.

**Verificación:**

| #   | Comando                                                                                                                                                                                                                                                                                                                                                  | Resultado esperado                                                                                                                 | Cubre                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| V1  | `pnpm nx run-many -t lint test build -p nest-tools,nest-tools-app,nest-tools-app-e2e`                                                                                                                                                                                                                                                                    | Todo en verde, incluida `@nx/dependency-checks` (peers declarados y usados; los specs no cuentan porque `production` los excluye). | FR-1 a FR-9, NFR-1, NFR-3 |
| V2  | `pnpm nx run nest-tools-app-e2e:e2e`                                                                                                                                                                                                                                                                                                                     | e2e en verde.                                                                                                                      | FR-1, FR-2                |
| V3  | `node -p "const p=require('./dist/libs/nest-tools/package.json'); [p.peerDependencies, p.dependencies]"`                                                                                                                                                                                                                                                 | Las dos peers con `^11.0.0 \|\| ^12.0.0`, y `dependencies` solo con `tslib`.                                                       | NFR-3                     |
| V4  | `grep -rnE "(from \|import \|require\()['\"](express\|fastify)(/[^'\"]*)?['\"]" libs/nest-tools/src`                                                                                                                                                                                                                                                     | Sin coincidencias.                                                                                                                 | NFR-1 (principio 7)       |
| V5  | `npm pack` de `dist/libs/nest-tools` a un directorio temporal; allí, `npm install` del `.tgz` con `@nestjs/common@12`, `@nestjs/core@12`, `@nestjs/platform-express@12`, `reflect-metadata` y `rxjs`, y `node check.cjs` (CommonJS: arranca una app con `APP_FILTER` y una ruta que lanza `NotFoundException`, la pide con `fetch` e imprime el cuerpo). | La instalación no da conflicto de peers, y la respuesta es un 404 con los cinco campos.                                            | NFR-3, FR-1, FR-2         |
| V6  | `cd dist/libs/nest-tools && npm pack --dry-run`                                                                                                                                                                                                                                                                                                          | Solo `.js` y `.d.ts` de `src/` (incluidos los del filtro), `LICENSE`, `README.md` y `package.json`; sin specs ni `.map`.           | FR-7 y FR-8 de la 001     |
| V7  | Leer `libs/nest-tools/README.md`.                                                                                                                                                                                                                                                                                                                        | En inglés y con todos los puntos de FR-10.                                                                                         | FR-10                     |

## Cobertura de la spec

| Requisito | Dónde se cubre                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------- |
| FR-1      | `all-exceptions.filter.ts`, `index.ts`, integración (formas de activación), `index.spec.ts`, e2e, V5 |
| FR-2      | `exception-body.ts`, unitarios, integración, e2e, V5                                                 |
| FR-3      | `exception-body.ts`, unitarios, integración                                                          |
| FR-4      | `exception-body.ts`, unitarios                                                                       |
| FR-5      | `exception-log.ts`, filtro, unitarios, dobles, integración                                           |
| FR-6      | `exception-log.ts`, filtro, unitarios, dobles, integración                                           |
| FR-7      | `all-exceptions-filter.options.ts`, unitarios, dobles, integración                                   |
| FR-8      | `exception-log.ts`, unitarios, integración (`secret`)                                                |
| FR-9      | `all-exceptions.filter.ts`, dobles                                                                   |
| FR-10     | README, V7                                                                                           |
| NFR-1     | `HttpAdapterHost`, integración con `describe.each`, V4                                               |
| NFR-2     | Sin módulo y `Logger` en el constructor, test NFR-1 de la 001 ajustado                               |
| NFR-3     | `package.json`, V1, V3, V5                                                                           |
| NFR-4     | Revisión del diff en `/sdd-validate` (principio 7)                                                   |
