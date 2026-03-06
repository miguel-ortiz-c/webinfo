import { state, API_URL } from '../config.js';
import { projectsService } from '../services/projects.service.js';
import { guardarProyectoDescargado, borrarProyectoDescargado, isProyectoDescargado } from '../utils/offline-sync.js';

export function renderProjectList(projects) {
    const container = document.getElementById('projects-grid');
    const emptyState = document.getElementById('empty-state');

    container.innerHTML = '';

    if (!projects || projects.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    projects.forEach(p => {
        // PERMISO BORRAR: Solo Admin y Cliente
        const canDelete = state.user.role === 'admin' || state.user.role === 'cliente';

        // Botón Eliminar (Rojo) - Solo visible para admins/clientes
        const btnDelete = canDelete
            ? `<button onclick="window.handleDeleteProject(event, ${p.id})" class="text-gray-300 hover:text-red-500 bg-white rounded-full p-2 shadow-sm transition" title="Eliminar Proyecto"><i data-feather="trash-2" width="16"></i></button>`
            : '';

        // Offline Download Button
        const btnOffline = `
            <button onclick="window.toggleOffline(event, ${p.id})" id="btn-offline-${p.id}" class="text-gray-300 hover:text-green-500 bg-white rounded-full p-2 shadow-sm transition" title="Descargar para uso Offline">
                <i data-feather="cloud-drizzle" width="16" id="icon-offline-${p.id}"></i>
            </button>
        `;

        const htmlCodigoCliente = p.codigo_cliente
            ? `<span class="ml-2 text-[11px] font-bold text-red-600 tracking-wide font-mono">(${p.codigo_cliente})</span>`
            : '';

        const card = document.createElement('div');
        card.className = "bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition relative cursor-pointer group animate-fade-in flex flex-col justify-between";

        card.onclick = () => { if (window.abrirViewer) window.abrirViewer(p.id); };

        card.innerHTML = `
            <div class="absolute top-4 right-4 flex gap-2 z-20">
                ${btnOffline}
                ${btnDelete}
            </div>

            <div class="flex items-start mb-3">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-xl mr-3 shrink-0">
                    <i data-feather="folder"></i>
                </div>
                <div class="min-w-0 flex-1 pr-16">
                    <div class="flex items-center flex-wrap mb-1">
                        <span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            ${p.codigo_proyecto || 'PENDIENTE'}
                        </span>
                        ${htmlCodigoCliente}
                    </div>
                    <h3 class="font-bold text-gray-800 text-lg leading-tight truncate w-full" title="${p.empresa}">
                        ${p.empresa}
                    </h3>
                    <p class="text-xs text-gray-500 font-medium truncate w-full mt-0.5">
                        ${p.distrito ? p.distrito.toUpperCase() : 'SIN DISTRITO'}
                    </p>
                </div>
            </div>

            <div class="border-t border-gray-100 pt-3 mt-1 grid grid-cols-2 gap-y-2 gap-x-1 text-xs">
                <div class="flex items-center min-w-0" title="Encargado Cliente">
                    <i data-feather="user-check" width="13" class="mr-1.5 text-purple-600 shrink-0"></i>
                    <span class="text-gray-600 truncate font-semibold">${p.encargado || '--'}</span>
                </div>
                <div class="flex items-center min-w-0" title="Técnico Responsable">
                    <i data-feather="tool" width="13" class="mr-1.5 text-blue-500 shrink-0"></i>
                    <span class="text-gray-600 truncate font-semibold">${p.tecnico || '--'}</span>
                </div>
                <div class="flex items-center min-w-0" title="Fecha Inicio">
                    <div class="w-3 h-3 rounded-full bg-green-500 mr-2 shrink-0 border border-green-600 shadow-sm"></div>
                    <span class="text-gray-500 truncate font-mono">${p.fecha_inicio || '--'}</span>
                </div>
                <div class="flex items-center min-w-0" title="Fecha Fin">
                    <div class="w-3 h-3 rounded-full bg-red-500 mr-2 shrink-0 border border-red-600 shadow-sm"></div>
                    <span class="text-gray-500 truncate font-mono">${p.fecha_fin || '--'}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Validar visualmente el estado de las descargas 
    validarEstadoBotonesOffline(projects);

    if (window.feather) window.feather.replace();
}

// --- FUNCIONES EXPUESTAS AL DOM ---

window.handleDeleteProject = async (e, id) => {
    e.stopPropagation();
    if (!(await window.sysConfirm("¿Eliminar proyecto?"))) return;
    const success = await projectsService.delete(id);
    if (success) {
        const input = document.getElementById('global-search');
        const term = input ? input.value : '';
        const nuevosProyectos = await projectsService.getAll(term);
        renderProjectList(nuevosProyectos);
    } else {
        await window.sysAlert("Error al eliminar");
    }
};

// Offline Button Logic
window.toggleOffline = async (e, projectId) => {
    e.stopPropagation();
    const btn = document.getElementById(`btn-offline-${projectId}`);

    if (btn.classList.contains('text-green-500')) {
        btn.innerHTML = `<i data-feather="loader" width="16" class="animate-spin text-gray-400"></i>`;
        if (window.feather) feather.replace();

        try {
            // 1. Borrar textos e info del celular (IndexedDB)
            await borrarProyectoDescargado(projectId);

            // 2. Borrar las fotos descargadas de la caché para liberar espacio
            if ('caches' in window) {
                await caches.delete(`proyecto-${projectId}-fotos`);
            }

            btn.classList.remove('text-green-500');
            btn.classList.add('text-gray-300');
            btn.innerHTML = `<i data-feather="cloud-drizzle" width="16"></i>`;
        } catch (error) {
            console.error(error);
            await window.sysAlert("Error al liberar espacio: " + error.message);
            btn.innerHTML = `<i data-feather="check-circle" width="16"></i>`; // Regresar a verde si falló
        }

    } else {
        // Download logic
        btn.innerHTML = `<i data-feather="loader" width="16" class="animate-spin text-blue-500"></i>`;
        if (window.feather) feather.replace();

        try {
            // Security Verification: HTTPS requirement for Cache API
            if (!('caches' in window)) {
                throw new Error("Local cache unavailable in current environment.");
            }

            // A. Fetch base info
            const resInfo = await fetch(`${API_URL}/informes/archivos/${projectId}`);
            if (!resInfo.ok) throw new Error("Fallo al conectar (Info).");
            const dataInfo = await resInfo.json();

            const resLog = await fetch(`${API_URL}/logistica/${projectId}`);
            const dataLogistica = resLog.ok ? await resLog.json() : null;

            // B. Fetch recursive evidence tree
            const resExp = await fetch(`${API_URL}/informes/explorar/${projectId}?filter=fotos&path=Evidencias&recursive=true`);
            const dataExpCompleta = resExp.ok ? await resExp.json() : null;

            // C. Bundle offline package using non-recursive tree for view
            const resExpVisual = await fetch(`${API_URL}/informes/explorar/${projectId}?filter=fotos&path=Evidencias`);
            const dataExpVisual = resExpVisual.ok ? await resExpVisual.json() : null;

            const paqueteOffline = {
                info: dataInfo.datos,
                logistica: dataLogistica,
                explorador: dataExpVisual // Guardamos la vista normal para que el menú principal cargue bien
            };

            // D. Collect all photo URLs
            const urlsToCache = [];
            const root = dataInfo.datos.ruta_carpeta;

            const baseUrl = window.location.origin;

            // Usamos la lista completa (recursiva) para descargar las fotos
            if (dataExpCompleta && dataExpCompleta.items) {
                dataExpCompleta.items.forEach(i => {
                    if (i.type !== 'folder') {
                        urlsToCache.push(`${baseUrl}/uploads/${root}/${i.path}`);
                    }
                });
            }
            if (dataLogistica && dataLogistica.fotos) {
                if (dataLogistica.fotos.salida) dataLogistica.fotos.salida.forEach(f => urlsToCache.push(`${baseUrl}/uploads/${root}/Logistica/Guias_Salida/${f}`));
                if (dataLogistica.fotos.entrada) dataLogistica.fotos.entrada.forEach(f => urlsToCache.push(`${baseUrl}/uploads/${root}/Logistica/Guias_Entrada/${f}`));
            }

            console.log(`Descargando ${urlsToCache.length} fotos a la memoria del teléfono...`, urlsToCache);

            // E. DESCARGAR FOTOS (Caché del celular)
            if (urlsToCache.length > 0) {
                const cache = await caches.open(`proyecto-${projectId}-fotos`);
                // Descargamos en paralelo para que sea más rápido
                await Promise.all(urlsToCache.map(url => cache.add(url).catch(e => console.warn("No se pudo cachear", url))));
            }

            // F. GUARDAR TEXTOS (IndexedDB)
            await guardarProyectoDescargado(projectId, paqueteOffline);

            // ÉXITO
            btn.classList.remove('text-gray-300');
            btn.classList.add('text-green-500');
            btn.innerHTML = `<i data-feather="check-circle" width="16"></i>`;

        } catch (error) {
            console.error("Error exacto de descarga:", error);
            await window.sysAlert(`Error al descargar:\n${error.message}`);
            btn.innerHTML = `<i data-feather="cloud-drizzle" width="16"></i>`;
        }
    }
    if (window.feather) feather.replace();
};

async function validarEstadoBotonesOffline(projects) {
    for (const p of projects) {
        const isDownloaded = await isProyectoDescargado(p.id);
        if (isDownloaded) {
            const btn = document.getElementById(`btn-offline-${p.id}`);
            if (btn) {
                btn.classList.remove('text-gray-300');
                btn.classList.add('text-green-500');
                btn.innerHTML = `<i data-feather="check-circle" width="16"></i>`;
            }
        }
    }
    if (window.feather) feather.replace();
}