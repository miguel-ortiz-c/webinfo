import { API_URL, state } from '../config.js';
import { scanFiles } from '../utils/file-scanner.js';

let fileUploadQueue = [];

export function renderUploadModal() {
    // 1. TÉCNICO: NO PUEDE CREAR PROYECTOS (Retorno inmediato)
    if (state.user.role === 'tecnico') return;

    // ... (El resto del código es idéntico al de tu versión anterior con las fechas opcionales) ...
    // Solo copia el contenido del archivo anterior pero ASEGURANDO que la primera línea sea:
    // if (state.user.role === 'tecnico') return;
    
    // (Para no repetir 300 líneas, usa el código que ya te di en el mensaje anterior
    //  pero cambia la primera línea de `if (state.user.role === 'cliente') return;`
    //  a `if (state.user.role === 'tecnico') return;`).
    
    const container = document.getElementById('upload-modal-container');
    
    // ... AQUÍ VA TODO EL HTML DEL FORMULARIO ...
    // (Puedes usar exactamente el mismo HTML del mensaje anterior "Q NO ME OBLIQUE A PONER FECHA...")
    container.innerHTML = `
    <div id="adminPanel" class="hidden bg-white p-6 rounded-xl shadow-xl mb-8 fade-in relative border-t-4 border-blue-600">
        
        <div class="flex justify-between items-center border-b pb-4 mb-6">
            <h2 class="text-xl font-bold text-blue-900 flex items-center">
                <i data-feather="file-plus" class="mr-2"></i> Generar Informe Técnico
            </h2>
            <button onclick="toggleUploadPanel()" class="text-gray-400 hover:text-red-500 transition hover:bg-gray-100 p-2 rounded-full">
                <i data-feather="x"></i>
            </button>
        </div>
        
        <form id="uploadForm" class="space-y-6">
            
            <div class="bg-yellow-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                <label class="block text-xs font-extrabold text-yellow-700 uppercase tracking-wider mb-2">1. Tipo de Servicio</label>
                <select id="servicioSelect" class="w-full p-3 border border-yellow-300 rounded-lg font-bold text-gray-700 bg-white focus:ring-2 focus:ring-yellow-400 outline-none transition cursor-pointer">
                    <option value="">-- Cargando lista... --</option>
                </select>
            </div>

            <div class="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                <h3 class="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-4 flex items-center">
                    <i data-feather="info" width="14" class="mr-2"></i> 2. Datos Generales
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div class="md:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cliente / Empresa</label>
                            <input type="text" id="empresa" list="dl_empresas_upload" class="input-form w-full rounded-lg border-gray-300" placeholder="Buscar o escribir..." required autocomplete="off">
                            <datalist id="dl_empresas_upload" class="lista-empresas-global"></datalist>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código del Cliente</label>
                            <input type="text" id="codigo_cliente" class="input-form w-full rounded-lg border-gray-300" placeholder="Ej: REQ-001">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Distrito</label>
                        <input type="text" id="distrito" class="input-form w-full rounded-lg border-gray-300" placeholder="Ej: Miraflores" required>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección Exacta</label>
                        <input type="text" id="direccion" class="input-form w-full rounded-lg border-gray-300" placeholder="Ej: Av. Larco 123" required>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Encargado Cliente</label>
                        <input type="text" id="encargado" class="input-form w-full rounded-lg border-gray-300" required>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Técnico Responsable</label>
                        <input type="text" id="tecnico" class="input-form w-full rounded-lg border-gray-300">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-[10px] font-bold text-green-600 uppercase mb-1">Fecha INICIO</label>
                            <input type="date" id="fechaInicio" class="input-form w-full rounded-lg border-green-200 text-green-800 font-semibold">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-red-500 uppercase mb-1">Fecha FIN</label>
                            <input type="date" id="fechaFin" class="input-form w-full rounded-lg border-red-200 text-red-800 font-semibold">
                        </div>
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asunto Principal</label>
                        <input type="text" id="asunto" class="input-form w-full rounded-lg border-gray-300 font-medium" placeholder="Resumen breve del trabajo" required>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 class="text-xs font-extrabold text-gray-600 uppercase tracking-wider mb-4 flex items-center">
                    <i data-feather="file-text" width="14" class="mr-2"></i> 3. Informe Detallado
                </h3>
                <div class="space-y-5">
                    <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descripción Inicial</label><textarea id="descripcion" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea></div>
                    <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Actividades Realizadas</label><textarea id="actividades" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Diagnóstico Técnico</label><textarea id="diagnostico" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea></div>
                        <div><label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Conclusiones</label><textarea id="conclusiones" class="input-form w-full rounded-lg border-gray-300 h-24"></textarea></div>
                    </div>
                    <div class="pt-2 border-t border-gray-200">
                        <label class="block text-[10px] font-bold text-purple-600 uppercase mb-1 flex items-center"><i data-feather="message-square" width="12" class="mr-1"></i> Comentarios Fotos (Opcional)</label>
                        <textarea id="comentarios_fotos" class="input-form w-full rounded-lg border-purple-200 bg-purple-50 text-xs font-mono h-20"></textarea>
                    </div>
                </div>
            </div>

            <div id="createDropZone" class="group border-2 border-dashed border-blue-300 bg-white hover:bg-blue-50 p-8 text-center cursor-pointer rounded-xl relative transition duration-300 ease-in-out">
                <input type="file" multiple webkitdirectory class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="window.procesarInputManual(this)">
                <div class="pointer-events-none transition transform group-hover:scale-105">
                    <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                        <i data-feather="layers" width="32" height="32"></i>
                    </div>
                    <span class="text-base font-bold text-blue-800 block">ARRASTRA AQUÍ TUS CARPETAS (OPCIONAL)</span>
                    <p class="text-xs text-blue-500 mt-1 mb-2">Puedes crear el proyecto ahora y subir fotos después</p>
                    <p id="fileCount" class="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 inline-block px-3 py-1 rounded-full mt-2">Sin archivos seleccionados</p>
                </div>
            </div>

            <div class="pt-2">
                <button type="submit" class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-md hover:shadow-lg flex justify-center items-center gap-2 transition transform hover:-translate-y-0.5 text-lg">
                    <i data-feather="save" width="20"></i> CREAR PROYECTO
                </button>
            </div>
        </form>
        
        <div id="uploadStatus" class="mt-4 text-center font-bold text-sm h-6"></div>
    </div>`;

    initUploadLogic();
    if(window.feather) feather.replace();
}

window.procesarInputManual = function(input) {
    const files = Array.from(input.files);
    files.forEach(f => f.fullPath = f.webkitRelativePath || f.name);
    fileUploadQueue = [...fileUploadQueue, ...files];
    const count = document.getElementById('fileCount');
    if(count) count.innerText = `${fileUploadQueue.length} archivos listos para subir`;
};

function initUploadLogic() {
    loadServices();
    window.toggleUploadPanel = () => document.getElementById('adminPanel').classList.toggle('hidden');

    const dropZone = document.getElementById('createDropZone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, x => { x.preventDefault(); x.stopPropagation(); }));
        
        dropZone.addEventListener('drop', async (e) => {
            const items = e.dataTransfer.items;
            const status = document.getElementById('fileCount');
            status.innerText = "Escaneando carpetas...";
            
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item) promises.push(scanFiles(item));
            }
            const results = await Promise.all(promises);
            const droppedFiles = results.flat();
            
            fileUploadQueue = [...fileUploadQueue, ...droppedFiles];
            status.innerText = `${fileUploadQueue.length} archivos listos para subir`;
        });
    }

    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const status = document.getElementById('uploadStatus');
            btn.disabled = true;
            status.innerHTML = '<span class="text-blue-600 animate-pulse">Creando proyecto...</span>';

            const fd = new FormData();
            fd.append('isNewProject', 'true');
            fd.append('servicio_cod', document.getElementById('servicioSelect').value);
            const empresaVal = document.getElementById('empresa').value.trim();
            fd.append('projectFolder', empresaVal.replace(/[^a-zA-Z0-9]/g, '_'));
            fd.append('codigo_cliente', document.getElementById('codigo_cliente').value);

            ['empresa','distrito','direccion','tecnico','asunto','encargado','descripcion','actividades','diagnostico','conclusiones','comentarios_fotos'].forEach(id => {
                const el = document.getElementById(id);
                if(el) fd.append(id, el.value);
            });
            fd.append('fecha_inicio', document.getElementById('fechaInicio').value);
            fd.append('fecha_fin', document.getElementById('fechaFin').value);

            const paths = [];
            if (fileUploadQueue.length > 0) {
                fileUploadQueue.forEach(f => {
                    fd.append('files', f); 
                    paths.push(f.fullPath || f.name);
                });
            }
            fd.append('filePaths', JSON.stringify(paths));

            try {
                const res = await fetch(`${API_URL}/informes/subir`, { method: 'POST', body: fd });
                const data = await res.json();

                if (res.ok) {
                    status.innerHTML = '<span class="text-green-600 font-bold">¡Creado Exitosamente!</span>';
                    fileUploadQueue = [];
                    form.reset(); 
                    document.getElementById('fileCount').innerText = "Sin archivos seleccionados";
                    setTimeout(() => { 
                        document.getElementById('adminPanel').classList.add('hidden'); 
                        status.innerHTML = ''; 
                        if (window.location.reload) window.location.reload(); 
                        btn.disabled = false;
                    }, 1500);
                } else {
                    status.innerHTML = `<span class="text-red-600">Error: ${data.error}</span>`;
                    btn.disabled = false;
                }
            } catch (e) {
                console.error(e);
                status.innerHTML = '<span class="text-red-600">Error de conexión.</span>';
                btn.disabled = false;
            }
        });
    }
}

async function loadServices() {
    try {
        const res = await fetch(`${API_URL}/informes/servicios`);
        const s = await res.json();
        const sel = document.getElementById('servicioSelect');
        if(sel) sel.innerHTML = s.map(x => `<option value="${x.codigo_servicio}">${x.nombre_servicio}</option>`).join('');
    } catch(e){}
}