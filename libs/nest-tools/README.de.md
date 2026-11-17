# @brickstodev/nest-tools

[English](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.md) | [Español](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.es.md) | [Français](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.fr.md) | [Italiano](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.it.md) | **Deutsch**

Kleine, optionale Hilfsmittel für [NestJS](https://nestjs.com)-Anwendungen.

Jedes Tool wird explizit importiert und aktiviert: Das Installieren oder Importieren des Pakets verändert deine Anwendung nicht von selbst, und es hängt von keiner bestimmten HTTP-Plattform ab (Express oder Fastify).

| Tool                                          | Was es tut                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`AllExceptionsFilter`](#allexceptionsfilter) | Gibt allen HTTP-Fehlern dasselbe Antwortformat, zeigt dem Client nie interne Details und protokolliert Fehler nach ihrem Schweregrad. |

> **Status:** frühe Entwicklung (0.x). Bis 1.0.0 erhöht eine inkompatible Änderung die Minor-Version.

## Installation

```sh
npm install @brickstodev/nest-tools
```

```sh
pnpm add @brickstodev/nest-tools
```

## AllExceptionsFilter

Ein Exception-Filter, der jeden Fehler einer HTTP-Anfrage abfängt und:

- auf alle mit demselben Body antwortet: `{ statusCode, message, error, path, timestamp }`;
- dem Client nie einen Stack, eine Ursache oder die Meldung eines unbekannten Fehlers sendet;
- Serverfehler (5xx) mit Level `error` samt Stack protokolliert und Clientfehler (4xx) mit Level `warn`.

### Aktivieren

Global, wobei Nest den Filter erstellt (empfohlen):

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

Global, mit der [Option](#optionen), über eine Factory:

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

oder in `main.ts`:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }));
```

Auf einem Controller oder einer einzelnen Route, immer mit den Standardoptionen:

```ts
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}
```

Was jede Variante abdeckt:

| Registrierung                                       | Behandelte Fehler                                                                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global (`APP_FILTER` oder `useGlobalFilters`)       | Route-Handler mit ihren Guards, Pipes und Interceptors, außerdem nicht vorhandene Routen, Fehler beim Lesen des Bodys (fehlerhaftes JSON, zu großer Body) und Middlewares. |
| `@UseFilters` auf einem Controller oder einer Route | Nur der Route-Handler und seine Guards, Pipes und Interceptors. Die Option ist nicht verfügbar.                                                                            |

### Antwortformat

Jeder Fehler wird mit seinem Statuscode und diesem Body beantwortet:

| Feld         | Wert                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | Der Statuscode der Antwort.                                                                                                                    |
| `message`    | Die Meldung des Fehlers: ein String oder eine Liste (zum Beispiel Validierungsfehler).                                                         |
| `error`      | Der Text, den der Entwickler der Exception gegeben hat, oder andernfalls der Node.js-Name des Statuscodes (`Not Found`, `Payload Too Large`…). |
| `path`       | Der Pfad der Anfrage, ohne Query-String.                                                                                                       |
| `timestamp`  | Wann die Antwort erstellt wurde, in ISO 8601 (UTC, mit Millisekunden).                                                                         |

Wenn Node.js für einen Statuscode keinen Namen hat, ist `error` `Client Error` (4xx) oder `Server Error` (5xx).

**`HttpException` mit Meldung.** `throw new NotFoundException('User not found')` bei `GET /api/users/42?expand=true`:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Validierungsliste.** `throw new BadRequestException(['email must be an email', 'name should not be empty'])` behält die Liste unverändert bei:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Zusätzliche Felder.** Die übrigen Felder eines Objekt-Bodys bleiben nach den fünf Feldern erhalten, außer `stack` und `cause`; sie ersetzen nie diese fünf Felder. `throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' })`:

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

Hat ein Objekt-Body keine `message` (oder eine, die weder ein String noch eine Liste ist), ist `message` der Name des Statuscodes.

**Dein eigener `error`-Text.** `throw new BadRequestException('Invalid email', { description: 'Invalid User' })` (oder ein `error`-Feld in einem Objekt-Body):

```json
{
  "statusCode": 400,
  "message": "Invalid email",
  "error": "Invalid User",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

Auch eine 5xx-`HttpException` behält deine Meldung: `throw new ServiceUnavailableException('Maintenance')` antwortet mit 503 und `"message": "Maintenance"`.

**Externe HTTP-Fehler.** Fehler, die keine Nest-Exceptions sind, aber einen 4xx- oder 5xx-`statusCode` und ein boolesches `expose` haben, wie die von [`http-errors`](https://www.npmjs.com/package/http-errors) erzeugten, behalten ihren Statuscode. Ihre Meldung wird nur angezeigt, wenn `expose` `true` ist; andernfalls ist `message` der Name des Statuscodes. `error` ist immer der Name des Statuscodes. Zum Beispiel ein Body über dem Express-Limit:

```json
{
  "statusCode": 413,
  "message": "request entity too large",
  "error": "Payload Too Large",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Unbekannte Fehler.** Alles andere erhält eine generische 500, ohne Meldung oder sonstige Daten: ein `Error` (auch mit `statusCode`, wenn er kein boolesches `expose` hat), ein geworfener String oder ein geworfenes Objekt oder eine `HttpException` mit einem Status außerhalb von 400-599.

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

Der Filter protokolliert über den NestJS-`Logger` mit dem Kontext `AllExceptionsFilter`, sodass die Zeilen an den Logger gehen, den deine Anwendung verwendet (zum Beispiel den mit `app.useLogger()` gesetzten).

| Status | Level   | Zeile                                                              | Trace                                                                                  |
| ------ | ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 5xx    | `error` | `METHOD /path STATUS - message`, z. B. `GET /api/users 500 - boom` | Der Stack des Fehlers und eine Zeile `Caused by: <stack>` für jede verkettete Ursache. |
| 4xx    | `warn`  | `METHOD /path STATUS`, z. B. `GET /api/users/42 404`               | Keiner.                                                                                |

- **5xx-Meldung:** die Meldung der Antwort (eine Liste wird mit `, ` verbunden). Bei einem unbekannten Fehler ist es die ursprüngliche Meldung: die Meldung eines `Error`, der geworfene String oder `Non-Error value of type <type>` für jeden anderen Wert, nie dessen Inhalt. Ein geworfener Wert ohne Stack wird ohne Trace protokolliert.
- **Ursachen im Trace:** Eine Ursache, die ein `Error` ist, wird mit ihrem Stack protokolliert; eine Ursache, die ein String ist, unverändert; jeder andere Wert nur mit seinem Typ (`Caused by: Non-Error value of type <type>`), nie mit seinem Inhalt.
- **Eine Zeile pro Fehler:** Zeilenumbrüche in der Meldung werden durch Leerzeichen ersetzt.
- **Antwort bereits gesendet:** Tritt der Fehler auf, nachdem das Senden der Antwort begonnen hat (zum Beispiel in einem Stream), beendet der Filter die Antwort, statt erneut zu antworten, und die Zeile endet mit `(response already sent)`.
- **Nie protokolliert:** Body, Header und Query-String der Anfrage.

> **Warnung:** Die Meldungen und Stacks von 5xx-Fehlern landen in deinen Logs, einschließlich der ursprünglichen Meldung unbekannter Fehler. Schreibe keine personenbezogenen Daten oder Geheimnisse in Fehlermeldungen.

Das Antwortformat, die Option `logClientErrors` sowie Level, Kontext und Daten jedes Logs gehören zur öffentlichen API: Sie inkompatibel zu ändern ist ein Breaking Change. Der genaue Text der Logzeilen gehört nicht dazu und kann sich in jedem Release ändern.

### Optionen

| Option            | Typ       | Standard | Beschreibung                                                                                                                                              |
| ----------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logClientErrors` | `boolean` | `true`   | Protokolliert Clientfehler (4xx) mit Level `warn`. `false` beendet ihre Protokollierung; die Antworten und die Protokollierung der 5xx ändern sich nicht. |

Die Option wird beim Erstellen des Filters validiert: Ein Wert, der kein Boolean ist, etwa `'false'` aus einer Umgebungsvariable, wirft einen `TypeError`:

```text
TypeError: AllExceptionsFilter: "logClientErrors" must be a boolean, received 'false' (string).
```

Wandle Umgebungsvariablen selbst um, zum Beispiel `{ logClientErrors: process.env.LOG_CLIENT_ERRORS !== 'false' }`.

### GraphQL, WebSockets und Microservices

- Der Filter behandelt nur HTTP-Anfragen. In jedem anderen Kontext antwortet er nicht, protokolliert nichts und gibt den Fehler unverändert an NestJS zurück, sodass GraphQL ihn wie gewohnt behandelt.
- `useGlobalFilters` erreicht weder WebSocket-Gateways noch mit `connectMicroservice` verbundene Microservices, es sei denn, sie verwenden `inheritAppConfig`.
- Registriere den Filter in Anwendungen mit WebSockets oder Microservices mit `useGlobalFilters` und teile ihn nicht mit `inheritAppConfig`. NestJS erwartet, dass ein Exception-Filter für Microservices ein `Observable` zurückgibt, und dieser Filter gibt den Fehler unverändert zurück: Erreicht er einen Microservice-Kontext (zum Beispiel mit `APP_FILTER` in einem Modul, das auch ein Microservice lädt, oder über `inheritAppConfig` geteilt), würde der Client nicht den üblichen RPC-Fehler von NestJS erhalten.

### Express und Fastify

Der Filter verhält sich mit beiden Plattformen gleich: Derselbe Fehler erhält denselben Statuscode, denselben Body und dieselben Logs. Nur der Text der Fehler, die jede Plattform selbst erzeugt, ändert sich, etwa die Meldung eines fehlerhaften JSON-Bodys oder eines zu großen Bodys.

> **Hinweis:** Einige von NestJS erzeugte Meldungen wiederholen einen Teil der Anfrage in der Antwort. Der 404 einer nicht vorhandenen Route enthält den Query-String (`Cannot GET /api/unknown?page=2`), und mit Express kann die Meldung eines fehlerhaften JSON-Bodys einen Teil dieses Bodys zitieren. Es sind 4xx-Meldungen, daher landen sie nie in den Logs.

## Support-Richtlinie

| Abhängigkeit | Unterstützte Versionen |
| ------------ | ---------------------- |
| NestJS       | 11 und 12              |
| Node.js      | 20 oder neuer          |

NestJS 12 erfordert Node.js 20.19+ oder 22.12+.

## Lizenz

[MIT](./LICENSE) © 2026 brickstodev
