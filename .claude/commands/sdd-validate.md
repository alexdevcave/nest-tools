---
description: SDD · Valida la spec FR por FR (tests, build y e2e)
agent: accept edits
---

Recorre specs/$0/spec.md requisito a requisito. Para cada FR indica qué test lo cubre y el resultado de ejecutarlo con pnpm nx run-many -t test -p nest-tools,nest-tools-app.

Los FR que los tests unitarios no pueden verificar compruébalos con `pnpm nx run nest-tools-app-e2e:e2e` (la herramienta usada en `nest-tools-app`) o con `pnpm nx run nest-tools:build` (lo que solo muestra el paquete compilado, como los tipos exportados o el `package.json`).

Comprueba también la demostración en la app de pruebas (principio 4): que cada caso de la spec tiene su ruta en `nest-tools-app` y su e2e en verde, y que la comprobación funcional a mano (la app arrancada y `curl`) está hecha.

Si algún FR no está cubierto o falla, dilo con claridad. NO arregles nada todavía. Después revisa los criterios de finalización y dame un veredicto: ¿se cumple la spec?
