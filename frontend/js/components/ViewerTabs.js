import { API_URL, state } from '../config.js';
import { openLightbox } from './Lightbox.js';
import { scanFiles } from '../utils/file-scanner.js';
import { projectsService } from '../services/projects.service.js';
import { leerProyectoDescargado, uploadOrQueue, comprimirFoto, obtenerPendientesProyecto } from '../utils/offline-sync.js';

let activeReportId = null;
let currentBrowserPath = 'Evidencias';
let currentTab = 'fotos';

window.evidenciasSeleccionadas = [];

export function initTabs(reportId) {
    activeReportId = reportId;
    currentBrowserPath = 'Evidencias';
    currentTab = 'fotos';
    window.evidenciasSeleccionadas = [];


    setupExplorerDragAndDrop();
    switchTab('fotos');
}

// --- MOTOR DE LECTURA OFFLINE PURO (SIN MAPAS CORRUPTOS) ---
async function getOfflineDirectory(reportId, browserPath) {
    const paquete = await leerProyectoDescargado(reportId);
    if (!paquete || !paquete.info) return { items: [], rootFolder: '' };

    const rootFolder = paquete.info.ruta_carpeta;
    let cache;
    try {
        cache = await caches.open(`proyecto-${reportId}-fotos`);
    } catch (e) {
        return { items: [], rootFolder };
    }

    const cachedRequests = await cache.keys();
    const itemsMap = new Map();

    // Armamos la ruta base que estamos buscando de forma estricta
    let baseBusqueda = `/uploads/${rootFolder}/${browserPath}`;
    baseBusqueda = baseBusqueda.replace(/\/\//g, '/') + '/';

    cachedRequests.forEach(req => {
        const urlObj = new URL(req.url);
        const urlPath = decodeURIComponent(urlObj.pathname);

        // Verificamos rigurosamente si la URL pertenece a esta ruta
        if (urlPath.startsWith(baseBusqueda)) {
            const restoDeLaRuta = urlPath.substring(baseBusqueda.length);

            if (restoDeLaRuta) {
                const partes = restoDeLaRuta.split('/');

                if (partes.length > 1) {
                    // Hay subcarpetas, creamos el icono de carpeta
                    const folderName = partes[0];
                    if (!itemsMap.has(folderName)) {
                        itemsMap.set(folderName, {
                            name: folderName,
                            type: 'folder',
                            path: `${browserPath}/${folderName}`
                        });
                    }
                } else {
                    // Es un archivo directo en esta vista
                    const fileName = partes[0];
                    if (fileName.trim() !== '') {
                        itemsMap.set(fileName, {
                            name: fileName,
                            type: 'file',
                            path: `${browserPath}/${fileName}`
                        });
                    }
                }
            }
        }
    });

    return { items: Array.from(itemsMap.values()), rootFolder };
}

export async function switchTab(tab) {
    // Si es técnico, forzamos siempre la pestaña de fotos
    if (state.user.role === 'tecnico' && tab !== 'fotos') {
        tab = 'fotos';
    }
    currentTab = tab;

    // UI: Estilos de los botones
    ['fotos', 'word', 'pdf'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.add('bg-blue-100', 'text-blue-700', 'border-blue-200');
                btn.classList.remove('text-gray-500', 'hover:bg-gray-100', 'border-transparent');
            } else {
                btn.classList.remove('bg-blue-100', 'text-blue-700', 'border-blue-200');
                btn.classList.add('text-gray-500', 'hover:bg-gray-100', 'border-transparent');
            }
        }
    });

    // Control de Breadcrumbs (Migas de pan)
    const breadcrumbs = document.getElementById('browserBreadcrumbs');
    if (tab === 'fotos') {
        if (breadcrumbs) breadcrumbs.classList.remove('hidden');
    } else {
        if (breadcrumbs) breadcrumbs.classList.add('hidden');
        currentBrowserPath = 'Evidencias';
    }

    renderTabActions(tab);

    const container = document.getElementById('tab-content');
    if (container) container.innerHTML = '<div class="col-span-full text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p class="text-xs text-gray-400 mt-2">Cargando...</p></div>';

    try {
        let data;

        // LÓGICA INTELIGENTE: Si sabemos positivamente que no hay internet, vamos directo al motor offline
        if (!navigator.onLine) {
            console.log("Modo Offline detectado: Leyendo desde caché local...");
            data = await getOfflineDirectory(activeReportId, currentBrowserPath);
        } else {
            try {
                // Intento Online
                const res = await fetch(`${API_URL}/informes/explorar/${activeReportId}?filter=${tab}&path=${encodeURIComponent(currentBrowserPath)}`);
                if (!res.ok) throw new Error("Fetch explorador falló");
                data = await res.json();
            } catch (netErr) {
                // Fallback: Si falla (por red inestable), usamos el motor offline
                console.log("Fallo de red al explorar. Usando respaldo offline...");
                data = await getOfflineDirectory(activeReportId, currentBrowserPath);
            }
        }

        // Buscar fotos pendientes de subir en esta carpeta
        let pendientesCarpeta = [];
        try {
            const todosPendientes = await obtenerPendientesProyecto(activeReportId);
            pendientesCarpeta = todosPendientes.filter(p => p.tipo === `evidencias-${currentBrowserPath}`);
        } catch (e) { }

        if (tab === 'fotos') renderBreadcrumbs();
        renderFiles(data.items, data.rootFolder, pendientesCarpeta);

    } catch (e) {
        console.error("Error crítico explorando archivos:", e);
        if (container) container.innerHTML = '<p class="col-span-full text-center text-red-500 text-sm py-8">Proyecto no descargado o sin internet.</p>';
    }
}

async function navegar(path) {
    currentBrowserPath = path;
    const container = document.getElementById('tab-content');
    container.innerHTML = '<div class="col-span-full text-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>';

    try {
        let data;

        // LÓGICA INTELIGENTE: Si no hay internet, motor offline directo
        if (!navigator.onLine) {
            console.log("Modo Offline detectado: Navegando localmente...");
            data = await getOfflineDirectory(activeReportId, currentBrowserPath);
        } else {
            try {
                const res = await fetch(`${API_URL}/informes/explorar/${activeReportId}?filter=fotos&path=${encodeURIComponent(currentBrowserPath)}`);
                if (!res.ok) throw new Error();
                data = await res.json();
            } catch (netErr) {
                console.log("Fallo de red al navegar. Usando respaldo offline...");
                data = await getOfflineDirectory(activeReportId, currentBrowserPath);
            }
        }

        // Buscar fotos pendientes de subir en esta carpeta
        let pendientesCarpeta = [];
        try {
            const todosPendientes = await obtenerPendientesProyecto(activeReportId);
            pendientesCarpeta = todosPendientes.filter(p => p.tipo === `evidencias-${currentBrowserPath}`);
        } catch (e) { }

        renderBreadcrumbs();
        renderFiles(data.items, data.rootFolder, pendientesCarpeta);
    } catch (e) {
        console.error("Error al navegar:", e);
    }
}

function renderBreadcrumbs() {
    const c = document.getElementById('browserBreadcrumbs');
    if (!c) return;

    let h = `<span class="font-bold text-blue-700 cursor-pointer hover:underline flex items-center" onclick="window.navegar('Evidencias')"><i data-feather="home" width="12" class="mr-1"></i>Inicio</span>`;

    if (currentBrowserPath && currentBrowserPath !== 'Evidencias') {
        const p = currentBrowserPath.replace('Evidencias/', '').split('/').filter(x => x);
        let b = 'Evidencias';
        p.forEach((x, i) => {
            b += '/' + x;
            h += ` <span class="text-gray-300 mx-1">/</span> <span class="cursor-pointer hover:text-blue-600 font-medium text-gray-600 transition" onclick="window.navegar('${b}')">${x}</span>`;
        });
    }
    c.innerHTML = h;
    if (window.feather) feather.replace();
}

function renderFiles(items, rootFolder, pendientesFiles = []) {
    const container = document.getElementById('tab-content');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(items)) items = [];
    if (currentTab !== 'fotos') items = items.filter(i => i.type !== 'folder');

    if (items.length === 0 && pendientesFiles.length === 0) {
        let msg = 'No hay archivos aquí.';
        container.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">${msg}</div>`;
        return;
    }

    items.sort((a, b) => a.type === 'folder' ? -1 : 1);
    const canManage = state.user.role !== 'tecnico';

    items.forEach(item => {
        const url = `${API_URL.replace('/api', '')}/uploads/${rootFolder}/${item.path}`;
        const isImg = item.name.match(/\.(jpg|jpeg|png|webp)$/i);
        const isPdf = item.name.endsWith('.pdf');
        const isWord = item.name.endsWith('.docx');
        const isDir = item.type === 'folder';

        const el = document.createElement('div');
        el.className = "flex flex-col items-center p-3 rounded-xl hover:bg-blue-50 cursor-pointer text-center bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 relative group";

        let preview = '';

        if (isDir) {
            preview = `<div class="mb-2 transition-transform group-hover:scale-110"><i data-feather="folder" class="text-yellow-400 fill-yellow-100" width="40" height="40"></i></div>`;
            el.onclick = () => navegar(item.path);
        } else if (isImg) {
            preview = `<div class="w-full h-24 mb-2 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 relative"><img src="${url}" class="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy"></div>`;
            el.onclick = () => openLightbox(url, 'image', item.name);
        } else {
            let icon = isPdf ? 'file-text' : (isWord ? 'file-text' : 'file');
            let colorClass = isPdf ? 'text-red-500' : (isWord ? 'text-blue-600' : 'text-gray-400');
            preview = `<div class="w-full h-24 mb-2 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors"><i data-feather="${icon}" class="${colorClass}" width="32"></i></div>`;
            if (isPdf) el.onclick = () => openLightbox(url, 'pdf', item.name);
            else el.onclick = () => window.open(url, '_blank');
        }

        let actionsHTML = canManage ? `
            <div class="absolute top-2 left-2 z-10 hidden group-hover:block" onclick="event.stopPropagation()">
                <input type="checkbox" onchange="window.toggleSeleccionEvidencia('${item.name}', this)" ${window.evidenciasSeleccionadas.includes(item.name) ? 'checked' : ''} class="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 cursor-pointer shadow-sm ${window.evidenciasSeleccionadas.includes(item.name) ? '!block' : ''}">
            </div>
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1 z-10">
                <button onclick="event.stopPropagation(); window.renombrarItem('${item.name}')" class="bg-white/90 text-blue-500 hover:text-blue-700 p-1.5 rounded-full shadow-sm hover:bg-blue-50 transition border border-gray-100"><i data-feather="edit-2" width="12" height="12"></i></button>
                <button onclick="event.stopPropagation(); window.borrarItem('${item.name}')" class="bg-white/90 text-red-500 hover:text-red-700 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition border border-gray-100"><i data-feather="trash-2" width="12" height="12"></i></button>
            </div>` : '';

        el.innerHTML = `${actionsHTML}${preview}<span class="text-[10px] font-bold text-gray-600 truncate w-full px-1" title="${item.name}">${item.name}</span>`;
        container.appendChild(el);
    });

    if (pendientesFiles.length > 0) {
        pendientesFiles.forEach(p => {
            const localUrl = URL.createObjectURL(p.archivo);
            const el = document.createElement('div');
            el.className = "flex flex-col items-center p-3 rounded-xl bg-yellow-50 border-2 border-dashed border-yellow-400 opacity-90 transition transform hover:scale-105 relative cursor-pointer group";

            const preview = `
                <div class="absolute top-1 left-1 bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 animate-pulse">
                    PENDIENTE RED
                </div>
                <div class="w-full h-24 mb-2 rounded-lg overflow-hidden border border-yellow-300 relative">
                    <img src="${localUrl}" class="w-full h-full object-cover" loading="lazy">
                </div>
            `;

            el.onclick = () => openLightbox(localUrl, 'image', p.nombreOriginal);
            el.innerHTML = `${preview}<span class="text-[10px] font-bold text-yellow-800 truncate w-full px-1" title="${p.nombreOriginal}">${p.nombreOriginal}</span>`;
            container.appendChild(el);
        });
    }

    if (window.feather) feather.replace();
}

function setupExplorerDragAndDrop() {
    const dropZone = document.getElementById('tab-content-wrapper');
    const overlay = document.getElementById('dragOverlay');
    if (!dropZone) return;

    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    const zone = document.getElementById('tab-content-wrapper');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => zone.addEventListener(e, x => { x.preventDefault(); x.stopPropagation(); }));

    zone.addEventListener('dragenter', () => { if (overlay) overlay.classList.remove('hidden'); });
    zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget) && overlay) overlay.classList.add('hidden');
    });

    zone.addEventListener('drop', async (e) => {
        if (overlay) overlay.classList.add('hidden');
        const items = e.dataTransfer.items;
        if (!items || items.length === 0) return;

        const contentDiv = document.getElementById('tab-content');
        if (contentDiv) contentDiv.innerHTML = '<div class="col-span-full text-center py-10 animate-pulse text-blue-600 font-bold">Procesando y subiendo archivos...</div>';

        const promises = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) promises.push(scanFiles(item));
        }

        const results = await Promise.all(promises);
        const filesToUpload = results.flat();

        if (filesToUpload.length > 0) {
            await uploadFiles(filesToUpload);
        } else {
            alert("No hay archivos válidos.");
            switchTab(currentTab);
        }
    });
}

// --- SUBIDA INTELIGENTE INTEGRADA ---
async function uploadFiles(fileList) {
    try {
        let rootFolder = '';
        try {
            const infoRes = await fetch(`${API_URL}/informes/archivos/${activeReportId}`);
            if (!infoRes.ok) throw new Error();
            const infoData = await infoRes.json();
            rootFolder = infoData.datos.ruta_carpeta;
        } catch (e) {
            const paquete = await leerProyectoDescargado(activeReportId);
            if (paquete && paquete.info) rootFolder = paquete.info.ruta_carpeta;
            else throw new Error("Proyecto no disponible offline.");
        }

        const uploadPath = currentTab === 'fotos' ? currentBrowserPath : '';
        const url = `${API_URL}/informes/subir`;

        let encolados = 0;

        for (const file of fileList) {
            const fd = new FormData();
            fd.append('projectFolder', rootFolder);
            fd.append('subPath', uploadPath);

            let finalFile = file;
            if (file.type && file.type.match(/image.*/)) {
                finalFile = await comprimirFoto(file, 1200, 0.7);
            }

            fd.append('files', finalFile, finalFile.name);
            fd.append('filePaths', JSON.stringify([file.fullPath || file.name]));

            const tipoQueue = `evidencias-${uploadPath}`;
            const result = await uploadOrQueue(url, fd, activeReportId, tipoQueue);

            if (result.status === 'queued') encolados++;
        }

        if (encolados > 0) {
            alert(`Red desconectada.\n\n${encolados} foto(s) guardada(s) en tu celular. Se subirán al volver a tener señal.`);
        }

        switchTab(currentTab);

    } catch (e) {
        console.error(e);
        alert("Error de conexión al subir.");
        switchTab(currentTab);
    }
}

// --- ACCIONES GLOBALES ---

window.switchTab = switchTab;
window.navegar = navegar;
window.subirAFolderActual = async (input, isFolder) => {
    const files = Array.from(input.files);
    files.forEach(f => f.fullPath = f.webkitRelativePath || f.name);

    const container = document.getElementById('tab-content');
    if (container) container.innerHTML = '<div class="col-span-full text-center py-10 animate-pulse text-blue-600 font-bold">Procesando fotos...</div>';

    await uploadFiles(files);
    input.value = '';
};

window.renombrarItem = async (oldName) => {
    let baseName = oldName;
    let extension = "";
    const lastDotIndex = oldName.lastIndexOf('.');
    if (lastDotIndex > 0) {
        baseName = oldName.substring(0, lastDotIndex);
        extension = oldName.substring(lastDotIndex);
    }

    const newBase = prompt(`Renombrar "${oldName}" a:`, baseName);
    if (!newBase || newBase === baseName) return;
    if (newBase.includes("/") || newBase.includes("\\")) return alert("El nombre no puede contener barras.");

    const finalName = newBase.trim() + extension;

    try {
        const res = await fetch(`${API_URL}/informes/rename/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath: currentBrowserPath, oldName: oldName, newName: finalName })
        });
        const data = await res.json();
        if (data.success) switchTab(currentTab);
        else alert("Error al renombrar: " + (data.error || 'Desconocido'));
    } catch (e) { console.error(e); alert("Error de conexión"); }
};

window.borrarItem = async (itemName) => {
    if (!confirm(`¿Eliminar "${itemName}"?`)) return;
    try {
        const res = await fetch(`${API_URL}/informes/delete-item/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath: currentBrowserPath, itemName })
        });
        const data = await res.json();
        if (data.success) {
            window.evidenciasSeleccionadas = window.evidenciasSeleccionadas.filter(i => i !== itemName);
            switchTab(currentTab);
        }
        else alert("Error al eliminar");
    } catch (e) { console.error(e); }
};

window.toggleSeleccionEvidencia = (itemName, checkbox) => {
    if (checkbox.checked) {
        if (!window.evidenciasSeleccionadas.includes(itemName)) window.evidenciasSeleccionadas.push(itemName);
    } else {
        window.evidenciasSeleccionadas = window.evidenciasSeleccionadas.filter(i => i !== itemName);
    }

    // force show checkbox if selected
    if (checkbox.checked) checkbox.parentElement.classList.replace("hidden", "block");
    else checkbox.parentElement.classList.replace("block", "hidden");

    const btn = document.getElementById('btn-delete-evidencias');
    if (btn) {
        if (window.evidenciasSeleccionadas.length > 0) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
            btn.innerHTML = `<i data-feather="trash-2" width="14" class="mr-1"></i> Eliminar (${window.evidenciasSeleccionadas.length})`;
            if (window.feather) window.feather.replace();
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
};

window.borrarEvidenciasSeleccionadas = async () => {
    if (window.evidenciasSeleccionadas.length === 0) return;
    if (!confirm(`¿Eliminar ${window.evidenciasSeleccionadas.length} elemento(s)?`)) return;

    const btn = document.getElementById('btn-delete-evidencias');
    if (btn) btn.innerHTML = 'Borrando...';

    const promises = window.evidenciasSeleccionadas.map(itemName => {
        return fetch(`${API_URL}/informes/delete-item/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath: currentBrowserPath, itemName })
        }).then(r => r.json());
    });

    await Promise.all(promises);
    window.evidenciasSeleccionadas = [];
    switchTab(currentTab);
};

window.handleGenerar = async (tipo) => {
    if (!activeReportId) return;
    const btn = document.querySelector(`button[onclick="handleGenerar('${tipo}')"]`);
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>`; }
    try {
        const res = await projectsService.generar(tipo, activeReportId);
        if (res.success) switchTab(tipo === 'word' ? 'word' : 'fotos');
        else alert("Error: " + (res.error || 'Desconocido'));
    } catch (e) { alert("Error de conexión"); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } }
};

window.handleConvertirPdf = async () => {
    if (!activeReportId) return;
    const btn = document.querySelector(`button[onclick="handleConvertirPdf()"]`);
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = `<div class="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>`; }
    try {
        const res = await projectsService.convertirPdf(activeReportId);
        if (res.success) switchTab('pdf');
        else alert("Error: " + (res.error || 'Desconocido'));
    } catch (e) { alert("Error de conexión"); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } }
};

window.crearCarpeta = async () => {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    const cleanName = nombre.replace(/[^a-zA-Z0-9_\-\s]/g, '');
    try {
        const res = await fetch(`${API_URL}/informes/mkdir/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath: currentBrowserPath, newFolderName: cleanName })
        });
        const data = await res.json();
        if (data.success) switchTab('fotos');
        else alert("Error al crear carpeta");
    } catch (e) { console.error(e); }
};

function renderTabActions(tab) {
    const container = document.getElementById('tab-actions');
    if (!container) return;

    const isAdmin = state.user.role === 'admin';
    const isCliente = state.user.role === 'cliente';
    const isTecnico = state.user.role === 'tecnico';

    let html = '';

    if (tab === 'fotos') {
        if (isTecnico) {
            html = `
                <button onclick="crearCarpeta()" class="flex items-center justify-center px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition">
                    <i data-feather="folder-plus" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Crear Carpeta</span>
                </button>
                <label class="cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition">
                    <i data-feather="image" width="14" class="mr-1"></i> <i data-feather="plus" width="10" class="sm:hidden font-bold"></i> <span class="hidden sm:inline">Subir Fotos</span>
                    <input type="file" multiple accept="image/*" class="hidden" onchange="window.subirAFolderActual(this, false)">
                </label>
            `;
        } else {
            html = `
                <button id="btn-delete-evidencias" onclick="window.borrarEvidenciasSeleccionadas()" class="hidden items-center justify-center px-2 sm:px-3 py-1.5 bg-red-600 border border-red-600 rounded text-xs font-bold text-white hover:bg-red-700 shadow-sm transition mr-1 sm:mr-3">
                    <i data-feather="trash-2" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Eliminar (${window.evidenciasSeleccionadas.length})</span>
                </button>
                <button onclick="crearCarpeta()" class="flex items-center justify-center px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition flex-1 sm:flex-none">
                    <i data-feather="folder-plus" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Crear Carpeta</span>
                </button>
                <label class="cursor-pointer flex items-center justify-center px-2 sm:px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition flex-1 sm:flex-none">
                    <i data-feather="image" width="14" class="mr-1"></i> <i data-feather="plus" width="10" class="mr-1 sm:hidden font-bold"></i> <span class="hidden sm:inline">Subir Fotos</span>
                    <input type="file" multiple accept="image/*" class="hidden" onchange="window.subirAFolderActual(this, false)">
                </label>
            `;
            if (window.evidenciasSeleccionadas.length > 0) {
                html = html.replace('class="hidden items-center', 'class="flex items-center');
            }
        }
    }
    else if ((isAdmin || isCliente) && tab === 'word') {
        html = `
            <button onclick="handleGenerar('word')" class="flex items-center justify-center px-2 sm:px-3 py-1.5 bg-blue-600 border border-blue-600 rounded text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition flex-1 sm:flex-none">
                <i data-feather="cpu" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Generar Word</span>
            </button>
            <button onclick="handleGenerar('word')" class="flex items-center justify-center px-2 sm:px-3 py-1.5 bg-orange-100 border border-orange-200 rounded text-xs font-bold text-orange-700 hover:bg-orange-200 shadow-sm transition flex-1 sm:flex-none">
                <i data-feather="refresh-cw" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Re-generar</span>
            </button>
            <button onclick="handleConvertirPdf()" class="flex items-center justify-center px-2 sm:px-3 py-1.5 bg-green-600 border border-green-600 rounded text-xs font-bold text-white hover:bg-green-700 shadow-sm transition flex-1 sm:flex-none">
                <i data-feather="arrow-right-circle" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">A PDF</span>
            </button>
        `;
    }
    else if ((isAdmin || isCliente) && tab === 'pdf') {
        html = `
            <button onclick="handleConvertirPdf()" class="flex items-center px-3 py-1.5 bg-white border border-green-300 rounded text-xs font-bold text-green-700 hover:bg-green-50 shadow-sm transition">
                <i data-feather="refresh-ccw" width="14" class="mr-1"></i> Re-convertir
            </button>
        `;
    }

    container.innerHTML = html;
    if (window.feather) feather.replace();
}