import { API_URL, state } from '../config.js';
import { openLightbox } from './Lightbox.js';
// IMPORTAMOS LAS FUNCIONES OFFLINE
import { leerProyectoDescargado, uploadOrQueue, comprimirFoto, obtenerPendientesProyecto } from '../utils/offline-sync.js';

window.openLightbox = openLightbox;
window.recargarLogisticaEnTiempoReal = renderLogisticaSection;
let currentProjectId = null;
let currentRootFolder = '';

window.logisticaSeleccionadas = { salida: [], entrada: [] };

export async function renderLogisticaSection(projectId) {
    currentProjectId = projectId;
    const container = document.getElementById('logistica-content');
    if (!container) return;

    const canManage = state.user.role !== 'tecnico';

    container.innerHTML = `
        <div class="grid grid-cols-1 gap-6 mb-6">
            <div class="bg-amber-100/70 rounded-lg border border-amber-300 p-4 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-amber-900 text-sm flex items-center">
                        <i data-feather="tool" class="mr-2 w-4 h-4 text-amber-700"></i> HERRAMIENTAS
                    </h4>
                    ${canManage ? `<button onclick="window.agregarItemLogistica('herramienta')" class="bg-white text-amber-800 hover:bg-amber-200 border border-amber-400 px-2 py-1 rounded text-xs font-bold shadow-sm transition">+ Agregar</button>` : ''}
                </div>
                <div class="overflow-x-auto bg-white rounded-md border border-amber-200 shadow-sm">
                    <div class="w-full text-xs text-left" style="min-width:600px">
                        <div class="bg-amber-200/60 text-amber-900 uppercase font-bold p-2 text-center" style="display:grid;grid-template-columns: 10% 6% 25% 7% 7% 10% 27% 8%; align-items:center">
                            <div>FECHA</div>
                            <div>CÓDIGO</div>
                            <div>ÍTEM</div>
                            <div>CANTIDAD</div>
                            <div>RETORNO</div>
                            <div>ESTADO</div>
                            <div>OBSERVACIONES</div>
                            <div></div>
                        </div>
                        <div id="tabla-herramientas" class="divide-y divide-gray-100"></div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-100/70 rounded-lg border border-blue-300 p-4 shadow-sm">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-blue-900 text-sm flex items-center">
                        <i data-feather="box" class="mr-2 w-4 h-4 text-blue-700"></i> MATERIALES
                    </h4>
                    ${canManage ? `<button onclick="window.agregarItemLogistica('material')" class="bg-white text-blue-800 hover:bg-blue-200 border border-blue-400 px-2 py-1 rounded text-xs font-bold shadow-sm transition">+ Agregar</button>` : ''}
                </div>
                <div class="overflow-x-auto bg-white rounded-md border border-blue-200 shadow-sm">
                    <div class="w-full text-xs text-left" style="min-width:600px">
                        <div class="bg-blue-200/60 text-blue-900 uppercase font-bold p-2 text-center" style="display:grid;grid-template-columns: 10% 6% 25% 7% 8% 10% 26% 8%; align-items:center">
                            <div>FECHA</div>
                            <div>CÓDIGO</div>
                            <div>ÍTEM</div>
                            <div>CANTIDAD</div>
                            <div>USO</div>
                            <div>DEVOLUCIÓN</div>
                            <div>OBSERVACIONES</div>
                            <div></div>
                        </div>
                        <div id="tabla-materiales" class="divide-y divide-gray-100"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4">
            <h4 class="font-semibold text-gray-700 text-sm mb-4 flex items-center">
                <i data-feather="camera" class="mr-2 w-4 h-4"></i> Guías y Evidencias
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-indigo-200 transition">
                    <div class="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                        <span class="text-xs font-semibold text-indigo-700 uppercase">1. Guías de Salida</span>
                        <div class="flex gap-2">
                            <button id="btn-delete-logistica-salida" onclick="window.borrarEvidenciasLogisticaSeleccionadas('salida')" class="hidden bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold transition items-center">
                                <i data-feather="trash-2" width="12" class="mr-1"></i> Eliminar (<span id="count-salida">0</span>)
                            </button>
                            ${canManage ? `
                            <label class="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded border border-indigo-100 text-[10px] font-semibold transition flex items-center">
                                <i data-feather="plus" width="12" class="mr-1"></i> FOTO
                                <input type="file" multiple accept="image/*" class="hidden" onchange="window.subirEvidenciaLogistica('salida', this)">
                            </label>` : ''}
                        </div>
                    </div>
                    <div id="gallery-salida" class="grid grid-cols-3 gap-2"></div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-emerald-200 transition">
                    <div class="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                        <span class="text-xs font-semibold text-emerald-700 uppercase">2. Guías de Entrada/Retorno</span>
                        <div class="flex gap-2">
                            <button id="btn-delete-logistica-entrada" onclick="window.borrarEvidenciasLogisticaSeleccionadas('entrada')" class="hidden bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold transition items-center">
                                <i data-feather="trash-2" width="12" class="mr-1"></i> Eliminar (<span id="count-entrada">0</span>)
                            </button>
                            <label class="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-100 text-[10px] font-semibold transition flex items-center">
                                <i data-feather="plus" width="12" class="mr-1"></i> FOTO
                                <input type="file" multiple accept="image/*" class="hidden" onchange="window.subirEvidenciaLogistica('entrada', this)">
                            </label>
                        </div>
                    </div>
                    <div id="gallery-entrada" class="grid grid-cols-3 gap-2"></div>
                </div>
            </div>
        </div>

        <!-- Modal Sidebar Logistica -->
        <div id="modal-backdrop-logistica" class="fixed inset-0 bg-gray-900/50 hidden z-40 transition-opacity opacity-0" onclick="window.cerrarModalLogistica()"></div>
        <div id="modal-logistica" class="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl transform translate-x-full transition-transform duration-300 z-50 flex flex-col hidden">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 id="modal-logistica-title" class="font-bold text-gray-800 flex items-center">
                    <i data-feather="plus-circle" class="mr-2 text-indigo-600"></i> <span id="modal-logistica-text">Agregar Ítem</span>
                </h3>
                <button onclick="window.cerrarModalLogistica()" class="text-gray-400 hover:text-red-500 transition">
                    <i data-feather="x"></i>
                </button>
            </div>
            
            <form id="form-logistica" onsubmit="window.guardarItemLogistica(event)" class="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
                <input type="hidden" id="modal-logistica-modo">
                <input type="hidden" id="modal-logistica-id">
                <input type="hidden" id="modal-logistica-tipo">

                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">1. Fecha de Registro</label>
                    <input type="date" id="modal-logistica-fecha" required class="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">2. Código (Opcional)</label>
                    <input type="text" id="modal-logistica-codigo" placeholder="Ej: 001" class="w-full border border-gray-300 rounded p-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">3. Nombre del Ítem</label>
                    <textarea id="modal-logistica-nombre" required rows="2" placeholder="Describe el ítem..." class="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1">4. Cantidad <span id="lbl-cant-extra" class="text-gray-400 font-normal"></span></label>
                    <input type="number" id="modal-logistica-cantidad" required min="1" step="0.01" class="w-full border border-gray-300 rounded p-2 text-sm font-bold text-indigo-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                </div>
                
                <div id="modal-logistica-extra-herramienta" class="hidden flex-col gap-4">
                    <div class="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                        <label class="text-xs font-bold text-amber-900">¿Retorno Confirmado?</label>
                        <input type="checkbox" id="modal-logistica-retorno" class="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Estado Físico</label>
                        <select id="modal-logistica-estado" class="w-full border border-gray-300 rounded p-2 text-sm font-bold focus:border-indigo-500 outline-none">
                            <option value="OK" class="text-emerald-600">OK</option>
                            <option value="DAÑADO" class="text-red-500">DAÑADO</option>
                            <option value="PENDIENTE" class="text-amber-600">PENDIENTE</option>
                        </select>
                    </div>
                </div>

                <div id="modal-logistica-extra-material" class="hidden flex-col gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Cantidad Usada</label>
                        <input type="number" id="modal-logistica-uso" min="0" step="0.01" class="w-full border border-gray-300 rounded p-2 text-sm font-bold text-blue-700 focus:border-indigo-500 outline-none">
                    </div>
                </div>
                
                <div id="modal-logistica-extra-obs" class="hidden flex-col gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                        <textarea id="modal-logistica-comentario" rows="2" placeholder="Escribe alguna observación detallada..." class="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-500 outline-none resize-none"></textarea>
                    </div>
                </div>

                <div class="mt-auto pt-4 flex gap-3">
                    <button type="button" onclick="window.cerrarModalLogistica()" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition text-sm">Cancelar</button>
                    <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold shadow-sm transition text-sm">Guardar</button>
                </div>
            </form>
        </div>

        <!-- Modal PReview Fotos Logistica Carrusel -->
        <div id="modal-backdrop-preview" class="fixed inset-0 bg-black/95 hidden z-[60] flex flex-col items-center justify-center">
            
            <div class="w-full max-w-4xl p-4 flex justify-between items-center text-white">
                <span id="preview-counter" class="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">1 / 1</span>
                <button onclick="window.cerrarPreviewFotos()" class="text-white hover:text-red-400 p-2 transition">
                    <i data-feather="x" width="24" height="24"></i>
                </button>
            </div>

            <div class="flex-1 w-full max-w-4xl relative flex items-center justify-center p-4">
                <button id="preview-btn-prev" onclick="window.previewFotoChange(-1)" class="absolute left-2 sm:left-4 z-10 bg-white/10 hover:bg-white/30 text-white rounded-full p-2 sm:p-4 backdrop-blur-sm transition">
                    <i data-feather="chevron-left" width="24" height="24"></i>
                </button>
                
                <img id="preview-main-img" src="" class="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-300">
                
                <button id="preview-btn-next" onclick="window.previewFotoChange(1)" class="absolute right-2 sm:right-4 z-10 bg-white/10 hover:bg-white/30 text-white rounded-full p-2 sm:p-4 backdrop-blur-sm transition">
                    <i data-feather="chevron-right" width="24" height="24"></i>
                </button>
            </div>

            <div class="w-full max-w-xl p-4 sm:p-6 bg-gray-900 mt-auto sm:mb-8 sm:rounded-2xl border-t sm:border border-gray-800 flex flex-col gap-4 shadow-2xl">
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Comentario / Nombre de la foto</label>
                    <input type="text" id="preview-input-nombre" oninput="window.previewUpdateName(this.value)" placeholder="Escribe un comentario..." class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition">
                </div>
                <button id="btn-preview-subir" onclick="window.confirmarSubidaFotosLogistica()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition flex items-center justify-center gap-2">
                    <i data-feather="upload-cloud" width="18"></i> <span id="lbl-preview-subir">SUBIR FOTOS</span>
                </button>
            </div>
            
        </div>
    `;

    if (window.feather) feather.replace();
    await cargarDatosLogistica();
}

async function cargarDatosLogistica() {
    try {
        let data;

        try {
            // Intento 1: Online
            const res = await fetch(`${API_URL}/logistica/${currentProjectId}`);
            if (!res.ok) throw new Error("Fetch falló");
            data = await res.json();
        } catch (netErr) {
            // Intento 2: Offline
            console.log("Cargando logística offline...");
            const paquete = await leerProyectoDescargado(currentProjectId);
            data = (paquete && paquete.logistica) ? paquete.logistica : { items: [], fotos: { salida: [], entrada: [], rootFolder: '' } };
        }

        currentRootFolder = data.fotos.rootFolder;

        const tHerr = document.getElementById('tabla-herramientas');
        const tMat = document.getElementById('tabla-materiales');
        window.currentLogisticaItems = data.items || [];
        const items = window.currentLogisticaItems;
        const canManage = state.user.role !== 'tecnico';

        const renderActions = (i) => canManage ? `<div class="flex justify-center gap-1"><button onclick="window.editarItemLogistica(${i.id})" class="text-blue-300 hover:text-blue-600 transition" title="Editar"><i data-feather="edit-2" width="12"></i></button><button onclick="window.borrarItemLogistica(${i.id})" class="text-gray-300 hover:text-red-500 transition" title="Borrar"><i data-feather="trash-2" width="12"></i></button></div>` : '';

        const formatDate = (dateString) => {
            if (!dateString) return '-';
            const parts = dateString.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return dateString;
        };

        tHerr.innerHTML = items.filter(i => i.tipo === 'herramienta').map(i => `<div class="p-2 hover:bg-amber-100/50 transition border-b border-amber-100 text-center" style="display:grid;grid-template-columns: 10% 6% 25% 7% 7% 10% 27% 8%; align-items:center"><div class="text-[10px] font-semibold text-gray-600">${formatDate(i.fecha)}</div><div class="text-[10px] text-gray-500 font-mono">${i.codigo || '-'}</div><div class="font-medium text-gray-800 truncate" title="${i.nombre_item}">${i.nombre_item}</div><div class="font-bold text-amber-900">${i.cant_salida}</div><div><input type="checkbox" id="chk-retorno-${i.id}" ${i.cant_retorno == i.cant_salida ? 'checked' : ''} onchange="window.updateHerramienta(${i.id},this.checked,${i.cant_salida})" class="text-amber-600 cursor-pointer w-4 h-4"></div><div><select onchange="const isOk = this.value === 'OK'; document.getElementById('chk-retorno-${i.id}').checked = isOk; window.updateEstado(${i.id},this.value,${i.cant_salida})" class="w-full text-center text-[9px] font-bold border-none bg-transparent cursor-pointer ${i.estado === 'OK' ? 'text-emerald-600' : 'text-red-500'}"><option value="OK" ${i.estado === 'OK' ? 'selected' : ''}>OK</option><option value="DAÑADO" ${i.estado === 'DAÑADO' ? 'selected' : ''}>DAÑADO</option><option value="PENDIENTE" ${i.estado === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option></select></div><div class="flex items-center justify-center px-1"><input type="text" value="${i.comentario || ''}" onblur="window.updateComentario(${i.id}, this.value)" class="w-full bg-transparent border-b border-amber-200/50 focus:border-amber-500 focus:outline-none text-[10px] text-center text-gray-700 p-1" placeholder="..."></div><div>${renderActions(i)}</div></div>`).join('') || '<div class="p-4 text-center text-amber-700 text-xs italic">Sin herramientas</div>';

        tMat.innerHTML = items.filter(i => i.tipo === 'material').map(i => {
            const dev = i.cant_salida - i.cant_usada;
            return `<div class="p-2 hover:bg-blue-100/50 transition border-b border-blue-100 text-center" style="display:grid;grid-template-columns: 10% 6% 25% 7% 8% 10% 26% 8%; align-items:center"><div class="text-[10px] font-semibold text-gray-600">${formatDate(i.fecha)}</div><div class="text-[10px] text-gray-500 font-mono">${i.codigo || '-'}</div><div class="font-medium text-gray-800 truncate" title="${i.nombre_item}">${i.nombre_item}</div><div class="text-blue-900 font-bold">${i.cant_salida}</div><div class="flex justify-center"><input type="number" value="${i.cant_usada}" min="0" onchange="window.updateMaterial(${i.id},this.value,${i.cant_salida})" class="w-10 text-center border border-blue-300 bg-white rounded text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-none"></div><div class="font-bold ${dev < 0 ? 'text-red-600' : 'text-blue-800'}" id="calc-${i.id}">${dev}</div><div class="flex items-center justify-center px-1"><input type="text" value="${i.comentario || ''}" onblur="window.updateComentario(${i.id}, this.value)" class="w-full bg-transparent border-b border-blue-200/50 focus:border-blue-500 focus:outline-none text-[10px] text-center text-gray-700 p-1" placeholder="..."></div><div>${renderActions(i)}</div></div>`;
        }).join('') || '<div class="p-4 text-center text-blue-700 text-xs italic">Sin materiales</div>';


        // --- JUNTAR FOTOS DEL SERVIDOR CON LAS PENDIENTES ---
        let pendientes = [];
        try { pendientes = await obtenerPendientesProyecto(currentProjectId); } catch (e) { }

        const pSalida = pendientes.filter(p => p.tipo === 'logistica-salida');
        const pEntrada = pendientes.filter(p => p.tipo === 'logistica-entrada');

        const renderGallery = (tipo, serverFiles, pendientesFiles) => {
            const container = document.getElementById(`gallery-${tipo}`);
            if (!Array.isArray(serverFiles)) serverFiles = [];

            if (serverFiles.length === 0 && pendientesFiles.length === 0) {
                container.innerHTML = `<div class="col-span-3 text-center py-4 text-[10px] text-gray-400 italic bg-gray-50 rounded border border-dashed border-gray-200">Sin fotos</div>`;
                return;
            }

            const folderName = tipo === 'salida' ? 'Guias_Salida' : 'Guias_Entrada';
            let html = '';

            // 1. DIBUJAR FOTOS QUE YA ESTÁN EN EL SERVIDOR
            html += serverFiles.map(file => {
                const url = `${API_URL.replace('/api', '')}/uploads/${currentRootFolder}/Logistica/${folderName}/${file}`;
                const isChecked = window.logisticaSeleccionadas[tipo].includes(file);
                const checkHTML = (canManage || tipo === 'entrada') ? `
                    <div class="absolute top-1 left-1 z-10 hidden group-hover:block" onclick="event.stopPropagation()">
                        <input type="checkbox" onchange="window.toggleSeleccionLogistica('${tipo}', '${file}', this)" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-red-600 bg-white border-gray-300 rounded cursor-pointer shadow-sm ${isChecked ? '!block' : ''}">
                    </div>` : '';
                return `
                <div class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src="${url}" class="w-full h-full object-cover cursor-pointer hover:scale-110 transition duration-300" onclick="openLightbox('${url}', 'image', '${file}')">
                    ${checkHTML}
                    ${canManage || tipo === 'entrada' ? `<button onclick="window.borrarFotoLogistica('${tipo}', '${file}')" class="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><i data-feather="x" width="10" height="10"></i></button>` : ''}
                </div>`;
            }).join('');

            // 2. DIBUJAR FOTOS PENDIENTES (DESDE EL CELULAR)
            html += pendientesFiles.map(p => {
                const localUrl = URL.createObjectURL(p.archivo);
                return `
                <div class="relative group aspect-square bg-yellow-50 rounded-lg overflow-hidden border-2 border-dashed border-yellow-400 opacity-90 transition transform hover:scale-105">
                    <div class="absolute top-1 left-1 bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 animate-pulse">
                        PENDIENTE RED
                    </div>
                    <img src="${localUrl}" class="w-full h-full object-cover cursor-pointer" onclick="openLightbox('${localUrl}', 'image', '${p.nombreOriginal}')">
                </div>`;
            }).join('');

            container.innerHTML = html;
        };

        renderGallery('salida', data.fotos.salida, pSalida);
        renderGallery('entrada', data.fotos.entrada, pEntrada);

        if (window.feather) feather.replace();
    } catch (e) { console.error(e); }
}

// --- RESTO DE FUNCIONES GLOBALES ---
window.abrirModalLogistica = (modo, tipo, item = null) => {
    document.getElementById('modal-backdrop-logistica').classList.remove('hidden');
    document.getElementById('modal-logistica').classList.remove('hidden');

    // Apilar estado en historial para tecla Atrás (móviles)
    history.pushState({ modalLogistica: true }, '', location.href);

    // allow paint
    requestAnimationFrame(() => {
        document.getElementById('modal-backdrop-logistica').classList.remove('opacity-0');
        document.getElementById('modal-logistica').classList.remove('translate-x-full');
    });

    document.getElementById('modal-logistica-modo').value = modo;
    document.getElementById('modal-logistica-tipo').value = tipo;

    const titulo = modo === 'agregar' ? `Agregar ${tipo === 'herramienta' ? 'Herramienta' : 'Material'}` : `Editar Ítem`;
    const iconColor = tipo === 'herramienta' ? 'text-amber-600' : 'text-blue-600';
    document.getElementById('modal-logistica-title').innerHTML = `<i data-feather="${modo === 'agregar' ? 'plus-circle' : 'edit-2'}" class="mr-2 ${iconColor}"></i> <span id="modal-logistica-text">${titulo}</span>`;
    if (window.feather) feather.replace();

    document.getElementById('lbl-cant-extra').innerText = tipo === 'herramienta' ? '(Salida)' : '(Entrada)';

    const extraHerr = document.getElementById('modal-logistica-extra-herramienta');
    const extraMat = document.getElementById('modal-logistica-extra-material');
    const extraObs = document.getElementById('modal-logistica-extra-obs');

    // Limpieza EXPLICITA Y TOTAL (Fuerza bruta contra caché visual)
    document.getElementById('modal-logistica-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-logistica-codigo').value = '';
    document.getElementById('modal-logistica-nombre').value = '';
    document.getElementById('modal-logistica-cantidad').value = '1';
    document.getElementById('modal-logistica-comentario').value = '';
    document.getElementById('modal-logistica-uso').value = '';
    document.getElementById('modal-logistica-retorno').checked = false;
    document.getElementById('modal-logistica-estado').value = 'OK';

    if (modo === 'agregar') {
        document.getElementById('modal-logistica-id').value = '';

        extraObs.classList.remove('hidden');
        extraObs.classList.add('flex');

        if (tipo === 'herramienta') {
            extraHerr.classList.remove('hidden');
            extraHerr.classList.add('flex');
            extraMat.classList.remove('flex');
            extraMat.classList.add('hidden');

            const chkRet = document.getElementById('modal-logistica-retorno');
            const selEst = document.getElementById('modal-logistica-estado');

            chkRet.onchange = (e) => { if (e.target.checked) selEst.value = 'OK'; };
            selEst.onchange = (e) => {
                if (e.target.value === 'PENDIENTE') chkRet.checked = false;
                if (e.target.value === 'OK') chkRet.checked = true;
            };
        } else {
            extraMat.classList.remove('hidden');
            extraMat.classList.add('flex');
            extraHerr.classList.remove('flex');
            extraHerr.classList.add('hidden');
        }
    } else if (item) {
        document.getElementById('modal-logistica-id').value = item.id;
        document.getElementById('modal-logistica-fecha').value = item.fecha || new Date().toISOString().split('T')[0];
        document.getElementById('modal-logistica-codigo').value = item.codigo || '';
        document.getElementById('modal-logistica-nombre').value = item.nombre_item || '';
        document.getElementById('modal-logistica-cantidad').value = item.cant_salida || 1;
        document.getElementById('modal-logistica-comentario').value = item.comentario || '';

        extraObs.classList.remove('hidden');
        extraObs.classList.add('flex');
        document.getElementById('modal-logistica-comentario').value = item.comentario || '';

        if (tipo === 'herramienta') {
            extraHerr.classList.remove('hidden');
            extraHerr.classList.add('flex');
            extraMat.classList.remove('flex');
            extraMat.classList.add('hidden');

            const chkRet = document.getElementById('modal-logistica-retorno');
            const selEst = document.getElementById('modal-logistica-estado');

            chkRet.checked = (item.cant_retorno == item.cant_salida);
            selEst.value = item.estado || 'PENDIENTE';

            chkRet.onchange = (e) => { if (e.target.checked) selEst.value = 'OK'; };
            selEst.onchange = (e) => {
                if (e.target.value === 'PENDIENTE') chkRet.checked = false;
                if (e.target.value === 'OK') chkRet.checked = true;
            };

        } else {
            extraMat.classList.remove('hidden');
            extraMat.classList.add('flex');
            extraHerr.classList.remove('flex');
            extraHerr.classList.add('hidden');
            document.getElementById('modal-logistica-uso').value = item.cant_usada || 0;
        }
    }
};

window.cerrarModalLogistica = (fromPopState = false) => {
    document.getElementById('modal-backdrop-logistica')?.classList.add('opacity-0');
    document.getElementById('modal-logistica')?.classList.add('translate-x-full');

    setTimeout(() => {
        document.getElementById('modal-backdrop-logistica')?.classList.add('hidden');
        document.getElementById('modal-logistica')?.classList.add('hidden');
    }, 300);

    // Si cerramos manual (botón cancelar, guardar, escape), quitamos el estado del historial
    if (!fromPopState) {
        if (history.state && history.state.modalLogistica) {
            history.back();
        }
    }
};

window.guardarItemLogistica = async (e) => {
    e.preventDefault();
    const modo = document.getElementById('modal-logistica-modo').value;
    const id = document.getElementById('modal-logistica-id').value;
    const tipo = document.getElementById('modal-logistica-tipo').value;

    const fecha = document.getElementById('modal-logistica-fecha').value;
    const codigo = document.getElementById('modal-logistica-codigo').value;
    const nombre = document.getElementById('modal-logistica-nombre').value;
    const cantidad = parseFloat(document.getElementById('modal-logistica-cantidad').value);

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const prevText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'Guardando...';
    btnSubmit.disabled = true;

    try {
        if (modo === 'agregar') {
            await fetch(`${API_URL}/logistica`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: currentProjectId, tipo, nombre, codigo, cantidad, fecha })
            });
        } else {
            const body = { nombre_item: nombre, codigo, cant_salida: cantidad, fecha };

            if (document.getElementById('modal-logistica-extra-obs').classList.contains('flex')) {
                body.comentario = document.getElementById('modal-logistica-comentario').value;
            }

            if (tipo === 'herramienta' && document.getElementById('modal-logistica-extra-herramienta').classList.contains('flex')) {
                const chk = document.getElementById('modal-logistica-retorno').checked;
                body.cant_retorno = chk ? cantidad : 0;
                body.estado = document.getElementById('modal-logistica-estado').value;
            } else if (tipo === 'material' && document.getElementById('modal-logistica-extra-material').classList.contains('flex')) {
                const uso = parseFloat(document.getElementById('modal-logistica-uso').value) || 0;
                body.cant_usada = uso;
                body.cant_retorno = cantidad - uso;
            }

            await fetch(`${API_URL}/logistica/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
        window.cerrarModalLogistica();
        cargarDatosLogistica();
    } catch (err) {
        alert("Error al guardar ítem");
        console.error(err);
    } finally {
        btnSubmit.innerHTML = prevText;
        btnSubmit.disabled = false;
    }
};

window.editarItemLogistica = async (id) => {
    const items = window.currentLogisticaItems || [];
    const item = items.find(i => i.id === id);
    if (!item) return;
    window.abrirModalLogistica('editar', item.tipo, item);
};

window.agregarItemLogistica = async (tipo) => {
    window.abrirModalLogistica('agregar', tipo);
};

window.borrarItemLogistica = async (id) => {
    if (confirm("¿Borrar ítem?")) {
        await fetch(`${API_URL}/logistica/${id}`, { method: 'DELETE' });
        cargarDatosLogistica();
    }
};

window.updateHerramienta = async (id, chk, tot) => {
    await fetch(`${API_URL}/logistica/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cant_retorno: chk ? tot : 0, estado: chk ? 'OK' : 'PENDIENTE' }) });
    cargarDatosLogistica();
};

window.updateMaterial = async (id, val, tot) => {
    const u = parseFloat(val) || 0;
    const calcEl = document.getElementById(`calc-${id}`);
    if (calcEl) { const dev = tot - u; calcEl.innerText = dev; calcEl.className = `p-2 text-center font-bold px-1 ${dev < 0 ? 'text-red-600' : 'text-blue-800'}`; }
    await fetch(`${API_URL}/logistica/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cant_usada: u, cant_retorno: tot - u }) });
};

window.updateEstado = async (id, val, tot) => {
    const body = { estado: val };
    if (val === 'PENDIENTE') body.cant_retorno = 0;
    else if (val === 'OK') body.cant_retorno = tot;

    await fetch(`${API_URL}/logistica/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    cargarDatosLogistica();
};
window.updateComentario = async (id, val) => { await fetch(`${API_URL}/logistica/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentario: val }) }); };

// --- CAROUSEL PREVIEW Y SUBIDA INTELIGENTE ---
window.previewFotosContext = {
    list: [],
    index: 0,
    tipo: '',
    btnOriginalText: ''
};

window.subirEvidenciaLogistica = async (tipo, input) => {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    window.previewFotosContext.tipo = tipo;
    window.previewFotosContext.index = 0;
    window.previewFotosContext.btnOriginalText = input.parentElement.innerHTML;

    // Convert files to memory objects for preview
    window.previewFotosContext.list = files.map(file => {
        let baseName = file.name;
        let extension = "";
        const dot = baseName.lastIndexOf('.');
        if (dot > 0) {
            extension = baseName.substring(dot);
            baseName = baseName.substring(0, dot);
        }
        return {
            file: file,
            originalName: file.name,
            baseName: baseName,
            extension: extension,
            previewUrl: URL.createObjectURL(file)
        };
    });

    document.getElementById('modal-backdrop-preview').classList.remove('hidden');
    renderPreviewFotoActual();
    input.value = ""; // clear so we can select same files again if needed
};

function renderPreviewFotoActual() {
    const ctx = window.previewFotosContext;
    if (ctx.list.length === 0) return window.cerrarPreviewFotos();

    const actual = ctx.list[ctx.index];

    document.getElementById('preview-counter').innerText = `${ctx.index + 1} / ${ctx.list.length}`;
    document.getElementById('preview-main-img').src = actual.previewUrl;
    document.getElementById('preview-input-nombre').value = actual.baseName;

    document.getElementById('preview-btn-prev').style.opacity = ctx.index > 0 ? '1' : '0.3';
    document.getElementById('preview-btn-prev').style.pointerEvents = ctx.index > 0 ? 'auto' : 'none';

    document.getElementById('preview-btn-next').style.opacity = ctx.index < ctx.list.length - 1 ? '1' : '0.3';
    document.getElementById('preview-btn-next').style.pointerEvents = ctx.index < ctx.list.length - 1 ? 'auto' : 'none';
}

window.previewFotoChange = (dir) => {
    const ctx = window.previewFotosContext;
    const newIdx = ctx.index + dir;
    if (newIdx >= 0 && newIdx < ctx.list.length) {
        ctx.index = newIdx;
        renderPreviewFotoActual();
    }
};

window.previewUpdateName = (val) => {
    const ctx = window.previewFotosContext;
    if (ctx.list.length === 0) return;
    // Remove slash and weird symbols that break filesystem manually
    const cleanVal = val.replace(/[\/\\:*?"<>|]/g, '');
    ctx.list[ctx.index].baseName = cleanVal;
};

window.cerrarPreviewFotos = () => {
    document.getElementById('modal-backdrop-preview').classList.add('hidden');
    window.previewFotosContext.list.forEach(item => URL.revokeObjectURL(item.previewUrl)); // Free memory
    window.previewFotosContext.list = [];
};

window.confirmarSubidaFotosLogistica = async () => {
    const ctx = window.previewFotosContext;
    if (ctx.list.length === 0) return;

    const btnSubir = document.getElementById('btn-preview-subir');
    const lblSubir = document.getElementById('lbl-preview-subir');

    const originalBtnHTML = btnSubir.innerHTML;
    lblSubir.innerHTML = `PROCESANDO ${ctx.list.length}...`;
    btnSubir.disabled = true;

    let encolados = 0;

    try {
        for (const item of ctx.list) {
            if (item.file.size > 10 * 1024 * 1024) continue;

            const finalName = (item.baseName.trim() || 'foto_sin_nombre') + item.extension;
            // Create a new file object with the renamed finalName
            const renamedFile = new File([item.file], finalName, { type: item.file.type });

            const fileComprimido = await comprimirFoto(renamedFile, 1200, 0.7);
            const fd = new FormData();
            fd.append('foto', fileComprimido, finalName); // Enforce new name explicitly here too

            const url = `${API_URL}/logistica/upload-evidence/${currentProjectId}/${ctx.tipo}`;
            const result = await uploadOrQueue(url, fd, currentProjectId, `logistica-${ctx.tipo}`);

            if (result.status === 'queued') encolados++;
        }

        if (encolados > 0) {
            alert(`Red desconectada o inestable.\n\n${encolados} foto(s) guardada(s) en tu celular de forma segura.`);
        }

    } catch (e) {
        console.error("Upload error:", e);
        alert("Error al subir foto(s)");
    } finally {
        btnSubir.innerHTML = originalBtnHTML;
        btnSubir.disabled = false;
        window.cerrarPreviewFotos();
        cargarDatosLogistica();
    }
};

window.toggleSeleccionLogistica = (tipo, archivo, checkbox) => {
    if (checkbox.checked) {
        if (!window.logisticaSeleccionadas[tipo].includes(archivo)) window.logisticaSeleccionadas[tipo].push(archivo);
    } else {
        window.logisticaSeleccionadas[tipo] = window.logisticaSeleccionadas[tipo].filter(f => f !== archivo);
    }
    actualizarBotonEliminarLogistica(tipo);
};

function actualizarBotonEliminarLogistica(tipo) {
    const btn = document.getElementById(`btn-delete-logistica-${tipo}`);
    const count = document.getElementById(`count-${tipo}`);
    const numSeleccionadas = window.logisticaSeleccionadas[tipo].length;

    if (btn && count) {
        count.innerText = numSeleccionadas;
        if (numSeleccionadas > 0) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
}

window.borrarEvidenciasLogisticaSeleccionadas = async (tipo) => {
    const seleccionadas = window.logisticaSeleccionadas[tipo];
    if (seleccionadas.length === 0) return;

    if (confirm(`¿Eliminar ${seleccionadas.length} foto(s)?`)) {
        document.getElementById(`btn-delete-logistica-${tipo}`).innerHTML = 'Borrando...';

        try {
            for (const archivo of seleccionadas) {
                await fetch(`${API_URL}/logistica/delete-evidence/${currentProjectId}/${tipo}/${archivo}`, { method: 'DELETE' });
            }
            window.logisticaSeleccionadas[tipo] = [];
            actualizarBotonEliminarLogistica(tipo);
            cargarDatosLogistica();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar las fotos");
        }
    }
};

window.borrarFotoLogistica = async (tipo, archivo) => {
    if (confirm("¿Eliminar esta foto permanentemente?")) {
        try {
            await fetch(`${API_URL}/logistica/delete-evidence/${currentProjectId}/${tipo}/${archivo}`, { method: 'DELETE' });
            cargarDatosLogistica();
        } catch (error) {
            alert("Error al borrar foto");
        }
    }
};