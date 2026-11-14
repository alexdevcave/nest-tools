# Spec 001 — Paquete publicable

Status: implemented

## Contexto y objetivo

La librería `@alexdevcave/nest-tools` se va a publicar en npm para que la use cualquier proyecto NestJS. Hoy no está lista: declara NestJS como dependencia directa (lo que puede duplicar Nest en el proyecto que la instala), solo exporta un módulo vacío generado por Nx y no tiene metadatos públicos, licencia ni un README útil.

El objetivo es dejar la configuración del paquete lista para publicarse y conforme a los principios 4, 6 y 7 de la constitución. Esta spec no versiona ni publica: el proceso de release llega con la spec 002-release-process, cuando exista la primera herramienta. Hasta entonces el paquete conserva la marca de privado para que no se publique por accidente; la 002 la quita justo antes de la primera publicación. Mientras tanto se retira el módulo vacío, la API pública queda vacía y cada dependencia de pares se añade con la spec de la herramienta que la use.

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

- FR-1: MIENTRAS el código de la librería no importe NestJS ni `rxjs`, como en esta spec, EL SISTEMA no declara dependencias de pares; cuando los importe, los declarará como pares la spec de esa herramienta.
- FR-2: EL SISTEMA tiene `tslib` como única dependencia directa de runtime, y la mantiene aunque la API pública esté vacía.
- FR-3: EL SISTEMA describe el paquete con el nombre `@alexdevcave/nest-tools`, acceso público en npm configurado sin quitar la marca de privado, licencia MIT, autor «alexdevcave» sin email, descripción y palabras clave en inglés y Node.js 20 como versión mínima.
- FR-4: EL SISTEMA indica como repositorio del paquete `https://github.com/alexdevcave/nest-tools`, con la carpeta de la librería, y como página del proyecto el README de la librería; las URL apuntan a la rama `main`.
- FR-5: EL SISTEMA genera el paquete en CommonJS con un único punto de entrada público, que en esta spec no exporta nada, y sus declaraciones de tipos, que TypeScript encuentra con las resoluciones de módulos `node10`, `node16`/`nodenext` y `bundler`.
- FR-6: EL SISTEMA permite cargar en Node.js el punto de entrada público con `require` y, desde ESM, con `import`, y también el manifiesto del paquete; cargar cualquier otra ruta del paquete falla con un error.
- FR-7: EL SISTEMA incluye en el paquete solo el código compilado, sus declaraciones de tipos, el manifiesto, el README y un archivo de licencia MIT con copyright de 2026 a nombre de «alexdevcave».
- FR-8: EL SISTEMA excluye del paquete los source maps, los tests, el código fuente sin compilar, la configuración de desarrollo y el registro de cambios.
- FR-9: EL SISTEMA ofrece en el README del paquete, en inglés, qué es la librería, cómo instalarla, su licencia y su política de soporte: NestJS 10 y 11 y Node.js 20+.

## Requisitos no funcionales

- NFR-1: Importar el paquete no tiene efectos secundarios, entendidos solo como: registrar providers o filtros globales, leer variables de entorno, arrancar temporizadores o escribir logs.
- NFR-2: El paquete no importa `express` ni `fastify` directamente.

## Casos límite

- Un consumidor importa un archivo compilado concreto del paquete en lugar de su nombre: la importación falla con un error (FR-6).
- Un consumidor importa el manifiesto del paquete: la importación funciona (FR-6).
- Un consumidor importa el paquete, con `require` o desde ESM, mientras la API pública está vacía: la importación funciona, no aporta exportaciones y no tiene efectos secundarios (FR-5, FR-6, NFR-1).
- Mientras no haya dependencias de pares, nada impide instalar el paquete con NestJS 9 o sin NestJS: el soporte es solo el que declara el README (FR-1, FR-9).
- Se instala el paquete con Node.js anterior a la 20: el paquete lo declara no soportado y el gestor de paquetes avisa o falla según su configuración (FR-3).

## Fuera de alcance

- El proceso de release (versionado, registro de cambios, tags y publicación en npm) y quitar la marca de privado justo antes de la primera publicación: spec futura 002-release-process.
- Generar el paquete en ESM, cargarlo con bundlers, Node.js anterior a la 20 y NestJS 9 o anterior.
- Comprobar la instalación con NestJS 10 u 11 o con Node.js 20 (el rango de Node lo fija FR-3 y la política de NestJS, FR-9) y fijar una versión mínima de TypeScript.
- Cómo resuelve TypeScript las rutas internas del paquete: solo se bloquean en Node.js (FR-6).
- Las herramientas de la librería (la primera, `AllExceptionsFilter`, en la 003) y las reglas de lint del workspace; la spec de cada herramienta decide el rango de sus pares (incluidos el de `rxjs` y el límite superior) y si `import type` cuenta como importar.

## Criterios de finalización

- El paquete cumple FR-1 a FR-8 y su punto de entrada público no exporta nada.
- El README del paquete está en inglés y cumple FR-9.
- La librería cumple NFR-1 y NFR-2.
- La librería cumple los principios 4, 6 y 7 de la constitución.

## Preguntas abiertas

Ninguna.
