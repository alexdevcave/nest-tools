# Plan 002 — Proceso de release

Plan aprobado por el usuario el 2026-11-17.

Spec: `specs/002-release-process/spec.md` (approved, sin preguntas abiertas). Requisito previo de la spec ya cumplido: la 001 (FR-3, FR-7 y FR-8) y el principio 7 (`perf` sube el patch en 0.x) están ajustados (V0).

Resumen: una herramienta propia en TypeScript, sin dependencias nuevas, en un proyecto Nx nuevo `tools/release` (`release-tools`), que el mantenedor lanza con tres scripts del `package.json` raíz. No se usa `nx release` (análisis y D1). No cambia la API pública de la librería ni la app de pruebas.

## Cómo se lanza

| Paso                      | Comando exacto                                                                              | Quién lo lanza                                       | FR                       |
| ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------ |
| Ensayo                    | `pnpm run release:dry-run`                                                                  | El mantenedor (o un agente: solo lee)                | FR-5                     |
| Release                   | `pnpm run release`                                                                          | El mantenedor; un agente, solo si el usuario lo pide | FR-1 a FR-4, FR-6 a FR-8 |
| Push                      | `git push --atomic origin main nest-tools@x.y.z` (lo imprime la release)                    | Solo el mantenedor                                   | FR-6, FR-10              |
| Publicación               | `pnpm run release:publish`                                                                  | Solo el mantenedor (2FA de npm)                      | FR-9, FR-10              |
| Deshacer (antes del push) | `git tag -d nest-tools@x.y.z && git reset --keep <commit-anterior>` (lo imprime la release) | El mantenedor                                        | FR-6                     |

Cada script compila antes la herramienta (`nx run release-tools:build`, con caché) y ejecuta `node dist/tools/release/src/main.js release [--dry-run]` o `… publish` desde la raíz, que es el repositorio sobre el que trabaja (`process.cwd()`). Se lanzan siempre con `pnpm run`: `pnpm publish` es un comando de pnpm, por eso ningún script se llama `publish`.

## Flujo

**Release (`release [--dry-run]`)**, en este orden:

1. **Cálculo, sin red ni cambios.** Tags de `git tag --list 'nest-tools@*'` con la forma estricta `nest-tools@<n>.<n>.<n>`; el último es el más alto en comparación numérica (`0.10.0` > `0.9.0`).
   - Sin tags: 0.1.0 con la entrada «Initial release», sin leer commits (FR-2).
   - Con tag: `git log <último-tag>..HEAD --format=%H%x1f%B%x1e -- libs/nest-tools/` (justo la definición de «commit de la librería»), Conventional Commits y nueva versión a partir de la del tag (FR-1).
   - Si ningún commit sube la versión: `Nothing to release since nest-tools@x.y.z`, sale con código 0 y no hace nada más (FR-3).
   - Si la versión del tag es 1.0.0 o mayor, para con error (fuera de alcance, D13).
2. **Ensayo:** imprime la versión y la sección del registro de cambios y sale con 0 (FR-5).
3. **Comprobaciones previas**, en el orden de la definición de la spec. Cada una imprime su nombre y, si falla, la release para con código 1 nombrándola, sin haber escrito nada (FR-4):
   1. Árbol limpio: `git status --porcelain --untracked-files=all` vacío.
   2. En `main`: `git branch --show-current` es `main` (vacío si `HEAD` está suelto).
   3. Al día con el remoto: `git fetch --quiet origin main` (sin conexión, falla) y `git rev-list --count HEAD..origin/main` es `0`; los commits locales sin push no la paran.
   4. En verde: `pnpm nx run-many -t lint test build e2e --outputStyle=static` (todos los proyectos y el e2e de la app).
   5. Tag libre: `nest-tools@x.y.z` no está en `git tag --list` ni en `git ls-remote --tags origin 'nest-tools@*'`.
4. **Cambios** (FR-6 a FR-8): guarda `HEAD` y el contenido original de los dos archivos; escribe `libs/nest-tools/package.json` con la nueva `version` y sin `private` (`JSON.stringify(…, null, 2)` y salto de línea final, el formato actual) y `libs/nest-tools/CHANGELOG.md`; `git add` de esos dos archivos; `git commit -m "chore(release): nest-tools@x.y.z"`; `git tag -a nest-tools@x.y.z -m nest-tools@x.y.z`.
5. **Si falla un paso de 4**, deshace en orden inverso solo lo que llegó a hacer: borra el tag, `git reset --soft <HEAD guardado>`, `git reset -q <HEAD guardado> -- <los dos archivos>` y restaura su contenido (o borra el CHANGELOG si no existía). Dice qué paso falló y sale con 1; si deshacer también falla, imprime los comandos para terminarlo a mano (FR-4).
6. **Final:** imprime el commit, el tag, el comando de push atómico, `pnpm run release:publish` y el comando de deshacer (FR-6). Ni push ni npm (NFR-3).

**Publicación (`publish`)**, todo antes de compilar. Si algo falla, para sin publicar, dice qué falta y sale con 1 (FR-9):

1. Árbol limpio, como en la release.
2. El commit actual tiene tag de release (`git tag --points-at HEAD`, forma estricta; si hay varios, el más alto). Si no, el mensaje pide `git checkout nest-tools@x.y.z`.
3. El tag está en `origin` y apunta al commit actual: `git ls-remote --tags origin 'nest-tools@*'`, con la línea `^{}` porque el tag es anotado.
4. Es el más alto de los tags locales y remotos.
5. Su commit está en `main` del remoto: `git fetch --quiet origin main` y `git branch --remotes --contains HEAD --list origin/main` no vacío.
6. Compila: `pnpm nx run nest-tools:build --skip-nx-cache --outputStyle=static` (D10).
7. Publica: `npm publish --tag latest` con `cwd` `dist/libs/nest-tools` y la terminal heredada, para que npm pida la 2FA como quiera (código o navegador).

La publicación nunca crea commits, tags ni versiones: repetirla es volver a lanzarla desde el commit del tag (FR-10). Si npm ya tiene la versión, la rechaza y la herramienta sale con 1 sin cambiar nada.

## Archivos y responsabilidades

Carpeta nueva `tools/release/`: las filas hasta `src/lib/*.spec.ts` son relativas a ella.

| Archivo                                                                                                                                                                                                | Acción                | Responsabilidad                                                                                                                                                                                                                                             | FR                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `project.json`                                                                                                                                                                                         | Crear                 | Proyecto `release-tools`, tags `scope:tooling` y `type:tool`; `build` con `@nx/js:tsc` (`outputPath: dist/tools/release`, `main: tools/release/src/main.ts`, `generatePackageJson: false`). `lint` y `test` los infieren los plugins.                       | NFR-2                      |
| `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`                                                                                                                                             | Crear                 | Copia de los de la lib sin decoradores: `strict`, CommonJS, `target: es2021`, `types: ["node"]` (y `["jest", "node"]` en los tests).                                                                                                                        | —                          |
| `jest.config.cts`                                                                                                                                                                                      | Crear                 | Como el de la lib (`ts-jest`, entorno `node`), con `displayName: 'release-tools'`.                                                                                                                                                                          | —                          |
| `eslint.config.mjs`                                                                                                                                                                                    | Crear                 | La base del workspace y las mismas cuatro reglas de TypeScript que la lib (`func-style`, tipo de retorno, accesibilidad, `no-inferrable-types` desactivada). Sin `@nx/dependency-checks`: no hay manifiesto.                                                | —                          |
| `src/main.ts`                                                                                                                                                                                          | Crear                 | CLI: `release [--dry-run]` y `publish`; conecta la E/S real, imprime el error y fija el código de salida. Sin lógica.                                                                                                                                       | FR-4, FR-5, FR-9           |
| `src/lib/constants.ts`                                                                                                                                                                                 | Crear                 | Las constantes de la tabla de configuración.                                                                                                                                                                                                                | —                          |
| `src/lib/conventional-commit.ts`                                                                                                                                                                       | Crear                 | Puro: trocear la salida de `git log` y analizar cada mensaje (tipo, descripción, `!`, pie `BREAKING CHANGE`).                                                                                                                                               | FR-1, FR-7                 |
| `src/lib/version.ts`                                                                                                                                                                                   | Crear                 | Puro: leer tags (`git tag` y `git ls-remote`), el más alto y la nueva versión en 0.x.                                                                                                                                                                       | FR-1, FR-2, FR-3, FR-9     |
| `src/lib/changelog.ts`                                                                                                                                                                                 | Crear                 | Puro: la sección de una versión y su alta en el archivo.                                                                                                                                                                                                    | FR-2, FR-7                 |
| `src/lib/release.ts`                                                                                                                                                                                   | Crear                 | Orquesta la release y el ensayo con la E/S inyectada: cálculo, comprobaciones, cambios, commit, tag, deshacer y comandos finales.                                                                                                                           | FR-1 a FR-8, NFR-3         |
| `src/lib/publish.ts`                                                                                                                                                                                   | Crear                 | Orquesta la publicación con la E/S inyectada: comprobaciones, build sin caché y `npm publish`.                                                                                                                                                              | FR-9, FR-10, NFR-1         |
| `src/lib/node-deps.ts`                                                                                                                                                                                 | Crear                 | La E/S real con `child_process` y `fs`: `git` con la salida capturada; `pnpm` y `npm` con la terminal heredada. Sin lógica (se comprueba con los comandos V).                                                                                               | —                          |
| `src/lib/interfaces/conventional-commit.interface.ts`                                                                                                                                                  | Crear                 | `ConventionalCommit`: `type`, `description`, `breaking` y `breakingNote` (`string \| null`).                                                                                                                                                                | FR-1, FR-7                 |
| `src/lib/interfaces/next-release.interface.ts`                                                                                                                                                         | Crear                 | `NextRelease`: `version`, `tag` y `section`.                                                                                                                                                                                                                | FR-1, FR-2, FR-5           |
| `src/lib/interfaces/release-deps.interface.ts`                                                                                                                                                         | Crear                 | `ReleaseDeps`, la E/S que se inyecta (ver abajo).                                                                                                                                                                                                           | FR-4, FR-9                 |
| `src/lib/*.spec.ts`                                                                                                                                                                                    | Crear                 | Un spec por módulo de `src/lib` (salvo `node-deps.ts` y `constants.ts`); ver la estrategia de tests.                                                                                                                                                        | FR-1 a FR-10, NFR-1, NFR-3 |
| `package.json` (raíz)                                                                                                                                                                                  | Modificar             | Solo `scripts`: `release:dry-run`, `release` y `release:publish`. Sin dependencias.                                                                                                                                                                         | FR-5, FR-6, FR-9, NFR-2    |
| `CLAUDE.md`                                                                                                                                                                                            | Modificar             | Estructura (`tools/release`), comandos, tests con `-p nest-tools,nest-tools-app,release-tools` y límites (ensayo sí; release solo si se pide; el push de la release (rama y tag) y la publicación en npm los lanza siempre el mantenedor, nunca un agente). | —                          |
| `.claude/agents/coordinator.md`, `.claude/agents/reviewer.md`, `.claude/agents/implementer.md`, `.claude/commands/sdd-implement.md`, `.claude/commands/sdd-validate.md`, `.claude/skills/sdd/SKILL.md` | Modificar (T8)        | El comando de tests pasa de `-p nest-tools,nest-tools-app` a `-p nest-tools,nest-tools-app,release-tools`, para que `implementer` y `reviewer` ejecuten también los tests de la herramienta.                                                                | —                          |
| `MEMORY.md`                                                                                                                                                                                            | Modificar             | Estado de cada fase (skill sdd).                                                                                                                                                                                                                            | —                          |
| `libs/nest-tools/package.json`, `libs/nest-tools/CHANGELOG.md`                                                                                                                                         | Los cambia la release | No los toca la implementación: la primera release pone la 0.1.0, quita `private` y crea el registro de cambios.                                                                                                                                             | FR-2, FR-6 a FR-8          |

La E/S inyectada (`ReleaseDeps`):

```ts
git(args: string[]): string; // stdout without the trailing newline; throws on a non-zero exit
run(command: string, args: string[], cwd?: string): void; // inherited terminal; throws on a non-zero exit
readFile(path: string): string | null; // null when the file does not exist
writeFile(path: string, content: string): void;
removeFile(path: string): void;
now(): Date;
log(message: string): void;
```

**Archivos de configuración que cambian (para la aprobación del usuario):** el `package.json` raíz (solo `scripts`) y los nuevos de `tools/release/`. No cambian `nx.json` (siguen `nxCloudId` y `analytics`, NFR-3), `tsconfig.base.json` (nadie importa la herramienta por alias), `eslint.config.mjs` (la etiqueta nueva entra en la regla `'*'`), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.gitignore` (`dist` ya se ignora) ni `libs/nest-tools/project.json`.

## API pública

Ninguna: `libs/nest-tools/src/index.ts` no cambia y la herramienta no forma parte del paquete. La release solo toca `version` y `private` del manifiesto.

## Configuración y valores por defecto

Sin opciones ni variables de entorno: el único argumento es `--dry-run`. Las constantes (`src/lib/constants.ts`):

| Constante               | Valor                                  | FR               |
| ----------------------- | -------------------------------------- | ---------------- |
| Prefijo y forma del tag | `nest-tools@` + `x.y.z` (solo números) | FR-1, FR-6       |
| Carpeta de la librería  | `libs/nest-tools/`                     | FR-1             |
| Manifiesto              | `libs/nest-tools/package.json`         | FR-6, FR-8       |
| Registro de cambios     | `libs/nest-tools/CHANGELOG.md`         | FR-7             |
| Primera versión         | `0.1.0`                                | FR-2             |
| Mensaje del commit      | `chore(release): nest-tools@x.y.z`     | FR-6             |
| Remoto y rama           | `origin` y `main`                      | FR-4, FR-6, FR-9 |
| Carpeta que se publica  | `dist/libs/nest-tools`                 | FR-9             |
| Etiqueta de npm         | `latest`                               | FR-9             |

## Integración con Nest

Ninguna: es tooling del repositorio, sin módulo ni providers, y no se registra en ninguna app.

## Compatibilidad

- **`peerDependencies` y `dependencies`:** sin cambios; la release solo toca `version` y `private` del manifiesto (FR-6, FR-8).
- **Express y Fastify:** no aplica.
- **Semver:** la herramienta aplica el principio 7 en 0.x (FR-1) y para desde la 1.0.0. La primera publicación hace público el paquete en npm.
- **Entorno:** el Node que ya ejecuta Nx (la salida es CommonJS ES2021), `git` y `npm` en el `PATH`, el remoto `origin` y la sesión de npm del mantenedor (`npm login`, NFR-1).

## Documentación pública

- **README de la lib y sus traducciones:** sin cambios (no se activa el principio 6). La nueva documentación pública es el `CHANGELOG.md`, en inglés y sin traducciones, que crea la primera release y entra en el paquete por `files` y `assets` (spec 001) (FR-7).
- **JSDoc:** no aplica, porque la API pública no cambia. La herramienta lleva comentarios en inglés solo para el porqué.
- **Interna:** `CLAUDE.md` (estructura, comandos y límites), el comando de tests de los agentes, los comandos y la skill sdd en `.claude/`, y `MEMORY.md`.

## Formato del registro de cambios (FR-2, FR-7)

```markdown
# Changelog

## 0.2.0 (2026-12-01)

### Breaking changes

- rename the client errors log option
  The `logErrors` option is now `logClientErrors`.

### Fixes

- keep the status code of external HTTP errors

## 0.1.0 (2026-11-20)

- Initial release
```

- El título `# Changelog` solo se escribe al crear el archivo. Cada sección nueva va justo debajo, antes de la anterior; si el archivo existe sin ese título, la release falla y se deshace.
- Encabezado `## x.y.z (AAAA-MM-DD)`, con la fecha de la release en UTC (`toISOString().slice(0, 10)`).
- Apartados en este orden y solo si tienen entradas: `Breaking changes`, `Features`, `Fixes` y `Performance`.
- Cada entrada es `- <descripción>`, la del encabezado del commit, sin tipo, scope, hash, autor, enlaces ni emojis, en el orden de `git log` (la más reciente primero).
- Un cambio incompatible solo sale en `Breaking changes`, sea del tipo que sea. Debajo va el texto de su pie `BREAKING CHANGE:` o `BREAKING-CHANGE:`, sangrado 2 espacios, hasta el siguiente pie (`Co-Authored-By:`, `Claude-Session:`…), que en este repositorio llevan muchos commits.
- Ningún otro commit aparece: tampoco los `revert`. El commit revertido sigue contando, como se aceptó en la clarificación.
- Análisis del encabezado: `tipo(scope)!: descripción`, con el tipo sin distinguir mayúsculas (Conventional Commits 1.0). Un mensaje que no cumple esa forma se ignora.

## Análisis de `nx release` 24.0.0 (código instalado)

Rutas abreviadas, dentro de `node_modules/.pnpm/nx@24.0.0/node_modules/nx/dist/`: `release/…` es `src/command-line/release/…`; `affected/…` es `src/plugins/js/project-graph/affected/…`; `renderer` es `dist/release/changelog-renderer/index.js`, fuera de esa abreviatura.

- **0.x:** `adjustSemverBumpsForZeroMajorVersion` vale `true` por defecto (`release/config/config.js:241`, `release/utils/release-graph.js:615-617`) y baja major→minor y minor→patch (`release/utils/semver.js:69-86`). Por tanto, `feat` (minor) y `fix` suben el patch, y un cambio incompatible (major, `release/utils/semver.js:41`) sube el minor. Pero `perf` trae `semverBump: 'none'` (`release/config/conventional-commits.js:21-27`) y habría que configurarlo; los demás tipos son `none` y un tipo desconocido no sube.
- **Qué commits cuentan para la versión:** `getCommitsRelevantToProjects` (`release/utils/shared.js:322-379`) usa el grafo de afectados de cada commit (`release/utils/release-graph.js:708-729`), no los archivos de la carpeta. Por eso cuentan para la lib, y subirían su versión con un `fix:`, cambios que la spec deja fuera:
  - un cambio de `tsconfig.base.json` fuera de `paths` marca todos los proyectos (`affected/tsconfig-json-changes.js:16-17`);
  - un cambio de dependencias en el `package.json` raíz marca el paquete npm y, por el recorrido inverso (`src/project-graph/affected/affected-project-graph.js:32-34, 56`), a quien lo importa (la lib importa `@nestjs/common`); si el paquete es `nx` o un plugin de `nx.json`, marca todos los proyectos (`affected/npm-packages.js:43-74, 141-144`);
  - el lock, igual (`affected/lock-file-changes.js:11-28`).

  No hay opción de `nx.json` que lo limite: `projectsAffectedByDependencyUpdates` solo afecta al lock. La parte nativa (`locateTouchedProjects`) no se puede leer.

- **Scope:** con `useCommitScope: true` (por defecto), un commit de la lib con un scope que no es `nest-tools` cuenta como indirecto y sube solo el patch, aunque sea incompatible (`release/utils/semver.js:29-38`).
- **Registro de cambios:**
  - En grupos `independent` filtra los commits por el prefijo de la carpeta (`release/changelog.js:846-849`), un criterio distinto del de la versión. En grupos `fixed` toma todos los commits y marca `'*'` los que tocan archivos fuera de proyectos (`release/changelog.js:397-398`, `release/changelog/commit-utils.js:23-30`).
  - Quita los tipos ocultos aunque sean incompatibles (`release/changelog/commit-utils.js:31-40`): un `refactor!:` subiría el minor sin dejar entrada.
  - El renderer por defecto pone `Breaking Changes` al final y repite allí las entradas; añade emojis, el scope en negrita, autores y enlaces, y quita los commits revertidos (`renderer`, líneas 55-81, 86-100, 198-201 y 273-278).
  - `BREAKING-CHANGE:` no cuenta como incompatible (`release/utils/git.js:495`).
- **Proceso:** no tiene comprobaciones previas, ni una parada antes de ellas cuando no hay nada que publicar, ni deshacer.
- **Publish:** `@nx/js:release-publish` lanza el publish con `stdio: ['ignore', 'pipe', 'pipe']` (`@nx/js/dist/src/executors/release-publish/release-publish.impl.js:357-362`). Sin entrada, la 2FA solo funciona pasando `--otp`, no con la confirmación en el navegador.

Conclusión: para cumplir FR-1, FR-4, FR-7 y FR-9 con `nx release` habría que calcular la versión y filtrar los commits por nuestra cuenta, escribir un renderer y un envoltorio con las comprobaciones, el deshacer y la publicación. Solo quedarían de Nx el commit, el tag y escribir dos archivos, unas pocas líneas propias.

## Decisiones

| Decisión                                                                                                            | Alternativa descartada y por qué                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1. Herramienta propia en TypeScript que usa `git` y `npm` con `child_process`.                                     | `nx release`: ver el análisis. Configurarlo (`perf`, `useCommitScope: false`, renderer propio) no arregla qué commits cuentan ni la publicación con 2FA en el navegador.                                                                                                                                                                        |
| D2. Proyecto Nx `tools/release`, con build `@nx/js:tsc`, Jest y ESLint y la configuración copiada de la lib a mano. | Scripts `.mjs`: sin tipos, tests ni lint, contra el estilo de `CLAUDE.md`. Dentro de `libs/nest-tools`: sus cambios contarían como commits de la lib. TypeScript ejecutado por Node: depende de su versión y obliga a importar con `.ts`, que choca con ts-jest. Generador `@nx/js:library`: toca `tsconfig.base.json` y puede tocar `nx.json`. |
| D3. Scripts del `package.json` raíz que compilan y llaman a `node`.                                                 | Targets de Nx (`nx run release-tools:release`): el task runner y su TUI se quedan la terminal que npm necesita para la 2FA, y la release lanzaría Nx dentro de una tarea de Nx.                                                                                                                                                                 |
| D4. Commits de la lib con `git log <tag>..HEAD -- libs/nest-tools/`.                                                | El grafo de afectados de Nx: cuenta cambios de `tsconfig.base.json`, del `package.json` raíz y del lock (análisis).                                                                                                                                                                                                                             |
| D5. Analizador propio de Conventional Commits.                                                                      | Importar el de Nx: es API interna sin garantías, no reconoce `BREAKING-CHANGE` y no corta en `Claude-Session:`.                                                                                                                                                                                                                                 |
| D6. E/S inyectada (`ReleaseDeps`) para probar el orden, las paradas y el deshacer sin git ni red.                   | Probar solo las funciones puras: FR-4 y FR-9 quedarían solo con comandos manuales lentos.                                                                                                                                                                                                                                                       |
| D7. Remoto con `git fetch origin main`, y tags con `git ls-remote`.                                                 | Solo `ls-remote` también para la rama: no trae los commits para comparar. `fetch` solo consulta (NFR-3) y no toca el árbol.                                                                                                                                                                                                                     |
| D8. Tag anotado y `git push --atomic origin main <tag>`.                                                            | Tag ligero: sin fecha ni autor. `--follow-tags` o dos push: no son atómicos, y un fallo dejaría la rama sin su tag (FR-10).                                                                                                                                                                                                                     |
| D9. Deshacer: `--soft` y restaurar los dos archivos (automático); `git reset --keep` (comando impreso).             | `git reset --hard`: borraría cualquier otro cambio local.                                                                                                                                                                                                                                                                                       |
| D10. Build de publicación con `--skip-nx-cache`; `clean` (por defecto `true`) borra `dist/libs/nest-tools` antes.   | `--skip-remote-cache`: solo evita la caché remota. Quitar Nx Cloud de `nx.json`: NFR-3 lo deja como está. Con `--skip-nx-cache` Nx no lee ninguna caché (`src/tasks-runner/task-orchestrator.js:203-204` de `nx`), esté o no conectado (el 401).                                                                                                |
| D11. Publicar con `npm publish --tag latest` desde `dist/libs/nest-tools`, con la terminal heredada.                | `nx release publish`: sin entrada, solo admite `--otp`. `pnpm publish`: añade sus propias comprobaciones de git y rama, que no encajan con publicar desde un tag. Un token en el repositorio: lo prohíbe NFR-1.                                                                                                                                 |
| D12. Quitar `private` en cada release si está (solo lo tiene antes de la primera).                                  | Quitarlo solo cuando no hay tags: una rama más para el mismo resultado; así ningún tag lo lleva (FR-8).                                                                                                                                                                                                                                         |
| D13. Parar con error desde la 1.0.0.                                                                                | Extender las reglas: está fuera de alcance, y en 1.x el principio 7 cambia.                                                                                                                                                                                                                                                                     |
| D14. `--outputStyle=static` en los Nx que lanza la herramienta.                                                     | La TUI: borra la pantalla y el log de la comprobación que falla se pierde.                                                                                                                                                                                                                                                                      |

## Estrategia de tests

**Jest, unitarios sin git ni red** (`tools/release/src/lib/*.spec.ts`). Los de `release` y `publish` usan un `ReleaseDeps` falso que responde por comando y registra las llamadas. No hay Nest, así que no aplican `@nestjs/testing` ni los tests de integración. Nombres:

- `conventional-commit.spec.ts`:
  - `FR-1 parses type, description and breaking marks` (`!`, `BREAKING CHANGE:`, `BREAKING-CHANGE:`, `Feat:`, y el pie termina en `Co-Authored-By:`).
  - `FR-1 ignores messages that do not follow Conventional Commits`.
- `version.spec.ts`:
  - `FR-1 bumps the patch for feat, fix and perf on 0.x`.
  - `FR-1 bumps the minor for a breaking change of any type`.
  - `FR-1 bumps the version only once per release`.
  - `FR-1 takes the highest nest-tools@x.y.z tag as the last tag` (`0.10.0` > `0.9.0`; ignora `v1.0.0`, `nest-tools@1.0` y `other@2.0.0`).
  - `FR-1 refuses to compute versions from 1.0.0`.
  - `FR-3 returns no version when no commit bumps it` (`docs`, `chore`, `refactor`, `test`, `build`, `ci`, `style`, `revert` y mensajes libres).
  - `FR-9 reads remote tags with their peeled commit`.
- `changelog.spec.ts`:
  - `FR-2 first release section has the single entry "Initial release"`.
  - `FR-7 section title has the version and the UTC date` (`2026-11-20T23:30:00-05:00` da `2026-11-21`).
  - `FR-7 lists breaking changes first with their footer text`.
  - `FR-7 lists each bumping commit once with its description only` (sin scope, hash ni autor; sin `chore`, `docs` ni `revert`; un `feat!` no sale en `Features`).
  - `FR-7 creates the file with its title and adds new sections above the previous ones`.
- `release.spec.ts`:
  - `FR-2 first release uses 0.1.0 without reading commits`.
  - `FR-3 stops before the checks when nothing bumps the version`.
  - `FR-5 dry run shows version and section without checks, network or changes`.
  - `FR-4 stops at the first failing check, in order, without changing files`, con un caso por fallo: archivo modificado, archivo sin seguimiento, otra rama, `HEAD` suelto, `fetch` sin conexión, faltan commits de `origin/main`, `run-many` en rojo, tag local y tag remoto.
  - `FR-4 goes on with local commits not pushed yet`.
  - `FR-4 undoes its own changes and names the step when a later step fails`, con fallos al escribir el CHANGELOG, en el `commit` y en el `tag`.
  - `FR-6 commits the manifest and the changelog in one chore(release) commit and tags it`.
  - `FR-6 prints the atomic push command and the undo command`.
  - `FR-8 removes private and keeps the other manifest fields`.
  - `NFR-3 neither the dry run nor the release push or call npm`.
- `publish.spec.ts`:
  - `FR-9 stops without publishing when a precondition fails`, con un caso por fallo: árbol sucio, archivo sin seguimiento, sin tag en `HEAD`, tag fuera de `origin`, tag remoto en otro commit, hay una versión más alta (local o remota), `HEAD` fuera de `origin/main` y `fetch` fallido.
  - `FR-9 builds without cache and publishes from dist with the latest tag`.
  - `FR-10 a failed or repeated publish creates no commit, tag or version`.
  - `NFR-1 publishes with the maintainer session only` (`npm publish --tag latest`, sin `--otp` ni tokens).

**e2e en `nest-tools-app`:** nada nuevo; la release ejecuta el e2e existente como comprobación previa.

**Comandos de verificación (FR de proceso, principio 2).** Se lanzan desde la raíz con permiso del usuario. V7 y la segunda ejecución de V6 las lanza solo el mantenedor, y el push de la release (rama y tag) y la publicación en npm (V9) los lanza siempre el mantenedor, nunca un agente.

- **V0 (requisito previo).** `grep -n "perf" docs/constitution.md` y `node -p "require('./libs/nest-tools/package.json').files"`. Se espera: el principio 7 con `perf`, y `CHANGELOG.md` en `files`.
- **V1 (todos los FR por tests).** `pnpm nx run-many -t lint test build -p release-tools`. Se espera: verde, y `dist/tools/release/src/main.js` existe.
- **V2 (FR-2, FR-5, NFR-3).** Antes de la primera release: `git status --porcelain --untracked-files=all`, `pnpm run release:dry-run`, otra vez `git status --porcelain --untracked-files=all` y `git tag --list 'nest-tools@*'`. Se espera:
  - la salida tiene `0.1.0`, la fecha UTC de hoy y `- Initial release`, sin comprobaciones;
  - el estado es el mismo antes y después, y no hay tags.
- **V3 (FR-1, FR-3, FR-7 con git real).** En una copia del scratchpad, solo con el ensayo: no ejecuta `pnpm` ni toca el repositorio. El script:
  - `root=$PWD; tmp=$(mktemp -d); git clone -q "$root" "$tmp/repo" && cd "$tmp/repo" && git tag nest-tools@0.1.0`;
  - por cada paso: un `echo >> <archivo>`, un `git commit -qam '<mensaje>'` y `node "$root/dist/tools/release/src/main.js" release --dry-run`.

  Pasos, en orden, y lo que se espera:
  1. `feat: app only` sobre `apps/nest-tools-app/src/main.ts`: nada que publicar.
  2. `fix: workspace only` sobre `tsconfig.base.json`: nada que publicar.
  3. `docs(nest-tools): readme` sobre `libs/nest-tools/README.md`: nada que publicar.
  4. `Update index` sobre `libs/nest-tools/src/index.ts`: nada que publicar.
  5. `fix: lib and app` sobre la lib y la app: 0.1.1, con esa entrada en `Fixes`.
  6. `perf: faster` sobre la lib: sigue la 0.1.1, con `Performance`.
  7. `refactor!: drop option` con `-m 'BREAKING CHANGE: option x removed'` sobre la lib: 0.2.0, con `Breaking changes` primero y el texto del pie; sin las entradas de los pasos 1 a 4.
  8. `git tag -d nest-tools@0.1.0`: 0.1.0 con `Initial release` (FR-2).

  Al terminar, se borra la copia.

- **V4 (FR-4, comprobaciones que fallan pronto).** Tres casos en el repositorio real, con `git status`, `git rev-parse HEAD` y `git tag --list 'nest-tools@*'` sin cambios tras cada uno:
  - `touch release-check.tmp && pnpm run release; rm release-check.tmp`: para en el árbol limpio.
  - `git switch -c release-check && pnpm run release; git switch main && git branch -D release-check`: para en la rama.
  - `GIT_ALLOW_PROTOCOL=file pnpm run release`: para en el remoto, como sin conexión.
- **V5 (FR-4, paso posterior que falla).** Tras K4: `printf '#!/bin/sh\nexit 1\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit && pnpm run release; rm .git/hooks/pre-commit`. Se espera:
  - pasa las comprobaciones (minutos, con el e2e) y dice que falló `git commit` y que deshizo sus cambios;
  - `git status --porcelain --untracked-files=all` vacío, el mismo `HEAD` y ningún tag.

  Si la release llegara a terminar, se deshace con el comando que imprime.

- **V6 (FR-9, paradas reales).** `pnpm run release:publish` dos veces. Se espera:
  - en `main` antes de la release: para porque el commit actual no tiene tag. La puede lanzar un agente, porque `private: true` frena a npm;
  - tras V7, antes del push: para porque el tag no está en `origin`. La lanza el mantenedor, y la sesión principal solo comprueba después su salida, porque tras la release ya no hay marca de privado y un fallo de la herramienta llegaría a npm;
  - en los dos casos, sin compilar ni llamar a npm.
- **V7 (FR-2, FR-6 a FR-8, NFR-3; la lanza el mantenedor).** `pnpm run release`. Después:
  - `git log -1 --format=%s` da `chore(release): nest-tools@0.1.0`;
  - `git show --name-only --format= HEAD` da solo los dos archivos;
  - `git show HEAD -- libs/nest-tools/package.json` solo cambia `version` y quita `private`;
  - `git tag --points-at HEAD` da `nest-tools@0.1.0`, y `git cat-file -t nest-tools@0.1.0` da `tag`;
  - `libs/nest-tools/CHANGELOG.md` cumple el formato;
  - `git status --porcelain --untracked-files=all` está vacío;
  - `git ls-remote --tags origin 'nest-tools@*'` está vacío (sin push);
  - la salida trae el push atómico y el comando de deshacer.
- **V8 (FR-7, FR-8: el paquete).** Tras V7:
  - `pnpm nx run nest-tools:build --skip-nx-cache --outputStyle=static`;
  - V2 y V3a del plan 001: versión 0.1.0, sin `private`, 28 archivos con `CHANGELOG.md`;
  - con permiso, `cd dist/libs/nest-tools && npm publish --dry-run --tag latest`: espera `latest` y acceso público, sin el error de `private`.
- **V9 (FR-9, FR-10, NFR-1; lo lanza el mantenedor).**
  - `git push --atomic origin main nest-tools@0.1.0`. Si falla, se repite el mismo comando; `git ls-remote origin main 'nest-tools@*'` muestra las dos referencias o ninguna.
  - `pnpm run release:publish`, con la 2FA.
  - `npm view @brickstodev/nest-tools dist-tags.latest` da `0.1.0`.
  - En un directorio vacío del scratchpad, `npm pack @brickstodev/nest-tools@0.1.0 --dry-run` lista `CHANGELOG.md`.
  - Opcional: repetir `pnpm run release:publish` hace que npm rechace la versión repetida y no cambie nada.
- **V10 (FR-3 tras la primera release).** `pnpm run release:dry-run` y `pnpm run release`. Se espera: `Nothing to release since nest-tools@0.1.0`, código 0, sin salida de Nx y el estado sin cambios.
- **V11 (NFR-1).** `git ls-files | grep -iE '(^|/)\.npmrc$'` y `git grep -nE '_authToken|NPM_TOKEN|NODE_AUTH_TOKEN' -- ':!specs'`. Se espera: sin resultados.
- **V12 (NFR-2).** `git diff <commit-antes-de-T1> -- pnpm-lock.yaml libs/nest-tools/package.json` vacío antes de V7, y `git diff <commit-antes-de-T1> -- package.json` solo con `scripts`.

## Demostración en la app de pruebas

No aplica: la spec no es una herramienta de la librería (su contexto lo dice), así que no hay rutas, e2e propio ni prueba con `curl`.

## Riesgos por comprobar

Lo que no se puede confirmar leyendo el código, con el comando que lo comprueba (la sesión principal, con permiso del usuario):

- **K1. `--skip-nx-cache` compila de verdad con `nxCloudId` y el 401.** `pnpm nx run nest-tools:build --skip-nx-cache --outputStyle=static`: sin `[local cache]`, `[remote cache]` ni «existing outputs match the cache».
- **K2. Nx 24 acepta `--outputStyle=static` sin TUI.** `pnpm nx run-many -t lint -p nest-tools --outputStyle=static`: el log queda en la terminal.
- **K3. La 2FA de npm con la terminal heredada (código o navegador).** Solo se prueba en V9. Antes: `node --version && npm --version && git --version`, `npm whoami` (lo lanza el mantenedor) y la parte de V8 con `npm publish --dry-run`. Resultado (2026-11-18): desde un terminal interactivo la 2FA funciona (confirmación en el navegador); lanzado con `!` desde Claude Code no hay terminal interactivo y npm sale con `EOTP` sin publicar nada, así que `release:publish` se lanza siempre desde un terminal de verdad. Tras el `PUT 202`, un paquete nuevo puede tardar unos minutos en verse en el registro.
- **K4. Hooks de git antes de V5.** `ls .git/hooks | grep -v '\.sample$'`: si ya hay un `pre-commit`, se guarda una copia y se restaura después.
- **K5. `@nx/js:tsc` sin manifiesto (`generatePackageJson: false`) y con `rootDir` en la raíz del proyecto.** Se comprueba en V1: `ls dist/tools/release/src/main.js`.
- **K6. El formato del manifiesto se conserva.** Se comprueba en V7 con `git show HEAD -- libs/nest-tools/package.json`.

## Cobertura de la spec

| Requisito | Dónde                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------- |
| FR-1      | `conventional-commit.ts`, `version.ts`, `release.ts`; tests FR-1; V3                                  |
| FR-2      | `version.ts`, `changelog.ts`, `release.ts`; tests FR-2; V2, V3 (paso 8), V7                           |
| FR-3      | `version.ts`, `release.ts`; tests FR-3; V3, V10                                                       |
| FR-4      | `release.ts`, `node-deps.ts`; tests FR-4; V4, V5                                                      |
| FR-5      | `release.ts`, `main.ts`, script `release:dry-run`; test FR-5; V2, V3                                  |
| FR-6      | `release.ts`, script `release`; tests FR-6; V7                                                        |
| FR-7      | `changelog.ts`, `conventional-commit.ts`; tests FR-7; V3, V7, V8, V9                                  |
| FR-8      | `release.ts`; test FR-8; V7, V8                                                                       |
| FR-9      | `publish.ts`, `version.ts`, script `release:publish`; tests FR-9; V6, V8, V9                          |
| FR-10     | `publish.ts`, push atómico (D8); test FR-10; V9                                                       |
| NFR-1     | `publish.ts` (sin tokens ni `--otp`); test NFR-1; V11                                                 |
| NFR-2     | Sin dependencias nuevas (solo `scripts` y el proyecto `tools/release`); V12                           |
| NFR-3     | `release.ts` (sin push ni npm; solo `fetch` y `ls-remote`), `nx.json` sin cambios; test NFR-3; V2, V7 |
