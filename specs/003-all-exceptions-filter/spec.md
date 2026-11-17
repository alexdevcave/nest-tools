# Spec 003 — Filtro de excepciones para todas las peticiones HTTP

Status: implemented

## Contexto y objetivo

Por defecto, NestJS responde a las excepciones HTTP con `{ statusCode, message, error }`, pero no dice en qué ruta ni cuándo ocurrió el error, y cada proyecto acaba escribiendo su propio filtro para unificar respuestas y logs. Es la primera herramienta de `@brickstodev/nest-tools`.

El objetivo es un filtro listo para usar que dé a todos los errores HTTP un formato uniforme y reconocible en Nest, que nunca exponga detalles internos (principio 5) y que registre los errores con un nivel según su gravedad, sin tratar los errores de fuera de HTTP. Tiene una única opción, para no registrar los errores de cliente.

Depende de dos cambios previos en la spec 001: su NFR-1 («sin efectos al importar») pasa a cubrir solo el código propio de la librería, porque NestJS lee una variable de entorno al cargarse y el filtro necesita importarlo; y su política de soporte pasa de NestJS 10 y 11 a NestJS 11 y 12, porque la 12 es la versión actual y la 10 ya no recibe cambios.

Para comprobar la NFR-1 de esta spec, el workspace necesita la plataforma Fastify de NestJS como dependencia de desarrollo (principio 1); no forma parte del paquete publicado.

Cambiada el 2026-11-15 para añadir la demostración del filtro en la app de pruebas (principio 4).

## Usuarios

- **Desarrollador:** activa el filtro en su aplicación NestJS.
- **Cliente de la API:** recibe las respuestas de error.
- **Operador:** lee los logs de la aplicación.

## Historias de usuario

- US-1. Como desarrollador, quiero que todos los errores HTTP de mi API respondan con el mismo formato, para que los clientes los traten de forma uniforme.
- US-2. Como desarrollador, quiero que los fallos inesperados no muestren detalles internos, para no filtrar información sensible.
- US-3. Como operador, quiero ver los fallos del servidor con su stack y los errores de cliente con menos prioridad, para diagnosticar sin ruido.
- US-4. Como desarrollador que ya registra las peticiones con otra herramienta, quiero dejar de registrar los errores de cliente, para evitar logs duplicados.
- US-5. Como desarrollador de una aplicación que también usa GraphQL, WebSockets o microservicios, quiero activar el filtro de forma global sin que trate los errores de fuera de HTTP.

## Definiciones

- **Petición HTTP:** una petición que NestJS atiende como HTTP (con Express o Fastify), aunque la ruta no exista o la respuesta vaya en streaming; las operaciones de GraphQL y los mensajes de WebSockets o microservicios no lo son, aunque viajen por HTTP.
- **Excepción HTTP:** una excepción HTTP de NestJS (o una subclase) con un código 4xx o 5xx; con cualquier otro código es un error desconocido.
- **Código del error:** el código con el que el filtro responde a un error, o con el que respondería si la respuesta no se hubiera empezado a enviar.
- **Mensaje de una excepción HTTP:** el `message` de su cuerpo si es un texto o una lista, o el cuerpo si es solo un texto; en cualquier otro caso, el nombre del código.
- **Error HTTP externo:** un error que no es de NestJS pero trae su propio código 4xx o 5xx y la marca de si su mensaje se puede mostrar al cliente, como los de Express al leer el body (por ejemplo, 413 si es demasiado grande). Su mensaje es el suyo si se puede mostrar y, si no, el nombre del código.
- **Error desconocido:** cualquier otro valor lanzado, sea un error de JavaScript o no (un texto, un objeto…), aunque traiga un código de estado.
- **Mensaje original de un error desconocido:** su mensaje si es un error de JavaScript, el propio texto si se lanzó un texto y, si es otro valor (un objeto, un número…), solo su tipo, nunca su contenido.
- **Ruta:** el path de la petición sin query string.
- **Marca de tiempo:** el momento de la respuesta en UTC, con el formato `2026-11-15T10:30:00.000Z` (ISO 8601 con milisegundos).
- **Nombre del código:** el nombre que da Node.js al código de estado (`Not Found`, `Payload Too Large`…), casi siempre el mismo que usan las excepciones de NestJS; si no tiene, `Client Error` para un 4xx y `Server Error` para un 5xx.
- **Registro de errores de cliente:** la opción del filtro que decide si se registran los 4xx; está activada por defecto.

## Requisitos funcionales

- FR-1: EL SISTEMA ofrece, desde el punto de entrada público, un filtro de excepciones que se activa con las formas estándar de NestJS, de forma global o en un controlador o ruta concretos: si lo crea NestJS no necesita nada, y si lo crea el desarrollador, solo el adaptador HTTP de la aplicación y, opcionalmente, la opción de FR-7.
- FR-2: CUANDO una petición HTTP termina con una excepción HTTP o un error HTTP externo, EL SISTEMA responde con su código de estado y el cuerpo `{ statusCode, message, error, path, timestamp }`, con su mensaje en `message` y, en `error`, el texto que le haya dado el desarrollador o, si no, el nombre del código; los demás campos del cuerpo propio de una excepción HTTP, salvo `stack` y `cause` (FR-4), se añaden sin cambios, sin sustituir nunca esos cinco.
- FR-3: CUANDO una petición HTTP termina con un error desconocido, EL SISTEMA responde 500 con `message` `Internal server error` y `error` `Internal Server Error`.
- FR-4: EL SISTEMA nunca incluye en la respuesta un stack ni una causa, tampoco como campos del cuerpo propio de una excepción HTTP, y de un error desconocido no incluye nada más que lo indicado en FR-3.
- FR-5: CUANDO el código del error es 5xx, EL SISTEMA lo registra con nivel `error` mediante el sistema de logs de NestJS, con el nombre del filtro como contexto y, en una sola línea, el método, la ruta, el código y el mensaje (el original si es un error desconocido); como traza, su stack y el de cada causa encadenada, sin repetir ninguna.
- FR-6: MIENTRAS el registro de errores de cliente esté activado, CUANDO el código del error es 4xx, EL SISTEMA lo registra con nivel `warn` mediante el sistema de logs de NestJS, con el nombre del filtro como contexto y, en una sola línea, el método, la ruta y el código, sin mensaje ni stack.
- FR-7: EL SISTEMA ofrece una única opción, de sí o no, para desactivar el registro de errores de cliente; desactivarla no cambia ninguna respuesta ni el registro de los 5xx, y un valor que no sea sí o no hace fallar la creación del filtro con un error que lo explica.
- FR-8: EL SISTEMA nunca registra el body, las cabeceras ni la query string de la petición.
- FR-9: SI el error no se produce en una petición HTTP, ENTONCES EL SISTEMA no responde ni lo registra, y devuelve el error a NestJS sin cambios.
- FR-10: EL SISTEMA documenta en el README del paquete, en inglés, cómo activar el filtro y qué errores cubre cada forma de activarlo, el formato de respuesta, qué registra con cada nivel, la opción disponible, que los mensajes de los errores 5xx acaban en los logs y cómo se comporta en aplicaciones con GraphQL, WebSockets o microservicios.

## Requisitos no funcionales

- NFR-1: Con las plataformas Express y Fastify de NestJS, y sin importarlas directamente, el filtro da ante el mismo error el mismo código, el mismo cuerpo y los mismos logs; solo pueden cambiar los textos de los errores que genera cada plataforma (por ejemplo, el de un body demasiado grande).
- NFR-2: Importar la librería no añade efectos secundarios propios (registrar providers o filtros globales, leer variables de entorno, arrancar temporizadores o escribir logs); lo que haga NestJS al cargarse no cuenta.
- NFR-3: El paquete declara como dependencias de pares los paquetes de NestJS que su código importa, aunque sea solo para tipos, con un rango que admite NestJS 11 y 12 y excluye la 13.
- NFR-4: El formato de respuesta, el nivel, el contexto y los datos de cada log, y la opción forman parte de la API pública: cambiarlos de forma incompatible sigue el principio 7. El texto exacto de las líneas de log no forma parte de ella.

## Casos límite

- Una excepción HTTP trae una lista de mensajes (por ejemplo, los errores de validación): `message` es esa lista, sin cambios (FR-2).
- Una excepción HTTP trae un cuerpo propio sin mensaje o con un mensaje que no es texto ni lista: `message` es el nombre del código (FR-2).
- Una excepción HTTP con código 5xx creada por el desarrollador (por ejemplo, un 503 con su texto): se responde con ese texto, porque lo eligió el desarrollador, y se registra como `error` (FR-2, FR-5).
- Se lanza un valor que no es un error de JavaScript: es un error desconocido, se responde 500 y se registra sin stack, con su mensaje original (FR-3, FR-5).
- La respuesta ya se había empezado a enviar cuando ocurre el error: el filtro no responde otra vez, cierra la respuesta para que el cliente no se quede esperando y registra el error según su código, indicando que la respuesta ya se había enviado (FR-5, FR-6).

## Fuera de alcance

- Formato y logs para microservicios, WebSockets y GraphQL: specs futuras, una por contexto.
- El formato Problem Details (RFC 9457) y los campos de respuesta configurables.
- Un logger propio u otras opciones de log distintas de FR-7.
- Identificadores de petición o de correlación en la respuesta o en los logs (herramienta futura).
- Traducir los mensajes y publicar el paquete (spec 002-release-process).

## Criterios de finalización

- Con el filtro activo, las excepciones HTTP, los errores HTTP externos y los errores desconocidos responden según FR-2 y FR-3, tanto activado de forma global como en un controlador o una ruta; las rutas inexistentes, los errores al leer el body y los de los middlewares solo los cubre la activación global.
- Ninguna respuesta incluye un stack ni una causa, tampoco los puestos en el cuerpo propio de una excepción HTTP, ni el mensaje de un error desconocido (FR-4).
- Los logs cumplen FR-5, FR-6 y FR-8, con el registro de errores de cliente activado y desactivado.
- Fuera de HTTP, el filtro no responde ni registra y devuelve el error sin cambios (FR-9).
- El README cumple FR-10, y la NFR-1 y la política de soporte de la spec 001 están ajustadas antes de implementar esta spec.
- La librería cumple los principios 3, 4, 5, 6 y 7 de la constitución, incluida la demostración del filtro en la app de pruebas (principio 4): una ruta por cada caso de la spec, comprobada con e2e y a mano.

## Preguntas abiertas

Ninguna.
