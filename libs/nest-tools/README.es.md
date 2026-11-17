# @brickstodev/nest-tools

[English](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.md) | **Español** | [Français](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.fr.md) | [Italiano](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.it.md) | [Deutsch](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.de.md)

Utilidades pequeñas y opcionales para aplicaciones [NestJS](https://nestjs.com).

Cada herramienta se importa y se activa de forma explícita: instalar o importar el paquete no cambia tu aplicación por sí solo, y no depende de una plataforma HTTP concreta (Express o Fastify).

| Herramienta                                   | Qué hace                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AllExceptionsFilter`](#allexceptionsfilter) | Da a todos los errores HTTP el mismo formato de respuesta, nunca muestra detalles internos al cliente y registra los errores según su gravedad. |

> **Estado:** desarrollo inicial (0.x). Hasta la 1.0.0, un cambio que rompe la compatibilidad sube la versión minor.

## Instalación

```sh
npm install @brickstodev/nest-tools
```

```sh
pnpm add @brickstodev/nest-tools
```

## AllExceptionsFilter

Un filtro de excepciones que captura todos los errores de una petición HTTP y:

- responde a todos con el mismo cuerpo: `{ statusCode, message, error, path, timestamp }`;
- nunca envía al cliente un stack, una causa ni el mensaje de un error desconocido;
- registra los errores del servidor (5xx) con nivel `error` y su stack, y los errores del cliente (4xx) con nivel `warn`.

### Activarlo

De forma global, dejando que Nest cree el filtro (recomendado):

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

De forma global, con la [opción](#opciones), mediante una factory:

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useFactory: (host: HttpAdapterHost) => new AllExceptionsFilter(host, { logClientErrors: false }),
      inject: [HttpAdapterHost],
    },
  ],
})
export class AppModule {}
```

o en `main.ts`:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }));
```

En un controlador o en una sola ruta, siempre con las opciones por defecto:

```ts
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}
```

Qué cubre cada forma:

| Registro                                   | Errores que trata                                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Global (`APP_FILTER` o `useGlobalFilters`) | Los handlers de las rutas con sus guards, pipes e interceptores, además de las rutas inexistentes, los errores al leer el body (JSON roto, body demasiado grande) y los middlewares. |
| `@UseFilters` en un controlador o una ruta | Solo el handler de la ruta y sus guards, pipes e interceptores. La opción no está disponible.                                                                                        |

### Formato de respuesta

Cada error se responde con su código de estado y este cuerpo:

| Campo        | Valor                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | El código de estado de la respuesta.                                                                                                         |
| `message`    | El mensaje del error: un texto o una lista (por ejemplo, los errores de validación).                                                         |
| `error`      | El texto que el desarrollador dio a la excepción o, si no, el nombre que da Node.js al código de estado (`Not Found`, `Payload Too Large`…). |
| `path`       | La ruta de la petición, sin la query string.                                                                                                 |
| `timestamp`  | Cuándo se construyó la respuesta, en ISO 8601 (UTC, con milisegundos).                                                                       |

Cuando Node.js no tiene nombre para un código de estado, `error` es `Client Error` (4xx) o `Server Error` (5xx).

**`HttpException` con mensaje.** `throw new NotFoundException('User not found')` en `GET /api/users/42?expand=true`:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Lista de validación.** `throw new BadRequestException(['email must be an email', 'name should not be empty'])` mantiene la lista sin cambios:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Campos extra.** Los demás campos de un cuerpo de tipo objeto se mantienen después de los cinco campos, salvo `stack` y `cause`; nunca sustituyen a esos cinco campos. `throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' })`:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z",
  "code": "USER_NOT_FOUND"
}
```

Si un cuerpo de tipo objeto no tiene `message` (o tiene uno que no es un texto ni una lista), `message` es el nombre del código de estado.

**Tu propio texto en `error`.** `throw new BadRequestException('Invalid email', { description: 'Invalid User' })` (o un campo `error` en un cuerpo de tipo objeto):

```json
{
  "statusCode": 400,
  "message": "Invalid email",
  "error": "Invalid User",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

Una `HttpException` 5xx también mantiene tu mensaje: `throw new ServiceUnavailableException('Maintenance')` responde 503 con `"message": "Maintenance"`.

**Errores HTTP externos.** Los errores que no son excepciones de Nest pero tienen un `statusCode` 4xx o 5xx y un `expose` booleano, como los que crea [`http-errors`](https://www.npmjs.com/package/http-errors), mantienen su código de estado. Su mensaje solo se muestra cuando `expose` es `true`; si no, `message` es el nombre del código de estado. `error` es siempre el nombre del código de estado. Por ejemplo, un body que supera el límite de Express:

```json
{
  "statusCode": 413,
  "message": "request entity too large",
  "error": "Payload Too Large",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Errores desconocidos.** Todo lo demás recibe un 500 genérico, sin su mensaje ni ningún otro dato: un `Error` (aunque tenga un `statusCode`, si no tiene un `expose` booleano), un texto o un objeto lanzados, o una `HttpException` con un código fuera de 400-599.

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

### Logs

El filtro registra mediante el `Logger` de NestJS con el contexto `AllExceptionsFilter`, así que las líneas van al logger que use tu aplicación (por ejemplo, el que se configura con `app.useLogger()`).

| Código | Nivel   | Línea                                                               | Traza                                                                          |
| ------ | ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 5xx    | `error` | `METHOD /path STATUS - message`, p. ej. `GET /api/users 500 - boom` | El stack del error y una línea `Caused by: <stack>` por cada causa encadenada. |
| 4xx    | `warn`  | `METHOD /path STATUS`, p. ej. `GET /api/users/42 404`               | Ninguna.                                                                       |

- **Mensaje de los 5xx:** el mensaje de la respuesta (una lista se une con `, `). Para un error desconocido, es el mensaje original: el mensaje de un `Error`, el texto lanzado o `Non-Error value of type <type>` para cualquier otro valor, nunca su contenido. Un valor lanzado sin stack se registra sin traza.
- **Causas en la traza:** una causa que es un `Error` se registra con su stack; una causa que es un texto, tal cual; cualquier otro valor, solo por su tipo (`Caused by: Non-Error value of type <type>`), nunca su contenido.
- **Una línea por error:** los saltos de línea del mensaje se sustituyen por espacios.
- **Respuesta ya enviada:** si el error ocurre después de que la respuesta haya empezado a enviarse (por ejemplo, en un stream), el filtro cierra la respuesta en lugar de responder otra vez, y la línea termina con `(response already sent)`.
- **Nunca se registran:** el body, las cabeceras ni la query string de la petición.

> **Aviso:** los mensajes y los stacks de los errores 5xx acaban en tus logs, incluido el mensaje original de los errores desconocidos. No pongas datos personales ni secretos en los mensajes de error.

El formato de respuesta, la opción `logClientErrors`, y el nivel, el contexto y los datos de cada log forman parte de la API pública: cambiarlos de forma incompatible es un cambio que rompe la compatibilidad. El texto exacto de las líneas de log no forma parte de ella y puede cambiar en cualquier versión.

### Opciones

| Opción            | Tipo      | Por defecto | Descripción                                                                                                                                |
| ----------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `logClientErrors` | `boolean` | `true`      | Registra los errores del cliente (4xx) con nivel `warn`. `false` deja de registrarlos; las respuestas y el registro de los 5xx no cambian. |

La opción se valida al crear el filtro: un valor que no sea booleano, como `'false'` leído de una variable de entorno, lanza un `TypeError`:

```text
TypeError: AllExceptionsFilter: "logClientErrors" must be a boolean, received 'false' (string).
```

Convierte tú las variables de entorno, por ejemplo `{ logClientErrors: process.env.LOG_CLIENT_ERRORS !== 'false' }`.

### GraphQL, WebSockets y microservicios

- El filtro solo trata peticiones HTTP. En cualquier otro contexto no responde ni registra, y devuelve el error a NestJS sin cambios, así que GraphQL lo trata como siempre.
- `useGlobalFilters` no llega a los gateways de WebSockets, ni a los microservicios conectados con `connectMicroservice` salvo que usen `inheritAppConfig`.
- En aplicaciones con WebSockets o microservicios, activa el filtro con `useGlobalFilters` y no lo compartas con `inheritAppConfig`. NestJS espera que un filtro de excepciones de microservicios devuelva un `Observable`, y este filtro devuelve el error sin cambios: si llega a un contexto de microservicio (por ejemplo, con `APP_FILTER` en un módulo que también carga un microservicio, o compartido mediante `inheritAppConfig`), el cliente no recibiría el error RPC habitual de NestJS.

### Express y Fastify

El filtro funciona igual con las dos plataformas: el mismo error recibe el mismo código de estado, el mismo cuerpo y los mismos logs. Solo cambia el texto de los errores que crea cada plataforma, como el mensaje de un body con JSON roto o de un body demasiado grande.

> **Nota:** algunos mensajes que genera NestJS repiten parte de la petición en la respuesta. El 404 de una ruta inexistente incluye la query string (`Cannot GET /api/unknown?page=2`), y con Express el mensaje de un body con JSON roto puede citar parte de ese body. Son mensajes 4xx, así que nunca llegan a los logs.

## Política de soporte

| Dependencia | Versiones soportadas |
| ----------- | -------------------- |
| NestJS      | 11 y 12              |
| Node.js     | 20 o posterior       |

NestJS 12 requiere Node.js 20.19+ o 22.12+.

## Licencia

[MIT](./LICENSE) © 2026 brickstodev
