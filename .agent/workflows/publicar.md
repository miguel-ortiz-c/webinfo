---
description: /publicar - Fusiona la rama de desarrollo con main y la sube a producción
---
# Flujo de trabajo: /publicar

Este comando se utiliza cuando se ha terminado una funcionalidad importante o un módulo completo, y el usuario quiere pasar los cambios a la rama estable principal (`main`).

1. Asegúrate de que todos los cambios locales en la rama `desarrollo` estén guardados y subidos.
// turbo-all
2. Cambia a la rama principal: `git checkout main`
3. Actualiza main por si acaso: `git pull origin main`
4. Fusiona los cambios de desarrollo a main: `git merge desarrollo`
5. Sube la rama main actualizada a la nube: `git push origin main`
6. Vuelve inmediatamente a la rama de trabajo continuo: `git checkout desarrollo`

Al finalizar, celebra con el usuario que la nueva versión está en producción y recuérdale que automáticamente ha regresado a la rama `desarrollo` para seguir trabajando seguro.
