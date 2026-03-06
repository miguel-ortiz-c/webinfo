import { API_URL } from '../config.js';
import { openViewer } from './ViewerModal.js';
import { projectsService } from '../services/projects.service.js';
import { renderProjectList } from './ProjectList.js';

let currentEditId = null;

export function renderEditModal() {
    const container = document.getElementById('modal-layer');
    if (document.getElementById('editDataModalContainer')) return;

    const div = document.createElement('div');
    div.id = 'editDataModalContainer';

    // --- AQUÍ ESTÁ LA CORRECCIÓN ---
    // Se quitaron las clases "sticky top-0 bg-white z-10" del div de la cabecera
    div.innerHTML = `
    <div id="editDataModal" class="hidden fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 border-t-4 border-yellow-500 max-h-[90vh] overflow-y-auto custom-scroll relative">
            
            <div class="flex justify-between items-center border-b pb-4 mb-6">
                <h3 class="font-bold text-xl text-gray-800 flex items-center">
                    <i data-feather="edit-3" class="mr-2 text-yellow-500"></i> Editar Información
                </h3>
                <button onclick="document.getElementById('editDataModal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition p-2 hover:bg-gray-100 rounded-full">
                    <i data-feather="x"></i>
                </button>
            </div>

            <form id="editForm" class="space-y-6">
                
                <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                    <h3 class="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-4 flex items-center">
                        <i data-feather="info" width="14" class="mr-2"></i> Datos Generales
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div class="md:col-span-2">
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cliente / Empresa</label>
                                
                                <input type="text" id="editEmpresa" list="dl_empresas_edit" class="input-form w-full rounded-lg border-gray-300" autocomplete="off">
                                <datalist id="dl_empresas_edit" class="lista-empresas-global"></datalist>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código del Cliente</label>
                                <input type="text" id="editCodigoCliente" class="input-form w-full rounded-lg border-gray-300">
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Distrito</label>
                            <input type="text" id="editDistrito" class="input-form w-full rounded-lg border-gray-300">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección Exacta</label>
                            <input type="text" id="editDireccion" class="input-form w-full rounded-lg border-gray-300">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Encargado Cliente</label>
                            <input type="text" id="editEncargado" class="input-form w-full rounded-lg border-gray-300">
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Técnico Responsable</label>
                            <input type="text" id="editTecnico" class="input-form w-full rounded-lg border-gray-300">
                        </div>
                        <div class="grid grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-bold text-green-600 uppercase mb-1">Fecha INICIO</label>
                                <input type="date" id="editFechaInicio" class="input-form w-full rounded-lg border-green-200 text-green-800 font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-red-500 uppercase mb-1">Fecha FIN</label>
                                <input type="date" id="editFechaFin" class="input-form w-full rounded-lg border-red-200 text-red-800 font-semibold">
                            </div>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asunto Principal</label>
                            <input type="text" id="editAsunto" class="input-form w-full rounded-lg border-gray-300 font-medium">
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 class="text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-4 flex items-center">
                        <i data-feather="file-text" width="14" class="mr-2"></i> Informe Detallado
                    </h3>
                    
                    <div class="space-y-5">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descripción Inicial</label>
                            <textarea id="editDesc" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Actividades Realizadas</label>
                            <textarea id="editAct" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Diagnóstico Técnico</label>
                                <textarea id="editDiag" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conclusiones</label>
                                <textarea id="editConc" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-gray-200">
                            <label class="block text-[10px] font-bold text-purple-600 uppercase mb-1 flex items-center">
                                <i data-feather="message-square" width="12" class="mr-1"></i> Comentarios Fotos
                            </label>
                            <textarea id="editComentariosFotos" class="input-form w-full rounded-lg border-purple-200 bg-purple-50 text-xs font-mono h-24"></textarea>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-2 z-10">
                    <button type="button" onclick="document.getElementById('editDataModal').classList.add('hidden')" class="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition">Cancelar</button>
                    <button type="submit" class="px-8 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 font-bold shadow-lg flex items-center transition transform hover:scale-[1.02]">
                        <i data-feather="save" class="mr-2" width="18"></i> Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    </div>`;

    container.appendChild(div);
    document.getElementById('editForm').addEventListener('submit', handleSaveEdit);
    if (window.feather) feather.replace();
}

window.abrirEditarProyecto = async () => {
    currentEditId = window.currentViewerId;

    try {
        const res = await fetch(`${API_URL}/informes/archivos/${currentEditId}`);
        const data = await res.json();
        const info = data.datos;

        document.getElementById('editEmpresa').value = info.empresa || '';
        document.getElementById('editCodigoCliente').value = info.codigo_cliente || '';
        // CARGAR DISTRITO Y DIRECCION
        document.getElementById('editDistrito').value = info.distrito || '';
        document.getElementById('editDireccion').value = info.direccion || '';

        document.getElementById('editEncargado').value = info.encargado || '';
        document.getElementById('editTecnico').value = info.tecnico || '';
        document.getElementById('editAsunto').value = info.asunto || '';
        document.getElementById('editFechaInicio').value = info.fecha_inicio || '';
        document.getElementById('editFechaFin').value = info.fecha_fin || '';

        document.getElementById('editDesc').value = info.descripcion || '';
        document.getElementById('editAct').value = info.actividades || '';
        document.getElementById('editDiag').value = info.diagnostico || '';
        document.getElementById('editConc').value = info.conclusiones || '';
        document.getElementById('editComentariosFotos').value = info.comentarios_fotos || '';

        document.getElementById('editDataModal').classList.remove('hidden');
    } catch (e) {
        await window.sysAlert("Error al cargar datos para editar.");
    }
};

async function handleSaveEdit(e) {
    e.preventDefault();
    if (!currentEditId) return;

    const body = {
        empresa: document.getElementById('editEmpresa').value,
        codigo_cliente: document.getElementById('editCodigoCliente').value,
        // GUARDAR DISTRITO Y DIRECCION
        distrito: document.getElementById('editDistrito').value,
        direccion: document.getElementById('editDireccion').value,

        encargado: document.getElementById('editEncargado').value,
        tecnico: document.getElementById('editTecnico').value,
        asunto: document.getElementById('editAsunto').value,
        fecha_inicio: document.getElementById('editFechaInicio').value,
        fecha_fin: document.getElementById('editFechaFin').value,
        descripcion: document.getElementById('editDesc').value,
        actividades: document.getElementById('editAct').value,
        diagnostico: document.getElementById('editDiag').value,
        conclusiones: document.getElementById('editConc').value,
        comentarios_fotos: document.getElementById('editComentariosFotos').value
    };

    try {
        await fetch(`${API_URL}/informes/editar/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        document.getElementById('editDataModal').classList.add('hidden');
        openViewer(currentEditId);

        const searchInput = document.getElementById('global-search');
        const term = searchInput ? searchInput.value : '';
        const updatedProjects = await projectsService.getAll(term);
        renderProjectList(updatedProjects);

    } catch (err) {
        console.error(err);
        await window.sysAlert("Error al guardar cambios");
    }
}