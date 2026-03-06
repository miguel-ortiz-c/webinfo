---
description: /comandos - Muestra la lista de comandos de automatización de Git
---
# Flujo de trabajo: /comandos (o /ayuda-git)

Este comando se ejecuta cuando el usuario necesita recordar cómo interactuar con los flujos de trabajo de versión de control.

Responde al usuario SIEMPRE con el siguiente texto exacto y claro:

```markdown
🤖 **Tus comandos mágicos para Git están listos:**

*   **`/guardar`**: Usa esto cuando termines de trabajar. Automáticamente revisaré qué hiciste, redactaré un commit formal en inglés, me aseguraré de estar en la rama `desarrollo` y empujaré tu código a la nube.
*   **`/cargar`**: Usa esto cuando llegues a otra computadora. Descargaré todo lo nuevo de la rama `desarrollo` para que tengas tu último avance.
*   **`/publicar`**: Usa esto solo cuando algo esté 100% terminado y validado. Fusinaré tus pruebas de `desarrollo` hacia la rama estable `main` y luego te regresaré a `desarrollo`.
```
