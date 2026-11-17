# @brickstodev/nest-tools

**English** | [Español](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.es.md) | [Français](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.fr.md) | [Italiano](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.it.md) | [Deutsch](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.de.md)

Small, opt-in utilities for [NestJS](https://nestjs.com) applications.

Each tool is imported and enabled explicitly: installing or importing the package does not change your application on its own, and it does not depend on a specific HTTP platform (Express or Fastify).

| Tool                                          | What it does                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`AllExceptionsFilter`](#allexceptionsfilter) | Gives every HTTP error the same response format, never shows internal details to the client and logs errors by severity. |

> **Status:** early development (0.x). Until 1.0.0, a breaking change bumps the minor version.

## Installation

```sh
npm install @brickstodev/nest-tools
```

```sh
pnpm add @brickstodev/nest-tools
```

## AllExceptionsFilter

An exception filter that catches every error of an HTTP request and:

- replies to all of them with the same body: `{ statusCode, message, error, path, timestamp }`;
- never sends the client a stack, a cause or the message of an unknown error;
- logs server errors (5xx) at `error` level with their stack, and client errors (4xx) at `warn` level.

### Enable it

Globally, letting Nest create the filter (recommended):

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

Globally, with the [option](#options), through a factory:

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

or in `main.ts`:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }));
```

On a controller or a single route, always with the default options:

```ts
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}
```

What each way covers:

| Registration                                | Errors it handles                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global (`APP_FILTER` or `useGlobalFilters`) | Route handlers with their guards, pipes and interceptors, plus missing routes, errors while reading the body (broken JSON, body too large) and middlewares. |
| `@UseFilters` on a controller or a route    | Only the route handler and its guards, pipes and interceptors. The option is not available.                                                                 |

### Response format

Every error is answered with its status code and this body:

| Field        | Value                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | The status code of the response.                                                                                                  |
| `message`    | The message of the error: a string, or a list (for example, validation errors).                                                   |
| `error`      | The text the developer gave the exception or, otherwise, the Node.js name of the status code (`Not Found`, `Payload Too Large`…). |
| `path`       | The request path, without the query string.                                                                                       |
| `timestamp`  | When the response was built, in ISO 8601 (UTC, with milliseconds).                                                                |

When Node.js has no name for a status code, `error` is `Client Error` (4xx) or `Server Error` (5xx).

**`HttpException` with a message.** `throw new NotFoundException('User not found')` on `GET /api/users/42?expand=true`:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Validation list.** `throw new BadRequestException(['email must be an email', 'name should not be empty'])` keeps the list unchanged:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Extra fields.** The other fields of an object body are kept after the five fields, except `stack` and `cause`; they never replace the five fields. `throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' })`:

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

If an object body has no `message` (or one that is not a string or a list), `message` is the name of the status code.

**Your own `error` text.** `throw new BadRequestException('Invalid email', { description: 'Invalid User' })` (or an `error` field in an object body):

```json
{
  "statusCode": 400,
  "message": "Invalid email",
  "error": "Invalid User",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

A 5xx `HttpException` also keeps your message: `throw new ServiceUnavailableException('Maintenance')` replies 503 with `"message": "Maintenance"`.

**External HTTP errors.** Errors that are not Nest exceptions but have a 4xx or 5xx `statusCode` and a boolean `expose`, like those created by [`http-errors`](https://www.npmjs.com/package/http-errors), keep their status code. Their message is shown only when `expose` is `true`; otherwise, `message` is the name of the status code. `error` is always the name of the status code. For example, a body above the Express limit:

```json
{
  "statusCode": 413,
  "message": "request entity too large",
  "error": "Payload Too Large",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Unknown errors.** Anything else gets a generic 500, without its message or any other data: an `Error` (even with a `statusCode`, if it has no boolean `expose`), a thrown string or object, or an `HttpException` with a status outside 400-599.

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

### Logging

The filter logs through the NestJS `Logger` with the context `AllExceptionsFilter`, so the lines go to the logger your application uses (for example, the one set with `app.useLogger()`).

| Status | Level   | Line                                                              | Trace                                                                          |
| ------ | ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 5xx    | `error` | `METHOD /path STATUS - message`, e.g. `GET /api/users 500 - boom` | The stack of the error and a `Caused by: <stack>` line for each chained cause. |
| 4xx    | `warn`  | `METHOD /path STATUS`, e.g. `GET /api/users/42 404`               | None.                                                                          |

- **5xx message:** the message of the response (a list is joined with `, `). For an unknown error, it is the original message: the message of an `Error`, the thrown string, or `Non-Error value of type <type>` for any other value, never its content. A thrown value without a stack is logged without a trace.
- **Causes in the trace:** a cause that is an `Error` is logged with its stack; a cause that is a string, as is; any other value, only by its type (`Caused by: Non-Error value of type <type>`), never its content.
- **One line per error:** line breaks in the message are replaced with spaces.
- **Response already sent:** if the error happens after the response started (for example, in a stream), the filter ends the response instead of replying again, and the line ends with `(response already sent)`.
- **Never logged:** the request body, headers and query string.

> **Warning:** the messages and stacks of 5xx errors end up in your logs, including the original message of unknown errors. Do not put personal data or secrets in error messages.

The response format, the `logClientErrors` option, and the level, context and data of each log are part of the public API: changing them in an incompatible way is a breaking change. The exact text of the log lines is not, and may change in any release.

### Options

| Option            | Type      | Default | Description                                                                                                           |
| ----------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `logClientErrors` | `boolean` | `true`  | Logs client errors (4xx) at `warn` level. `false` stops logging them; responses and the logging of 5xx do not change. |

The option is validated when the filter is created: a value that is not a boolean, such as `'false'` read from an environment variable, throws a `TypeError`:

```text
TypeError: AllExceptionsFilter: "logClientErrors" must be a boolean, received 'false' (string).
```

Convert environment variables yourself, for example `{ logClientErrors: process.env.LOG_CLIENT_ERRORS !== 'false' }`.

### GraphQL, WebSockets and microservices

- The filter only handles HTTP requests. In any other context it neither replies nor logs, and returns the error to NestJS unchanged, so GraphQL handles it as usual.
- `useGlobalFilters` does not reach WebSocket gateways, nor microservices connected with `connectMicroservice` unless they use `inheritAppConfig`.
- In applications with WebSockets or microservices, register the filter with `useGlobalFilters` and do not share it with `inheritAppConfig`. NestJS expects a microservice exception filter to return an `Observable`, and this filter returns the error unchanged: if it reaches a microservice context (for example, with `APP_FILTER` in a module that a microservice also loads, or shared through `inheritAppConfig`), the client would not get the usual NestJS RPC error.

### Express and Fastify

The filter works the same with both platforms: the same error gets the same status code, body and logs. Only the text of the errors that each platform creates changes, such as the message of a broken JSON body or of a body that is too large.

> **Note:** some messages generated by NestJS repeat part of the request in the response. The 404 of a missing route includes the query string (`Cannot GET /api/unknown?page=2`), and with Express the message of a broken JSON body can quote part of that body. They are 4xx messages, so they never reach the logs.

## Support policy

| Dependency | Supported versions |
| ---------- | ------------------ |
| NestJS     | 11 and 12          |
| Node.js    | 20 or later        |

NestJS 12 requires Node.js 20.19+ or 22.12+.

## License

[MIT](./LICENSE) © 2026 brickstodev
