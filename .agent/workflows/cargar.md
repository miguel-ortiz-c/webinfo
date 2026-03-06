---
description: /cargar - Descarga el último progreso de la rama de desarrollo
---
# Flujo de trabajo: /cargar

Este comando se utiliza cuando el usuario inicia sesión en una computadora diferente (ej. llega a la oficina desde su casa) y necesita sincronizar el código con lo último que se subió.

1. Asegúrate de que no haya cambios locales sin guardar que puedan causar conflictos. Si los hay, advierte al usuario.
// turbo-all
2. Ejecuta `git checkout desarrollo` (Si la rama no existe localmente, ejecuta `git fetch` y luego `git checkout -b desarrollo origin/desarrollo`).
3. Ejecuta `git pull origin desarrollo` para traer los últimos cambios.
4. Si el `git pull` detecta que archivos críticos han cambiado (como `package.json`), ejecuta `npm install`.

Al finalizar, confirma al usuario que el proyecto está sincronizado y listo para trabajar.
