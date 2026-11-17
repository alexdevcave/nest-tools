# Spec 001 — Paquete publicable

Status: implemented

## Contexto y objetivo

La librería `@brickstodev/nest-tools` se va a publicar en npm para que la use cualquier proyecto NestJS. Hoy no está lista: declara NestJS como dependencia directa (lo que puede duplicar Nest en el proyecto que la instala), solo exporta un módulo vacío generado por Nx y no tiene metadatos públicos, licencia ni un README útil.

El objetivo es dejar la configuración del paquete lista para publicarse y conforme a los principios 4, 6 y 7 de la constitución. Esta spec no versiona ni publica: el proceso de release lo define la spec 002-release-process. Hasta la primera release el paquete conserva la marca de privado para que no se publique por accidente; la primera release la quita (FR-3). Esta spec retira el módulo vacío, deja vacía la API pública y deja que cada dependencia de pares la añada la spec de la herramienta que la use.

Cambiada el 2026-11-15 por la spec 003, que importa NestJS y exporta la primera herramienta: NFR-1 cubre solo el código propio de la librería (`@nestjs/common` lee una variable de entorno al cargarse), FR-5 admite los exports que añada la spec de cada herramienta, FR-1 cuenta también los imports de solo tipos (principio 7) y la política de soporte de FR-9 pasa de NestJS 10 y 11 a 11 y 12, con la versión de Node que exige la 12 (la 12 es `latest` en npm desde agosto de 2026 y la 10 no recibe cambios desde enero de 2026). El mismo día, FR-4 pasa a `https://github.com/brickstodev/nest-tools`, la nueva ubicación del repositorio, y FR-3 al nombre `@brickstodev/nest-tools`, antes de la primera publicación.

Cambiada el 2026-11-17 por la spec 002, que versiona y publica la librería: FR-3 conserva la marca de privado solo hasta la primera release, que la quita (FR-8 de la 002), y el registro de cambios de la librería, que crea la primera release y ahora se publica (FR-7 de la 002), deja de estar excluido del paquete (FR-8) y pasa a incluirse en él (FR-7). El mismo día, el autor y el copyright de FR-3 y FR-7 pasan a «brickstodev».

## Usuarios

- **Consumidor:** desarrollador que instala el paquete en su proyecto NestJS.
- **Mantenedor:** quien mantiene la librería y su paquete.

## Historias de usuario

- US-1. Como consumidor, quiero instalar el paquete sin que traiga su propia copia de Nest ni dependencias que no usa, para evitar conflictos de versiones.
- US-2. Como consumidor, quiero ver en npm qué es el paquete, su licencia, su repositorio, cómo instalarlo y qué versiones de NestJS y Node.js soporta, para decidir si lo uso.
- US-3. Como consumidor, quiero que el paquete incluya sus tipos de TypeScript, para tener autocompletado y comprobación de tipos.
- US-4. Como consumidor, quiero que importar el paquete no cambie el comportamiento de mi aplicación ni me ate a Express o Fastify, para adoptarlo sin riesgos.
- US-5. Como mantenedor, quiero que solo se pueda importar el punto de entrada público y que el paquete no lleve archivos de desarrollo, para cambiar la estructura interna sin romper a los consumidores.

## Definiciones

- **El paquete:** lo que se publicaría en npm, es decir, el contenido de `npm pack`; no la carpeta del build.
- **Dependencias de pares:** paquetes que el proyecto consumidor ya tiene instalados y que la librería usa sin traer su propia copia.
- **Punto de entrada público:** lo que obtiene el consumidor al importar el paquete por su nombre.

## Requisitos funcionales

- FR-1: MIENTRAS el código de la librería no importe NestJS ni `rxjs`, como en esta spec, EL SISTEMA no declara dependencias de pares; cuando los importe, aunque sea solo para tipos, los declarará como pares la spec de esa herramienta.
- FR-2: EL SISTEMA tiene `tslib` como única dependencia directa de runtime, y la mantiene aunque la API pública esté vacía.
- FR-3: EL SISTEMA describe el paquete con el nombre `@brickstodev/nest-tools`, acceso público en npm configurado, licencia MIT, autor «brickstodev» sin email, descripción y palabras clave en inglés y Node.js 20 como versión mínima, y conserva la marca de privado solo hasta la primera release, que la quita (spec 002, FR-8).
- FR-4: EL SISTEMA indica como repositorio del paquete `https://github.com/brickstodev/nest-tools`, con la carpeta de la librería, y como página del proyecto el README de la librería; las URL apuntan a la rama `main`.
- FR-5: EL SISTEMA genera el paquete en CommonJS con un único punto de entrada público, que exporta solo la API pública de las herramientas, definida por la spec de cada una (en esta spec, ninguna), y sus declaraciones de tipos, que TypeScript encuentra con las resoluciones de módulos `node10`, `node16`/`nodenext` y `bundler`.
- FR-6: EL SISTEMA permite cargar en Node.js el punto de entrada público con `require` y, desde ESM, con `import`, y también el manifiesto del paquete; cargar cualquier otra ruta del paquete falla con un error.
- FR-7: EL SISTEMA incluye en el paquete solo el código compilado, sus declaraciones de tipos, el manifiesto, el README en inglés y sus traducciones al español, francés, italiano y alemán, un archivo de licencia MIT con copyright de 2026 a nombre de «brickstodev» y, desde la primera release, el registro de cambios de la librería (spec 002, FR-7).
- FR-8: EL SISTEMA excluye del paquete los source maps, los tests, el código fuente sin compilar y la configuración de desarrollo.
- FR-9: EL SISTEMA ofrece en el README del paquete, en inglés, qué es la librería, cómo instalarla, su licencia y su política de soporte: NestJS 11 y 12 y Node.js 20+ (con NestJS 12, la versión de Node que este exige: 20.19+ o 22.12+).

## Requisitos no funcionales

- NFR-1: El código propio de la librería no tiene efectos secundarios al importar el paquete, entendidos solo como: registrar providers o filtros globales, leer variables de entorno, arrancar temporizadores o escribir logs; lo que hagan NestJS u otras dependencias de pares al cargarse no cuenta.
- NFR-2: El paquete no importa `express` ni `fastify` directamente.

## Casos límite

- Un consumidor importa un archivo compilado concreto del paquete en lugar de su nombre: la importación falla con un error; si importa el manifiesto, funciona (FR-6).
- Se genera el paquete antes de la primera release: aún no hay registro de cambios, y el paquete se genera sin él y sin error (FR-7).
- Un consumidor importa el paquete, con `require` o desde ESM: la importación funciona, aporta solo la API pública y no tiene efectos secundarios propios (FR-5, FR-6, NFR-1).
- Se instala el paquete con NestJS 10 o anterior: el gestor de paquetes avisa o falla por las dependencias de pares, según su configuración (FR-1, FR-9).
- Se instala el paquete con Node.js anterior a la 20: el paquete lo declara no soportado y el gestor de paquetes avisa o falla según su configuración (FR-3).

## Fuera de alcance

- El proceso de release (versionado, creación y contenido del registro de cambios, tags y publicación en npm) y quitar la marca de privado en la primera release: spec 002-release-process.
- Generar el paquete en ESM, cargarlo con bundlers, Node.js anterior a la 20 y NestJS 10 o anterior.
- Comprobar la instalación con NestJS 11 o 12 o con Node.js 20 (el rango de Node lo fija FR-3 y la política de NestJS, FR-9) y fijar una versión mínima de TypeScript.
- Cómo resuelve TypeScript las rutas internas del paquete: solo se bloquean en Node.js (FR-6).
- Las herramientas de la librería (la primera, `AllExceptionsFilter`, en la 003) y las reglas de lint del workspace; la spec de cada herramienta decide el rango de sus pares (incluidos el de `rxjs` y el límite superior).

## Criterios de finalización

- El paquete cumple FR-1 a FR-8.
- El README del paquete está en inglés y cumple FR-9.
- La librería cumple NFR-1 y NFR-2.
- La librería cumple los principios 4, 6 y 7 de la constitución.

## Preguntas abiertas

Ninguna.
