---
description: /guardar - Guarda y sube todos los cambios a la rama de desarrollo
---
# Flujo de trabajo: /guardar

Este comando se utiliza cuando el usuario ha terminado de trabajar en la computadora actual y quiere guardar su progreso en la nube.
Se debe asegurar que siempre se use la rama `desarrollo` y que los mensajes de commit estén en inglés usando Conventional Commits.

1. Revisa qué archivos han cambiado usando `git status`.
2. Analiza las diferencias (`git diff`) si es necesario para entender qué hizo el usuario hoy.
3. Redacta mentalmente un mensaje de commit **SIEMPRE EN INGLÉS** siguiendo el estándar Conventional Commits (ej. `feat: add awesome feature` o `fix: correct login bug`).
4. **NO PIDAS CONFIRMACIÓN AL USUARIO**. Procede inmediatamente y de forma automática con los siguientes pasos.
// turbo-all
5. Ejecuta `git add .`
6. Ejecuta `git commit -m "[el mensaje redactado en inglés]"`
7. Ejecuta `git push origin desarrollo` (Si la rama no existe en el remoto, propón usar `git push -u origin desarrollo`).

Al finalizar, muéstrale al usuario el mensaje de commit que usaste y confírmale que su código está a salvo en la nube.
