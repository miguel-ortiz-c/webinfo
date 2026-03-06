# 🤖 INSTRUCCIONES DEL SISTEMA PARA EL ASISTENTE IA (Everytel)

Este documento contiene las reglas fundamentales, convenciones y el contexto arquitectónico del proyecto. 
**Como Inteligencia Artificial, DEBES leer este archivo al iniciar cualquier nueva sesión de trabajo para mantener la consistencia.**

---

## 1. Contexto del Proyecto
- **Nombre/Propósito:** Plataforma web corporativa/sistema interno.
- **Tecnologías Core:** 
  - Frontend: HTML5, CSS3, JavaScript (Vanilla JS), Tailwind CSS (vía CDN temporalmente).
  - Backend: Node.js (con Express presumiblemente) y almacenamiento de archivos local (`/uploads`).
- **Arquitectura Frontend:** Basada en componentes funcionales separados en la carpeta `frontend/js/components/` (ej: `ViewerLogistica.js`, `ViewerTabs.js`). Los eventos globales se manejan en `frontend/js/core/events.js`.

## 2. Reglas de Desarrollo (¡Cumplimento Obligatorio!)

### 🎨 Frontend & UI
1. **Evitar Frameworks Reactivos:** No introduzcas React, Vue, o Angular. El proyecto funciona con Vanilla JS manipulando el DOM directamente o reconstruyendo plantillas literales (Template Literals).
2. **Estilos y Tailwind:** Se usan clases utilitarias de Tailwind. Evita escribir CSS personalizado en `styles.css` a menos que sea una animación compleja o algo imposible de lograr con Tailwind.
3. **Modales y Popups:** Los modales deben usar siempre un "backdrop" (fondo oscuro semi-transparente) y tener implementado el cierre con la tecla `ESC` o haciendo clic fuera de ellos.
4. **Validación de Entradas:** Al guardar nombres de archivos o comentarios manejados por el usuario, sanitiza siempre los textos eliminando símbolos especiales que rompan las rutas de servidor (ej: `/ \ : * ? " < > |`).

### ⚙️ Lógica & JavaScript
5. **Namespaces Globales:** Usa el objeto `window` para exponer funciones que necesiten ser llamadas directamente desde el HTML (ej: `onclick="window.subirEvidencia(...)"`).
6. **Promesas y Async/Await:** Usa siempre `async/await` para llamadas de red (fetch API).
7. **Modo Offline:** El proyecto tiene capacidades de PWA/Offline (`offline-sync.js`, Service Workers). Siempre que diseñes una función de guardado, asume que la red podría estar inestable. Si falla el `fetch`, implementa un "fallback" que permita al usuario reintentar o que guarde el estado temporalmente.

### 🐙 Git & Control de Versiones
8. **Conventional Commits y Flujo de Trabajo (Workflows):**
   - Todos los mensajes de commit deben estar en **inglés** sin excepción y seguir el estándar (ej. `feat:`, `fix:`, `refactor:`).
   - **NUNCA** hagas push directamente a `main` al guardar progreso. El trabajo continuo entre máquinas (casa-oficina) se sincroniza usando la rama `desarrollo`. Solo pasamos a `main` cuando una funcionalidad está 100% terminada y probada.
   - Existen **cuatro comandos (workflows)** en la carpeta `.agent/workflows/` que automatizan este flujo. Cuando el usuario use las palabras clave `/guardar`, `/cargar`, `/publicar` o `/comandos`, debes ejecutar la instrucción de esa carpeta.
9. **Archivos Ignorados:** Nunca subas la carpeta `control_versiones/`, ni directorios `node_modules/`, ni las fotos reales de pruebas de la carpeta `backend/uploads/`.

## 3. Flujo de Trabajo con la IA
- **Antes de programar:** Revisa siempre los archivos de la carpeta `components/` relevantes a tu tarea para imitar el patrón de código existente.
- **Actualización de este archivo:** Si tú, como IA, y el usuario acuerdan una nueva regla arquitectónica permanente (por ejemplo, cambiar la forma en que se manejan las fechas globalmente), **debes proponer actualizar este archivo (`SYSTEM_INSTRUCTIONS.md`)** para que los futuros asistentes lo sepan.
