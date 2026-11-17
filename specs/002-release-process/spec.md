# Spec 002 — Proceso de release

Status: implemented

## Contexto y objetivo

La librería `@brickstodev/nest-tools` ya está lista para publicarse (spec 001) y tiene su primera herramienta (spec 003), pero no hay forma de versionarla ni de publicarla: sigue en 0.0.1, con la marca de privado y sin ningún tag.

El objetivo es un proceso de release repetible que el mantenedor lanza a mano en dos pasos. Primero, una release en local, con un ensayo previo, que calcula la versión a partir de los Conventional Commits de la librería, actualiza su registro de cambios y crea un commit y un tag, sin hacer push. Después, el push y la publicación en npm con el 2FA del mantenedor. Así cada versión de npm tiene su tag en el repositorio, un push fallido no publica nada y una publicación fallida se reintenta con la misma versión. La primera release fija la 0.1.0 y quita la marca de privado. Solo se versiona y publica la librería. No es una herramienta de la librería, así que no se demuestra en la app de pruebas (principio 4).

Depende de tres cambios previos en la spec 001: su FR-3 conserva la marca de privado y pasa a hacerlo solo hasta la primera release, y sus FR-7 y FR-8 dejan fuera del paquete el registro de cambios, que ahora se publica. Depende también de la enmienda del principio 7 de la constitución, que suma `perf` a los tipos que suben el patch en 0.x.

## Usuarios

- **Mantenedor:** lanza el ensayo, la release, el push y la publicación.
- **Consumidor:** instala el paquete desde npm y lee su registro de cambios antes de actualizar.

## Historias de usuario

- US-1. Como mantenedor, quiero que la versión se calcule a partir de los commits de la librería, para seguir semver sin decidirla a mano.
- US-2. Como mantenedor, quiero ver con un ensayo la versión y el registro de cambios antes de crearlos, para corregir los commits si algo no cuadra.
- US-3. Como mantenedor, quiero que la release no empiece si el repositorio no está limpio, al día y en verde, para no publicar algo roto ni dejar nada a medias.
- US-4. Como mantenedor, quiero hacer el push y publicar a mano con mi 2FA, para que nada llegue a npm sin mí y cada versión tenga su tag.
- US-5. Como consumidor, quiero un registro de cambios en el paquete, con los cambios incompatibles destacados, para saber qué cambia al actualizar.

## Definiciones

- **Release:** el primer paso, en local: nueva versión, registro de cambios, commit y tag.
- **Ensayo:** muestra la versión y la sección del registro de cambios que crearía la release, sin pasar las comprobaciones previas ni cambiar nada.
- **Publicación:** el segundo paso: subir a npm una versión ya etiquetada, después de su push.
- **Último tag:** el tag con la forma `nest-tools@x.y.z` de la versión más alta.
- **Commit de la librería:** un commit que modifica al menos un archivo de la carpeta de la librería, aunque modifique también otros.
- **Cambio incompatible:** un commit marcado como tal según Conventional Commits (`!` tras el tipo o el pie `BREAKING CHANGE`), sea cual sea su tipo.
- **Commit que sube versión:** un commit de la librería que es un cambio incompatible o de tipo `feat`, `fix` o `perf`.
- **Comprobaciones previas:** no hay cambios sin commit ni archivos sin seguimiento, se está en `main`, no le falta ningún commit de `main` del remoto, consultado en ese momento (sin conexión, falla), lint, tests y build de todos los proyectos y el e2e de la app de pruebas pasan, y el tag de la nueva versión aún no existe.

## Requisitos funcionales

- FR-1: MIENTRAS la versión sea 0.x, CUANDO se lanza una release que no es la primera, EL SISTEMA calcula la nueva versión a partir de los commits de la librería desde el último tag: sube el minor si alguno es un cambio incompatible y, si no, el patch si alguno es `feat`, `fix` o `perf`; los demás tipos no suben versión, y cada release sube la versión una sola vez.
- FR-2: CUANDO se lanza la primera release (sin ningún tag de la librería), EL SISTEMA usa la versión 0.1.0, sin calcularla de los commits, con una sección del registro de cambios cuya única entrada es «Initial release».
- FR-3: SI ya hay algún tag de la librería y desde el último no hay ningún commit que suba versión, ENTONCES EL SISTEMA avisa de que no hay nada que publicar y termina antes de las comprobaciones previas, sin cambiar ningún archivo ni crear commits ni tags.
- FR-4: SI alguna comprobación previa falla al lanzar la release, ENTONCES EL SISTEMA para indicando cuál, antes de cambiar ningún archivo (versión, registro de cambios o marca de privado) y sin crear commits ni tags; SI falla un paso posterior, ENTONCES deshace sus propios cambios en archivos, commit y tag, deja el repositorio como estaba e indica qué paso falló.
- FR-5: CUANDO el mantenedor lanza el ensayo, EL SISTEMA solo calcula y muestra la versión y la sección del registro de cambios que crearía la release, sin pasar las comprobaciones previas (las pasa siempre la release, FR-4), sin cambiar ningún archivo y sin crear commits ni tags.
- FR-6: CUANDO la release termina, EL SISTEMA deja en local la nueva versión en el manifiesto del paquete (en la primera, también sin la marca de privado, FR-8) y su sección del registro de cambios en un único commit `chore(release)`, y sobre ese commit el tag `nest-tools@x.y.z` de la versión, sin hacer push; al final muestra el comando con el que el mantenedor sube a la vez la rama y el tag, y el que deshace la release mientras no se haya subido.
- FR-7: EL SISTEMA mantiene un registro de cambios de la librería en inglés, sin traducciones y con la versión más reciente primero, que va en el paquete publicado; cada release añade una sección con su versión y su fecha (AAAA-MM-DD, en UTC) y, salvo la primera (FR-2), una entrada por cada commit que sube versión, con su descripción; los cambios incompatibles van primero, en un apartado `Breaking changes`, con el texto de su pie `BREAKING CHANGE` si lo tienen; ningún otro commit aparece en él.
- FR-8: CUANDO se hace la primera release, EL SISTEMA quita la marca de privado del paquete antes de crear el tag de la 0.1.0; hasta entonces la conserva, y ningún tag de release ni versión publicada la lleva.
- FR-9: CUANDO el mantenedor publica una release, EL SISTEMA publica la del tag del commit actual, y comprueba antes que ese tag es el de la versión más alta, que ya está en el remoto con su commit en `main` y que el repositorio está en su commit, sin cambios ni archivos sin seguimiento; compila el paquete desde ahí y lo publica en npm con su versión, la etiqueta `latest` y la verificación 2FA que npm pide al mantenedor en ese momento (un código o la confirmación en el navegador). SI alguna de esas comprobaciones falla, ENTONCES para sin publicar nada e indica qué falta.
- FR-10: SI el push o la publicación fallan, ENTONCES EL SISTEMA permite repetir solo ese paso con la misma versión, sin repetir la release ni crear otra versión, commit o tag; la publicación se repite desde el commit de su tag mientras no haya otra release posterior (FR-9).

## Requisitos no funcionales

- NFR-1: El proceso no guarda tokens ni credenciales de npm en el repositorio ni en la configuración del workspace; la publicación usa la sesión de npm del mantenedor y su 2FA.
- NFR-2: El proceso no añade dependencias al workspace ni al paquete (principio 1).
- NFR-3: El ensayo y la release no publican nada fuera del repositorio local: ni push, ni npm, ni GitHub; solo consultan el remoto (FR-4). La caché remota y la telemetría de las herramientas del workspace siguen como estén configuradas.

## Casos límite

- Un commit toca a la vez la librería y la app de pruebas: cuenta para la librería según su tipo (FR-1, FR-7).
- Desde el último tag solo hay commits `docs` o `chore` de la librería (por ejemplo, del README) o `feat` de la app de pruebas: no hay nada que publicar, y el README nuevo llega a npm con la siguiente versión que suba por código (FR-3).
- Un commit de la librería no sigue Conventional Commits: no sube la versión ni aparece en el registro de cambios (FR-1, FR-7).
- La rama local tiene commits sin push: la release sigue, y el push del segundo paso los sube junto al commit y el tag de la release (FR-4).
- La publicación llegó a npm aunque el mantenedor la diera por fallida: al reintentarla, npm rechaza la versión repetida y no cambia nada (FR-10).

## Fuera de alcance

- Integración continua y publicación automática, incluidas la procedencia (provenance) y el trusted publishing de npm, que las necesitan.
- GitHub Releases, que exigirían push y un token durante la release.
- Versiones previas (beta, next…) y etiquetas de npm distintas de `latest`.
- Push y publicación automáticos: los lanza siempre el mantenedor a mano, nunca un agente.
- Pasar a la 1.0.0 y calcular versiones desde ella (el principio 7 ya fija que un cambio incompatible será mayor).

## Criterios de finalización

- La spec 001 (FR-3, FR-7 y FR-8) y el principio 7 de la constitución (`perf` sube el patch en 0.x) están ajustados antes de implementar esta spec.
- El ensayo (FR-5) y la release calculan la versión según FR-1 y FR-3 con commits de cada tipo y con commits solo de la app de pruebas, y la release para sin dejar cambios con cada comprobación previa fallida (también con el tag de la nueva versión ya creado) y con un paso posterior fallido (FR-4).
- La primera release deja en local la 0.1.0 con «Initial release», sin marca de privado, en su commit `chore(release)` con el tag `nest-tools@0.1.0` (FR-2, FR-6, FR-7, FR-8).
- La publicación para sin publicar nada si el commit actual no tiene tag de release, si ese tag no es el de la versión más alta o no está en el remoto con su commit en `main`, o si hay cambios o archivos sin seguimiento; tras el push, el mantenedor ha publicado la 0.1.0 en npm con la etiqueta `latest`, con el registro de cambios y sin la marca de privado (FR-9).
- El proceso cumple NFR-1 a NFR-3 y los principios 1, 6 y 7 de la constitución.

## Preguntas abiertas

Ninguna.
