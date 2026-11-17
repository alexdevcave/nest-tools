# @brickstodev/nest-tools

[English](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.md) | [Español](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.es.md) | **Français** | [Italiano](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.it.md) | [Deutsch](https://github.com/brickstodev/nest-tools/blob/main/libs/nest-tools/README.de.md)

Petits utilitaires optionnels pour les applications [NestJS](https://nestjs.com).

Chaque outil s'importe et s'active explicitement : installer ou importer le paquet ne modifie pas votre application à lui seul, et il ne dépend d'aucune plateforme HTTP particulière (Express ou Fastify).

| Outil                                         | Ce qu'il fait                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AllExceptionsFilter`](#allexceptionsfilter) | Donne à toutes les erreurs HTTP le même format de réponse, ne montre jamais de détails internes au client et journalise les erreurs selon leur gravité. |

> **Statut :** développement initial (0.x). Jusqu'à la 1.0.0, un changement incompatible incrémente la version mineure.

## Installation

```sh
npm install @brickstodev/nest-tools
```

```sh
pnpm add @brickstodev/nest-tools
```

## AllExceptionsFilter

Un filtre d'exceptions qui intercepte toutes les erreurs d'une requête HTTP et :

- leur répond à toutes avec le même corps : `{ statusCode, message, error, path, timestamp }` ;
- n'envoie jamais au client une stack, une cause ou le message d'une erreur inconnue ;
- journalise les erreurs serveur (5xx) au niveau `error` avec leur stack, et les erreurs client (4xx) au niveau `warn`.

### L'activer

Globalement, en laissant Nest créer le filtre (recommandé) :

```ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '@brickstodev/nest-tools';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

Globalement, avec l'[option](#options), via une factory :

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

ou dans `main.ts` :

```ts
const app = await NestFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost), { logClientErrors: false }));
```

Sur un contrôleur ou une seule route, toujours avec les options par défaut :

```ts
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UsersController {}
```

Ce que couvre chaque méthode :

| Enregistrement                               | Erreurs traitées                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global (`APP_FILTER` ou `useGlobalFilters`)  | Les handlers de route avec leurs guards, pipes et interceptors, ainsi que les routes inexistantes, les erreurs de lecture du body (JSON invalide, body trop volumineux) et les middlewares. |
| `@UseFilters` sur un contrôleur ou une route | Uniquement le handler de la route et ses guards, pipes et interceptors. L'option n'est pas disponible.                                                                                      |

### Format de réponse

Chaque erreur reçoit une réponse avec son code de statut et ce corps :

| Champ        | Valeur                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | Le code de statut de la réponse.                                                                                                    |
| `message`    | Le message de l'erreur : une chaîne ou une liste (par exemple, les erreurs de validation).                                          |
| `error`      | Le texte donné à l'exception par le développeur ou, à défaut, le nom Node.js du code de statut (`Not Found`, `Payload Too Large`…). |
| `path`       | Le chemin de la requête, sans la query string.                                                                                      |
| `timestamp`  | Le moment où la réponse a été construite, en ISO 8601 (UTC, avec millisecondes).                                                    |

Lorsque Node.js n'a pas de nom pour un code de statut, `error` vaut `Client Error` (4xx) ou `Server Error` (5xx).

**`HttpException` avec un message.** `throw new NotFoundException('User not found')` sur `GET /api/users/42?expand=true` :

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "path": "/api/users/42",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Liste de validation.** `throw new BadRequestException(['email must be an email', 'name should not be empty'])` conserve la liste telle quelle :

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Champs supplémentaires.** Les autres champs d'un corps objet sont conservés après les cinq champs, sauf `stack` et `cause` ; ils ne remplacent jamais ces cinq champs. `throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' })` :

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

Si un corps objet n'a pas de `message` (ou en a un qui n'est ni une chaîne ni une liste), `message` est le nom du code de statut.

**Votre propre texte dans `error`.** `throw new BadRequestException('Invalid email', { description: 'Invalid User' })` (ou un champ `error` dans un corps objet) :

```json
{
  "statusCode": 400,
  "message": "Invalid email",
  "error": "Invalid User",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

Une `HttpException` 5xx conserve aussi votre message : `throw new ServiceUnavailableException('Maintenance')` répond 503 avec `"message": "Maintenance"`.

**Erreurs HTTP externes.** Les erreurs qui ne sont pas des exceptions Nest mais qui ont un `statusCode` 4xx ou 5xx et un `expose` booléen, comme celles créées par [`http-errors`](https://www.npmjs.com/package/http-errors), conservent leur code de statut. Leur message n'est affiché que si `expose` vaut `true` ; sinon, `message` est le nom du code de statut. `error` est toujours le nom du code de statut. Par exemple, un body qui dépasse la limite d'Express :

```json
{
  "statusCode": 413,
  "message": "request entity too large",
  "error": "Payload Too Large",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

**Erreurs inconnues.** Tout le reste reçoit une erreur 500 générique, sans son message ni aucune autre donnée : une `Error` (même avec un `statusCode`, si elle n'a pas d'`expose` booléen), une chaîne ou un objet levés, ou une `HttpException` avec un statut hors de 400-599.

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "path": "/api/users",
  "timestamp": "2026-11-15T10:30:00.000Z"
}
```

### Journalisation

Le filtre journalise via le `Logger` de NestJS avec le contexte `AllExceptionsFilter`, de sorte que les lignes vont au logger utilisé par votre application (par exemple, celui défini avec `app.useLogger()`).

| Statut | Niveau  | Ligne                                                               | Trace                                                                             |
| ------ | ------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 5xx    | `error` | `METHOD /path STATUS - message`, p. ex. `GET /api/users 500 - boom` | La stack de l'erreur et une ligne `Caused by: <stack>` pour chaque cause chaînée. |
| 4xx    | `warn`  | `METHOD /path STATUS`, p. ex. `GET /api/users/42 404`               | Aucune.                                                                           |

- **Message des 5xx :** le message de la réponse (une liste est jointe avec `, `). Pour une erreur inconnue, c'est le message d'origine : le message d'une `Error`, la chaîne levée ou `Non-Error value of type <type>` pour toute autre valeur, jamais son contenu. Une valeur levée sans stack est journalisée sans trace.
- **Causes dans la trace :** une cause qui est une `Error` est journalisée avec sa stack ; une cause qui est une chaîne, telle quelle ; toute autre valeur, uniquement par son type (`Caused by: Non-Error value of type <type>`), jamais son contenu.
- **Une ligne par erreur :** les sauts de ligne du message sont remplacés par des espaces.
- **Réponse déjà envoyée :** si l'erreur survient après le début de l'envoi de la réponse (par exemple, dans un stream), le filtre termine la réponse au lieu de répondre à nouveau, et la ligne se termine par `(response already sent)`.
- **Jamais journalisés :** le body, les en-têtes et la query string de la requête.

> **Attention :** les messages et les stacks des erreurs 5xx finissent dans vos logs, y compris le message d'origine des erreurs inconnues. Ne mettez ni données personnelles ni secrets dans les messages d'erreur.

Le format de réponse, l'option `logClientErrors`, ainsi que le niveau, le contexte et les données de chaque log font partie de l'API publique : les modifier de manière incompatible constitue un changement incompatible (breaking change). Le texte exact des lignes de log n'en fait pas partie et peut changer dans n'importe quelle version.

### Options

| Option            | Type      | Par défaut | Description                                                                                                                                          |
| ----------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logClientErrors` | `boolean` | `true`     | Journalise les erreurs client (4xx) au niveau `warn`. `false` arrête de les journaliser ; les réponses et la journalisation des 5xx ne changent pas. |

L'option est validée à la création du filtre : une valeur qui n'est pas un booléen, comme `'false'` lu depuis une variable d'environnement, lève une `TypeError` :

```text
TypeError: AllExceptionsFilter: "logClientErrors" must be a boolean, received 'false' (string).
```

Convertissez vous-même les variables d'environnement, par exemple `{ logClientErrors: process.env.LOG_CLIENT_ERRORS !== 'false' }`.

### GraphQL, WebSockets et microservices

- Le filtre ne traite que les requêtes HTTP. Dans tout autre contexte, il ne répond pas, ne journalise rien et renvoie l'erreur à NestJS sans modification, de sorte que GraphQL la traite comme d'habitude.
- `useGlobalFilters` n'atteint pas les gateways WebSocket, ni les microservices connectés avec `connectMicroservice`, sauf s'ils utilisent `inheritAppConfig`.
- Dans les applications avec WebSockets ou microservices, enregistrez le filtre avec `useGlobalFilters` et ne le partagez pas avec `inheritAppConfig`. NestJS attend d'un filtre d'exceptions de microservice qu'il renvoie un `Observable`, et ce filtre renvoie l'erreur sans modification : s'il atteint un contexte de microservice (par exemple, avec `APP_FILTER` dans un module qu'un microservice charge aussi, ou partagé via `inheritAppConfig`), le client ne recevrait pas l'erreur RPC habituelle de NestJS.

### Express et Fastify

Le filtre fonctionne de la même manière avec les deux plateformes : la même erreur reçoit le même code de statut, le même corps et les mêmes logs. Seul change le texte des erreurs créées par chaque plateforme, comme le message d'un body JSON invalide ou d'un body trop volumineux.

> **Remarque :** certains messages générés par NestJS reprennent une partie de la requête dans la réponse. La 404 d'une route inexistante inclut la query string (`Cannot GET /api/unknown?page=2`), et avec Express le message d'un body JSON invalide peut citer une partie de ce body. Ce sont des messages 4xx, ils n'arrivent donc jamais dans les logs.

## Politique de support

| Dépendance | Versions prises en charge |
| ---------- | ------------------------- |
| NestJS     | 11 et 12                  |
| Node.js    | 20 ou ultérieure          |

NestJS 12 nécessite Node.js 20.19+ ou 22.12+.

## Licence

[MIT](./LICENSE) © 2026 brickstodev
