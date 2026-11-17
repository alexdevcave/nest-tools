# @brickstodev/nest-tools

[English](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.md) | [Español](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.es.md) | [Français](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.fr.md) | **Italiano** | [Deutsch](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.de.md)

Piccole utility opzionali per applicazioni [NestJS](https://nestjs.com).

Ogni strumento si importa e si attiva in modo esplicito: installare o importare il pacchetto non modifica da solo la tua applicazione, e non dipende da una piattaforma HTTP specifica (Express o Fastify).

| Strumento                                     | Cosa fa                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AllExceptionsFilter`](#allexceptionsfilter) | Dà a tutti gli errori HTTP lo stesso formato di risposta, non mostra mai dettagli interni al client e registra gli errori in base alla loro gravità. |

> **Stato:** sviluppo iniziale (0.x). Fino alla 1.0.0, una modifica incompatibile incrementa la versione minor.

## Installazione

```sh
npm install @brickstodev/nest-tools
```

```sh
pnpm add @brickstodev/nest-tools
```

## AllExceptionsFilter

Un filtro di eccezioni che intercetta tutti gli errori di una richiesta HTTP e:

- risponde a tutti con lo stesso corpo: `{ statusCode, message, error, path, timestamp }`;
- non invia mai al client uno stack, una causa o il messaggio di un errore sconosciuto;
- registra gli errori del server (5xx) con livello `error` insieme al loro stack, e gli errori del client (4xx) con livello `warn`.

### Attivarlo

A livello globale, lasciando che Nest crei il filtro (consigliato):

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

A livello globale, con l'[opzione](#opzioni), tramite una factory:

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

oppure in `main.ts`:

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }));
```

Su un controller o su una singola route, sempre con le opzioni predefinite:

```ts
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}
```

Cosa copre ciascun modo:

| Attivazione                                 | Errori gestiti                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Globale (`APP_FILTER` o `useGlobalFilters`) | Gli handler delle route con i loro guard, pipe e interceptor, oltre alle route inesistenti, agli errori durante la lettura del body (JSON non valido, body troppo grande) e ai middleware. |
| `@UseFilters` su un controller o una route  | Solo l'handler della route e i suoi guard, pipe e interceptor. L'opzione non è disponibile.                                                                                                |

### Formato della risposta

Ogni errore riceve una risposta con il suo codice di stato e questo corpo:

| Campo        | Valore                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `statusCode` | Il codice di stato della risposta.                                                                                                               |
| `message`    | Il messaggio dell'errore: una stringa o una lista (per esempio, gli errori di validazione).                                                      |
| `error`      | Il testo che lo sviluppatore ha dato all'eccezione oppure, in mancanza, il nome Node.js del codice di stato (`Not Found`, `Payload Too Large`…). |
| `path`       | Il percorso della richiesta, senza la query string.                                                                                              |
| `timestamp`  | Il momento in cui è stata costruita la risposta, in ISO 8601 (UTC, con millisecondi).                                                            |

Quando Node.js non ha un nome per un codice di stato, `error` è `Client Error` (4xx) o `Server Error` (5xx).

**`HttpException` con un messaggio.** `throw new NotFoundException('User not found')` su `GET /api/users/42?expand=true`:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Lista di validazione.** `throw new BadRequestException(['email must be an email', 'name should not be empty'])` mantiene la lista invariata:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Campi aggiuntivi.** Gli altri campi di un corpo di tipo oggetto vengono mantenuti dopo i cinque campi, tranne `stack` e `cause`; non sostituiscono mai questi cinque campi. `throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' })`:

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

Se un corpo di tipo oggetto non ha `message` (o ne ha uno che non è né una stringa né una lista), `message` è il nome del codice di stato.

**Il tuo testo in `error`.** `throw new BadRequestException('Invalid email', { description: 'Invalid User' })` (o un campo `error` in un corpo di tipo oggetto):

```json
{
  "statusCode": 400,
  "message": "Invalid email",
  "error": "Invalid User",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

Anche una `HttpException` 5xx mantiene il tuo messaggio: `throw new ServiceUnavailableException('Maintenance')` risponde 503 con `"message": "Maintenance"`.

**Errori HTTP esterni.** Gli errori che non sono eccezioni di Nest ma hanno uno `statusCode` 4xx o 5xx e un `expose` booleano, come quelli creati da [`http-errors`](https://www.npmjs.com/package/http-errors), mantengono il loro codice di stato. Il loro messaggio viene mostrato solo quando `expose` è `true`; altrimenti, `message` è il nome del codice di stato. `error` è sempre il nome del codice di stato. Per esempio, un body oltre il limite di Express:

```json
{
  "statusCode": 413,
  "message": "request entity too large",
  "error": "Payload Too Large",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Errori sconosciuti.** Tutto il resto riceve un 500 generico, senza il suo messaggio né altri dati: un `Error` (anche con uno `statusCode`, se non ha un `expose` booleano), una stringa o un oggetto lanciati, oppure una `HttpException` con uno stato al di fuori di 400-599.

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

### Log

Il filtro registra tramite il `Logger` di NestJS con il contesto `AllExceptionsFilter`, quindi le righe finiscono nel logger usato dalla tua applicazione (per esempio, quello impostato con `app.useLogger()`).

| Stato | Livello | Riga                                                                | Traccia                                                                          |
| ----- | ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 5xx   | `error` | `METHOD /path STATUS - message`, ad es. `GET /api/users 500 - boom` | Lo stack dell'errore e una riga `Caused by: <stack>` per ogni causa concatenata. |
| 4xx   | `warn`  | `METHOD /path STATUS`, ad es. `GET /api/users/42 404`               | Nessuna.                                                                         |

- **Messaggio dei 5xx:** il messaggio della risposta (una lista viene unita con `, `). Per un errore sconosciuto, è il messaggio originale: il messaggio di un `Error`, la stringa lanciata oppure `Non-Error value of type <type>` per qualsiasi altro valore, mai il suo contenuto. Un valore lanciato senza stack viene registrato senza traccia.
- **Cause nella traccia:** una causa che è un `Error` viene registrata con il suo stack; una causa che è una stringa, così com'è; qualsiasi altro valore, solo con il suo tipo (`Caused by: Non-Error value of type <type>`), mai il suo contenuto.
- **Una riga per errore:** gli a capo nel messaggio vengono sostituiti da spazi.
- **Risposta già inviata:** se l'errore si verifica dopo che la risposta ha iniziato a essere inviata (per esempio, in uno stream), il filtro chiude la risposta invece di rispondere di nuovo, e la riga termina con `(response already sent)`.
- **Mai registrati:** il body, gli header e la query string della richiesta.

> **Attenzione:** i messaggi e gli stack degli errori 5xx finiscono nei tuoi log, compreso il messaggio originale degli errori sconosciuti. Non inserire dati personali o segreti nei messaggi di errore.

Il formato della risposta, l'opzione `logClientErrors`, e il livello, il contesto e i dati di ogni log fanno parte dell'API pubblica: modificarli in modo incompatibile è una modifica incompatibile (breaking change). Il testo esatto delle righe di log non ne fa parte e può cambiare in qualsiasi release.

### Opzioni

| Opzione           | Tipo      | Predefinito | Descrizione                                                                                                                                  |
| ----------------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `logClientErrors` | `boolean` | `true`      | Registra gli errori del client (4xx) con livello `warn`. `false` smette di registrarli; le risposte e la registrazione dei 5xx non cambiano. |

L'opzione viene validata alla creazione del filtro: un valore che non è un booleano, come `'false'` letto da una variabile d'ambiente, lancia un `TypeError`:

```text
TypeError: AllExceptionsFilter: "logClientErrors" must be a boolean, received 'false' (string).
```

Converti tu le variabili d'ambiente, per esempio `{ logClientErrors: process.env.LOG_CLIENT_ERRORS !== 'false' }`.

### GraphQL, WebSocket e microservizi

- Il filtro gestisce solo le richieste HTTP. In qualsiasi altro contesto non risponde né registra, e restituisce l'errore a NestJS invariato, così GraphQL lo gestisce come di consueto.
- `useGlobalFilters` non raggiunge i gateway WebSocket, né i microservizi collegati con `connectMicroservice` a meno che non usino `inheritAppConfig`.
- Nelle applicazioni con WebSocket o microservizi, attiva il filtro con `useGlobalFilters` e non condividerlo con `inheritAppConfig`. NestJS si aspetta che un filtro di eccezioni per microservizi restituisca un `Observable`, e questo filtro restituisce l'errore invariato: se raggiunge un contesto di microservizio (per esempio, con `APP_FILTER` in un modulo caricato anche da un microservizio, o condiviso tramite `inheritAppConfig`), il client non riceverebbe il consueto errore RPC di NestJS.

### Express e Fastify

Il filtro funziona allo stesso modo con entrambe le piattaforme: lo stesso errore riceve lo stesso codice di stato, lo stesso corpo e gli stessi log. Cambia solo il testo degli errori creati da ciascuna piattaforma, come il messaggio di un body JSON non valido o di un body troppo grande.

> **Nota:** alcuni messaggi generati da NestJS ripetono parte della richiesta nella risposta. Il 404 di una route inesistente include la query string (`Cannot GET /api/unknown?page=2`), e con Express il messaggio di un body JSON non valido può citare parte di quel body. Sono messaggi 4xx, quindi non arrivano mai nei log.

## Politica di supporto

| Dipendenza | Versioni supportate |
| ---------- | ------------------- |
| NestJS     | 11 e 12             |
| Node.js    | 20 o successiva     |

NestJS 12 richiede Node.js 20.19+ o 22.12+.

## Licenza

[MIT](./LICENSE) © 2026 brickstodev
