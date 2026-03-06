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
    window.currentRootFolder = rootFolder; // Save for download utility

    if (!Array.isArray(items)) items = [];
    if (currentTab !== 'fotos') items = items.filter(i => i.type !== 'folder');

    if (items.length === 0 && pendientesFiles.length === 0) {
        let msg = 'No hay archivos aquí.';
        container.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-xl">${msg}</div>`;
        return;
    }

    items.sort((a, b) => a.type === 'folder' ? -1 : 1);
    const canManage = state.user.role !== 'tecnico';

    // Pre-calculate gallery items for Lightbox
    window.currentTabsMediaItems = []; // Expose globally for download lookup
    items.forEach((item, index) => {
        const isImg = item.name.match(/\.(jpg|jpeg|png|webp)$/i);
        const isPdf = item.name.endsWith('.pdf');
        if (isImg || isPdf) {
            const url = `${API_URL.replace('/api', '')}/uploads/${rootFolder}/${item.path}`;
            const comentario = typeof item.comentario === 'string' ? item.comentario : '';
            let displayName = comentario || item.name;
            if (!comentario) displayName = displayName.replace(/\.[^/.]+$/, ""); // Hide extension if no comment

            item._mediaIndex = window.currentTabsMediaItems.length;
            window.currentTabsMediaItems.push({
                url,
                type: isImg ? 'image' : 'pdf',
                title: displayName,
                fileRef: item.name,
                comentario: comentario,
                isLogistica: false
            });
        }
    });

    items.forEach(item => {
        const url = `${API_URL.replace('/api', '')}/uploads/${rootFolder}/${item.path}`;
        const isImg = item.name.match(/\.(jpg|jpeg|png|webp)$/i);
        const isPdf = item.name.endsWith('.pdf');
        const isWord = item.name.endsWith('.docx');
        const isDir = item.type === 'folder';

        const comentario = typeof item.comentario === 'string' ? item.comentario : '';
        let displayName = comentario || item.name;
        if (!comentario && !isDir) displayName = displayName.replace(/\.[^/.]+$/, "");

        const el = document.createElement('div');
        el.className = "flex flex-col items-center p-3 rounded-xl hover:bg-blue-50 cursor-pointer text-center bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 relative group";

        const isSelected = window.evidenciasSeleccionadas.includes(item.name);
        el.id = `evidencia-card-${item.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (isSelected) {
            el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
        }

        let pressTimer;
        let isLongPress = false;
        const startPress = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                window.toggleSeleccionEvidencia(item.name);
            }, 500);
        };
        const cancelPress = () => clearTimeout(pressTimer);

        el.addEventListener('touchstart', startPress, { passive: true });
        el.addEventListener('touchend', cancelPress, { passive: true });
        el.addEventListener('touchmove', cancelPress, { passive: true });
        el.addEventListener('mousedown', startPress);
        el.addEventListener('mouseup', cancelPress);
        el.addEventListener('mouseleave', cancelPress);

        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (isLongPress) return;
            if (window.evidenciasSeleccionadas.length > 0) {
                window.toggleSeleccionEvidencia(item.name);
                return;
            }
            if (isDir) {
                navegar(item.path);
            } else if (isImg || isPdf) {
                openLightboxGallery(window.currentTabsMediaItems, item._mediaIndex);
            } else {
                window.open(url, '_blank');
            }
        });

        let preview = '';

        if (isDir) {
            preview = `<div class="mb-2 transition-transform group-hover:scale-110"><i data-feather="folder" class="text-yellow-400 fill-yellow-100" width="40" height="40"></i></div>`;
        } else if (isImg || isPdf) {
            if (isImg) {
                preview = `<div class="w-full h-24 mb-2 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 relative"><img src="${url}" class="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" oncontextmenu="return false;"></div>`;
            } else {
                let icon = 'file-text';
                let colorClass = 'text-red-500';
                preview = `<div class="w-full h-24 mb-2 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors"><i data-feather="${icon}" class="${colorClass}" width="32"></i></div>`;
            }
        } else {
            let icon = isWord ? 'file-text' : 'file';
            let colorClass = isWord ? 'text-blue-600' : 'text-gray-400';
            preview = `<div class="w-full h-24 mb-2 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors"><i data-feather="${icon}" class="${colorClass}" width="32"></i></div>`;
        }

        let actionsHTML = canManage ? `
            <div class="selection-indicator absolute top-2 left-2 z-10 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm border border-white ${isSelected ? '' : 'hidden'}">
                <i data-feather="check" width="12" height="12"></i>
            </div>
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1 z-10">
                <button onclick="event.stopPropagation(); window.renombrarItem('${item.name}', ${(isImg || isPdf) ? `'${comentario.replace(/'/g, "\\'")}'` : 'undefined'})" class="bg-white/90 text-blue-500 hover:text-blue-700 p-1.5 rounded-full shadow-sm hover:bg-blue-50 transition border border-gray-100"><i data-feather="edit-2" width="12" height="12"></i></button>
                <button onclick="event.stopPropagation(); window.borrarItem('${item.name}')" class="bg-white/90 text-red-500 hover:text-red-700 p-1.5 rounded-full shadow-sm hover:bg-red-50 transition border border-gray-100"><i data-feather="trash-2" width="12" height="12"></i></button>
            </div>` : '';

        el.innerHTML = `
            ${preview}
            <span class="text-xs font-semibold text-gray-700 truncate w-full" title="${displayName}">
                ${displayName}
            </span>
            ${actionsHTML}
        `;
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
            await window.sysAlert("No hay archivos válidos.");
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

        window.UploadCarousel.open(fileList, "Subir Evidencias", async (processedFiles) => {
            let encolados = 0;

            for (const item of processedFiles) {
                const fd = new FormData();
                fd.append('projectFolder', rootFolder);
                fd.append('subPath', uploadPath);

                let finalFile = item.file;
                if (finalFile.type && finalFile.type.match(/image.*/)) {
                    finalFile = await comprimirFoto(finalFile, 1200, 0.7);
                }

                // Build metadata element for the backend
                const metadata = {
                    originalName: item.originalName,
                    comment: item.comment || ''
                };

                fd.append('files', finalFile, item.safeName);
                fd.append('filePaths', JSON.stringify([finalFile.fullPath || item.safeName]));
                fd.append('metadata', JSON.stringify(metadata));

                const tipoQueue = `evidencias-${uploadPath}`;
                const result = await uploadOrQueue(url, fd, activeReportId, tipoQueue);

                if (result.status === 'queued') encolados++;
            }

            if (encolados > 0) {
                await window.sysAlert(`Red desconectada.\n\n${encolados} foto(s) guardada(s) en tu celular. Se subirán al volver a tener señal.`, 'warning');
            }

            switchTab(currentTab);
        });

    } catch (e) {
        console.error(e);
        await window.sysAlert("Error de conexión al subir.");
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

window.renombrarItem = async (oldName, currentComment) => {
    const isEditingComment = currentComment !== undefined;

    let baseName = oldName;
    let extension = "";

    if (isEditingComment) {
        baseName = currentComment ? currentComment : oldName.replace(/\.[^/.]+$/, "");
    } else {
        const lastDotIndex = oldName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            baseName = oldName.substring(0, lastDotIndex);
            extension = oldName.substring(lastDotIndex);
        }
    }

    const newBase = await window.sysPrompt(isEditingComment ? `Nuevo comentario para la foto:` : `Renombrar "${oldName}" a:`, baseName);
    if (newBase === null || newBase === baseName) return;
    if (!isEditingComment && (newBase.includes("/") || newBase.includes("\\"))) return await window.sysAlert("El nombre no puede contener barras.");

    const finalName = isEditingComment ? newBase.trim() : newBase.trim() + extension;

    try {
        const reqBody = { currentPath: currentBrowserPath, oldName: oldName, newName: finalName };
        if (isEditingComment) reqBody.editCommentOnly = true;

        const res = await fetch(`${API_URL}/informes/rename/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqBody)
        });
        const data = await res.json();
        if (data.success) switchTab(currentTab);
        else await window.sysAlert("Error al renombrar: " + (data.error || 'Desconocido'));
    } catch (e) { console.error(e); await window.sysAlert("Error de conexión"); }
};

window.borrarItem = async (itemName) => {
    if (!(await window.sysConfirm(`¿Eliminar "${itemName}"?`))) return;
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
        else await window.sysAlert("Error al eliminar");
    } catch (e) { console.error(e); await window.sysAlert("Error de conexión"); }
};

window.toggleSeleccionEvidencia = (itemName) => {
    const isSelected = window.evidenciasSeleccionadas.includes(itemName);
    if (!isSelected) {
        window.evidenciasSeleccionadas.push(itemName);
    } else {
        window.evidenciasSeleccionadas = window.evidenciasSeleccionadas.filter(i => i !== itemName);
    }

    const cardId = `evidencia-card-${itemName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const card = document.getElementById(cardId);
    if (card) {
        if (window.evidenciasSeleccionadas.includes(itemName)) {
            card.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50');
            card.querySelector('.selection-indicator')?.classList.remove('hidden');
        } else {
            card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
            card.querySelector('.selection-indicator')?.classList.add('hidden');
        }
    }

    const btnDel = document.getElementById('btn-delete-evidencias');
    const btnDown = document.getElementById('btn-download-evidencias');
    const btnShare = document.getElementById('btn-share-evidencias');
    if (window.evidenciasSeleccionadas.length > 0) {
        if (btnDel) {
            btnDel.classList.remove('hidden');
            btnDel.classList.add('flex');
            btnDel.innerHTML = `<i data-feather="trash-2" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Eliminar (${window.evidenciasSeleccionadas.length})</span>`;
        }
        if (btnDown) {
            btnDown.classList.remove('hidden');
            btnDown.classList.add('flex');
            btnDown.innerHTML = `<i data-feather="download" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Descargar (${window.evidenciasSeleccionadas.length})</span>`;
        }
        if (btnShare) {
            btnShare.classList.remove('hidden');
            btnShare.classList.add('flex');
            btnShare.innerHTML = `<i data-feather="share-2" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Compartir (${window.evidenciasSeleccionadas.length})</span>`;
        }
        if (window.feather) window.feather.replace();
    } else {
        if (btnDel) {
            btnDel.classList.add('hidden');
            btnDel.classList.remove('flex');
        }
        if (btnDown) {
            btnDown.classList.add('hidden');
            btnDown.classList.remove('flex');
        }
        if (btnShare) {
            btnShare.classList.add('hidden');
            btnShare.classList.remove('flex');
        }
    }
};

window.clearSeleccionEvidencias = () => {
    window.evidenciasSeleccionadas = [];
    document.querySelectorAll('[id^="evidencia-card-"]').forEach(card => {
        card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50');
        const indicator = card.querySelector('.selection-indicator');
        if (indicator) indicator.classList.add('hidden');
    });
    const btnDel = document.getElementById('btn-delete-evidencias');
    const btnDown = document.getElementById('btn-download-evidencias');
    const btnShare = document.getElementById('btn-share-evidencias');
    if (btnDel) { btnDel.classList.add('hidden'); btnDel.classList.remove('flex'); }
    if (btnDown) { btnDown.classList.add('hidden'); btnDown.classList.remove('flex'); }
    if (btnShare) { btnShare.classList.add('hidden'); btnShare.classList.remove('flex'); }
};

window.borrarEvidenciasSeleccionadas = async () => {
    if (window.evidenciasSeleccionadas.length === 0) return;
    if (!(await window.sysConfirm(`¿Eliminar ${window.evidenciasSeleccionadas.length} elemento(s)?`))) return;

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

window.compartirEvidenciasSeleccionadas = async () => {
    if (window.evidenciasSeleccionadas.length === 0) return;
    if (!navigator.share) {
        return await window.sysAlert("Por seguridad de tu navegador o celular, la opción de 'Compartir' requiere usar HTTPS o Localhost. Como estás accediendo desde una IP local (WiFi normal), tu celular bloquea esta función nativa de compartir.");
    }

    const btn = document.getElementById('btn-share-evidencias');
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<i data-feather="loader" class="animate-spin text-white"></i>`;
    if (window.feather) feather.replace();

    try {
        const filesToShare = [];
        let allComments = [];

        for (const itemName of window.evidenciasSeleccionadas) {
            const root = window.currentRootFolder;
            const subPath = window.currentBrowserPath;
            const url = `${API_URL.replace('/api', '')}/uploads/${root}/${subPath}/${itemName}`.replace(/([^:]\/)\/+/g, "$1");

            let shareName = itemName;
            let commentText = '';
            try {
                if (window.currentTabsMediaItems) {
                    const targetItem = window.currentTabsMediaItems.find(i => i.fileRef === itemName);
                    if (targetItem && targetItem.comentario) {
                        const ext = itemName.substring(itemName.lastIndexOf('.'));
                        let baseName = targetItem.comentario.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim();
                        if (baseName) shareName = `${baseName}${ext}`;
                        commentText = targetItem.comentario;
                    }
                }
            } catch (e) { console.error("Error extrayendo comentario para compartir:", e); }

            const res = await fetch(url);
            const blob = await res.blob();
            filesToShare.push(new File([blob], shareName, { type: blob.type }));

            if (commentText) {
                allComments.push(commentText);
            } else {
                // Falla a extraer del DOM como antes (legacy)
                const cardId = `evidencia-card-${itemName.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const card = document.getElementById(cardId);
                if (card) {
                    const commentDiv = card.querySelector('.truncate');
                    if (commentDiv && commentDiv.innerText && commentDiv.innerText.trim() !== '') {
                        allComments.push(commentDiv.innerText.trim());
                    }
                }
            }
        }

        const shareData = {
            files: filesToShare
        };

        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            window.clearSeleccionEvidencias();
        } else {
            await window.sysAlert("Tu navegador no soporta compartir estas fotos directamente.");
        }
    } catch (err) {
        console.error("Error compartiendo:", err);
        if (err.name !== "AbortError" && err.name !== "NotAllowedError") {
            await window.sysAlert("Error al intentar compartir los archivos.");
        }
    } finally {
        if (btn) btn.innerHTML = prevHtml;
        if (window.feather) feather.replace();
    }
};

window.descargarEvidenciasSeleccionadas = async () => {
    if (window.evidenciasSeleccionadas.length === 0) return;

    const itemsToDownload = window.evidenciasSeleccionadas;
    if (itemsToDownload.length === 1) {
        const itemName = itemsToDownload[0];
        let root = window.currentRootFolder;
        const url = `${API_URL.replace('/api', '')}/uploads/${window.currentRootFolder}/${currentBrowserPath ? currentBrowserPath + '/' : ''}${itemName}`;

        // Intentar recuperar el comentario del array global
        let downloadName = itemName;
        try {
            if (window.currentTabsMediaItems) {
                const targetItem = window.currentTabsMediaItems.find(i => i.fileRef === itemName);
                if (targetItem && targetItem.comentario) {
                    const ext = itemName.substring(itemName.lastIndexOf('.'));
                    let baseName = targetItem.comentario.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim();
                    if (baseName) downloadName = `${baseName}${ext}`;
                }
            }
        } catch (e) { console.error("Error extrayendo comentario para descarga:", e); }

        try {
            const btn = document.getElementById('btn-download-evidencias');
            if (btn) btn.innerHTML = `<i data-feather="loader" width="12" class="animate-spin text-white"></i>`;
            if (window.feather) feather.replace();

            const response = await fetch(url.replace(/([^:]\/)\/+/g, "$1"));
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
            }, 100);
        } catch (error) {
            console.error("Error downloading file as blob: ", error);
            const a = document.createElement('a');
            a.href = url.replace(/([^:]\/)\/+/g, "$1");
            a.download = downloadName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        window.evidenciasSeleccionadas = [];
        switchTab(currentTab);
        return;
    }

    const btn = document.getElementById('btn-download-evidencias');
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<i data-feather="loader" class="animate-spin text-white"></i>`;
    if (window.feather) feather.replace();

    try {
        const payload = {
            currentPath: currentBrowserPath,
            files: itemsToDownload
        };

        const res = await fetch(`${API_URL}/informes/descargar-multiples/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Error al procesar la descarga de múltiples archivos");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Extraer nombre del archivo del header si es posible, si no default
        let filename = `Seleccion_Evidencias.zip`;
        const disposition = res.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('filename=') !== -1) {
            filename = disposition.split('filename=')[1].replace(/["']/g, '');
        }

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (err) {
        console.error(err);
        await window.sysAlert("Error al descargar los archivos seleccionados");
    } finally {
        if (btn) btn.innerHTML = prevHtml;
        if (window.feather) feather.replace();
    }

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
        else await window.sysAlert("Error: " + (res.error || 'Desconocido'));
    } catch (e) { await window.sysAlert("Error de conexión"); }
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
        else await window.sysAlert("Error: " + (res.error || 'Desconocido'));
    } catch (e) { await window.sysAlert("Error de conexión"); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } }
};

window.crearCarpeta = async () => {
    const nombre = await window.sysPrompt("Nombre de la nueva carpeta:");
    if (!nombre) return;
    if (nombre.includes("/") || nombre.includes("\\")) return await window.sysAlert("El nombre no puede contener barras.");
    const cleanName = nombre.replace(/[^a-zA-Z0-9_\-\s]/g, '');
    try {
        const res = await fetch(`${API_URL}/informes/mkdir/${activeReportId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath: currentBrowserPath, newFolderName: cleanName })
        });
        const data = await res.json();
        if (data.success) switchTab('fotos');
        else await window.sysAlert("Error al crear carpeta");
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
                <button id="btn-download-evidencias" onclick="window.descargarEvidenciasSeleccionadas()" class="hidden items-center justify-center px-2 sm:px-3 py-1.5 bg-emerald-600 border border-emerald-600 rounded text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition mr-1 sm:mr-3">
                    <i data-feather="download" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Descargar (${window.evidenciasSeleccionadas.length})</span>
                </button>
                <button id="btn-share-evidencias" onclick="window.compartirEvidenciasSeleccionadas()" class="hidden items-center justify-center px-2 sm:px-3 py-1.5 bg-indigo-600 border border-indigo-600 rounded text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition flex-1 sm:flex-none mr-0 sm:mr-3">
                    <i data-feather="share-2" width="14" class="sm:mr-1"></i> <span class="hidden sm:inline">Compartir (${window.evidenciasSeleccionadas.length})</span>
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