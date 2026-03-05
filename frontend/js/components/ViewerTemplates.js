import { state } from '../config.js';

window.switchMainTab = (tabId) => {
    // Hide all contents
    document.querySelectorAll('.main-tab-content').forEach(el => {
        el.classList.remove('block');
        el.classList.add('hidden');
    });
    // Show selected
    const selectedContent = document.getElementById(`main-content-${tabId}`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
        selectedContent.classList.add('block');
    }

    // Update tab styling
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-600', 'text-blue-700');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    const selectedBtn = document.getElementById(`main-tab-${tabId}`);
    if (selectedBtn) {
        selectedBtn.classList.remove('border-transparent', 'text-gray-500');
        selectedBtn.classList.add('border-blue-600', 'text-blue-700');
    }
};

export function getModalHTML(info) {
    const val = (text) => text || '---';

    const canEdit = state.user.role === 'admin' || state.user.role === 'cliente';

    // Código del cliente adaptado para celular
    const clienteCodeStr = info.codigo_cliente
        ? `<span class="text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm sm:text-xl font-bold tracking-wide border border-red-200 whitespace-nowrap">(${info.codigo_cliente})</span>`
        : '';

    // Botón responsivo: Solo lapicito en móvil, "Editar" completo en PC. Pegado a la X.
    const btnEditar = canEdit
        ? `<button onclick="window.abrirEditarProyecto()" class="bg-yellow-500 hover:bg-yellow-600 text-white p-1.5 sm:p-2 px-2 sm:px-4 rounded-lg shadow font-bold text-sm flex items-center transition mr-2 hover:scale-105 transform" title="Editar Proyecto">
             <i data-feather="edit-2" class="w-4 h-4 sm:w-4 sm:h-4 sm:mr-2"></i> 
             <span class="hidden sm:inline">Editar</span>
           </button>`
        : '';

    const styleLabel = "font-semibold text-[11px] text-gray-500 uppercase tracking-widest mb-1";
    const styleValue = "font-medium text-gray-800 text-sm";
    const styleValueLarge = "font-bold text-gray-800 text-lg leading-tight";

    return `
    <div id="reporteModal" class="fixed inset-0 z-[60] flex items-center justify-center sm:p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-black bg-opacity-90 transition-opacity backdrop-blur-sm"></div>
        
        <div class="z-10 w-full h-full sm:h-auto max-h-screen max-w-6xl bg-white sm:rounded-2xl shadow-2xl relative overflow-hidden font-sans flex flex-col transition-all transform">
            
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-6 flex flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 border-b-2 border-blue-500 shrink-0 relative">
                
                <div class="flex items-center w-full pr-24 sm:pr-0">
                    <div class="p-2 sm:p-3 mr-3 sm:mr-4 shrink-0 opacity-80">
                        <i data-feather="clipboard" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div class="flex flex-col justify-center">
                        <p class="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-0.5 sm:mb-1">Informe Técnico</p>
                        <h2 class="text-lg sm:text-2xl font-bold tracking-tight leading-none flex items-center flex-wrap gap-1.5 sm:gap-2">
                            <span>${val(info.codigo_proyecto)}</span>
                            ${clienteCodeStr}
                        </h2>
                    </div>
                </div>

                <div class="flex items-center absolute top-4 right-4 sm:relative sm:top-0 sm:right-0">
                    ${btnEditar}
                    <button onclick="cerrarReporte()" class="bg-white/10 p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition hover:rotate-90 hover:text-red-300">
                        <i data-feather="x" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </button>
                </div>
            </div>

            <div class="bg-gray-50 flex-1 overflow-y-auto custom-scroll flex flex-col">
                
                <!-- TABS HEADER -->
                <div class="bg-white border-b border-gray-200 px-2 sm:px-8 pt-4 flex justify-between sm:justify-start gap-1 sm:gap-4 overflow-x-hidden shrink-0 sticky top-0 z-20 w-full">
                    <button onclick="window.switchMainTab('datos')" id="main-tab-datos" class="main-tab-btn flex-1 sm:flex-none justify-center px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-bold border-b-2 border-blue-600 text-blue-700 whitespace-nowrap transition-colors flex items-center">
                        <i data-feather="database" class="mr-1 sm:mr-2 w-4 h-4"></i> <span class="hidden xs:inline">Datos del Proyecto</span><span class="inline xs:hidden">Datos</span>
                    </button>
                    <button onclick="window.switchMainTab('logistica')" id="main-tab-logistica" class="main-tab-btn flex-1 sm:flex-none justify-center px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap transition-colors flex items-center">
                        <i data-feather="package" class="mr-1 sm:mr-2 w-4 h-4"></i> <span class="hidden xs:inline">Logística y Recursos</span><span class="inline xs:hidden">Logística</span>
                    </button>
                    <button onclick="window.switchMainTab('evidencias')" id="main-tab-evidencias" class="main-tab-btn flex-1 sm:flex-none justify-center px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap transition-colors flex items-center">
                        <i data-feather="folder" class="mr-1 sm:mr-2 w-4 h-4"></i> <span class="hidden xs:inline">Evidencias</span><span class="inline xs:hidden">Evidencias</span>
                    </button>
                </div>

                <!-- TAB CONTENT CONTAINER -->
                <div class="p-4 sm:p-6 md:p-8 flex-1">
                
                <!-- TAB 1: DATOS DEL PROYECTO -->
                <div id="main-content-datos" class="main-tab-content block">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-6 mb-6">
                    <h3 class="text-base font-semibold text-gray-800 mb-5 flex items-center border-b border-gray-100 pb-3">
                        <i data-feather="info" class="mr-2 w-4 h-4 text-blue-500"></i> Información General
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        <div class="space-y-5 md:border-r border-gray-100 md:pr-6">
                            <div><p class="${styleLabel}">Cliente / Empresa</p><p id="viewEmpresa" class="${styleValueLarge}">${val(info.empresa)}</p></div>
                            <div class="grid grid-cols-2 gap-4">
                                <div><p class="${styleLabel}">Distrito</p><p id="viewDistrito" class="${styleValue}">${val(info.distrito)}</p></div>
                                <div><p class="${styleLabel}">Dirección</p><p id="viewDireccion" class="${styleValue} truncate" title="${info.direccion}">${val(info.direccion)}</p></div>
                            </div>
                            <div><p class="${styleLabel}">Encargado Cliente</p><p id="viewEncargado" class="${styleValue}">${val(info.encargado)}</p></div>
                        </div>
                        <div class="space-y-5 md:border-r border-gray-100 md:pr-6">
                            <div>
                                <p class="${styleLabel}">Técnico Responsable</p>
                                <p id="viewTecnico" class="${styleValue} flex items-center"><i data-feather="user-check" width="14" class="mr-2 text-gray-400"></i> ${val(info.tecnico)}</p>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-emerald-50/80 p-3 rounded-md border border-emerald-100">
                                    <p class="font-semibold text-[10px] text-emerald-600 uppercase mb-1">Inicio</p><p id="viewFechaInicio" class="font-medium text-gray-800">${val(info.fecha_inicio)}</p>
                                </div>
                                <div class="bg-rose-50/80 p-3 rounded-md border border-rose-100">
                                    <p class="font-semibold text-[10px] text-rose-600 uppercase mb-1">Fin</p><p id="viewFechaFin" class="font-medium text-gray-800">${val(info.fecha_fin)}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p class="${styleLabel}">Asunto Principal</p>
                            <div class="bg-blue-50/50 p-4 rounded-md border border-blue-100"><p id="viewAsunto" class="text-gray-800 font-medium leading-snug">${val(info.asunto)}</p></div>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-6 mb-6 space-y-6">
                    <h3 class="text-base font-semibold text-gray-800 mb-4 flex items-center border-b border-gray-100 pb-3">
                        <i data-feather="file-text" class="mr-2 w-4 h-4 text-blue-500"></i> Desarrollo Técnico
                    </h3>
                    <div class="grid grid-cols-1 gap-6">
                        <div><h4 class="${styleLabel}">Descripción Inicial</h4><div id="viewDesc" class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-200">${val(info.descripcion)}</div></div>
                        <div><h4 class="${styleLabel}">Actividades Realizadas</h4><div id="viewAct" class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-200">${val(info.actividades)}</div></div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><h4 class="${styleLabel}">Diagnóstico Técnico</h4><div id="viewDiag" class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-200 h-full">${val(info.diagnostico)}</div></div>
                            <div><h4 class="${styleLabel}">Conclusiones</h4><div id="viewConc" class="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-200 h-full">${val(info.conclusiones)}</div></div>
                        </div>
                        ${info.comentarios_fotos ? `<div class="bg-indigo-50/70 p-4 rounded-md border-l-4 border-indigo-400 mt-2"><h4 class="font-semibold text-xs text-indigo-700 uppercase mb-2 flex items-center"><i data-feather="message-circle" width="14" class="mr-2"></i> Comentarios Fotos</h4><p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${val(info.comentarios_fotos)}</p></div>` : ''}
                    </div>
                </div>
                </div> <!-- END TAB 1 -->
                
                <!-- TAB 2: LOGISTICA Y RECURSOS -->
                <div id="main-content-logistica" class="main-tab-content hidden">
                    <div id="logistica-content" class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-6"></div>
                </div> <!-- END TAB 2 -->

                <!-- TAB 3: EVIDENCIAS -->
                <div id="main-content-evidencias" class="main-tab-content hidden">
                    <div class="bg-gray-50 p-3 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-3">
                        <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                            <h3 class="text-base font-semibold text-gray-800 flex items-center"><i data-feather="folder" class="mr-2 w-4 h-4 text-blue-500"></i> Evidencias</h3>
                            <div class="flex bg-white rounded-lg p-1 border border-gray-300 shadow-sm">
                                <button onclick="switchTab('fotos')" id="tab-btn-fotos" class="px-3 py-1 text-xs font-bold rounded-md transition-colors bg-blue-100 text-blue-700">FOTOS</button>
                                <button onclick="switchTab('word')" id="tab-btn-word" class="px-3 py-1 text-xs font-bold rounded-md transition-colors text-gray-500 hover:bg-gray-100">WORD</button>
                                <button onclick="switchTab('pdf')" id="tab-btn-pdf" class="px-3 py-1 text-xs font-bold rounded-md transition-colors text-gray-500 hover:bg-gray-100">PDF</button>
                            </div>
                        </div>
                        <div id="tab-actions" class="flex items-center gap-2 justify-end w-full md:w-auto"></div>
                    </div>
                    <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-500 font-mono overflow-x-auto" id="browserBreadcrumbs"></div>
                    <div id="tab-content-wrapper" class="relative bg-gray-50 min-h-[300px]">
                        <div id="tab-content" class="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto max-h-[500px] custom-scroll relative z-10"></div>
                        <div id="dragOverlay" class="hidden absolute inset-0 bg-blue-100/90 flex flex-col items-center justify-center text-blue-700 z-50 pointer-events-none backdrop-blur-sm">
                            <div class="bg-white p-4 rounded-full shadow-xl mb-2 animate-bounce"><i data-feather="upload-cloud" width="48" height="48"></i></div>
                            <span class="font-bold text-lg tracking-wide">Suelta aquí para subir</span>
                        </div>
                    </div>
                </div>
                </div>
                </div> <!-- END TAB 3 -->
                
                </div> <!-- END TAB CONTENT CONTAINER -->
            </div>
            
            <div class="bg-gray-100 p-4 border-t border-gray-200 text-center sm:text-right shrink-0">
                <button onclick="descargarUno(currentViewerId)" class="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow inline-flex justify-center items-center transition hover:-translate-y-0.5">
                    <i data-feather="archive" class="mr-2" width="18"></i> DESCARGAR ZIP
                </button>
            </div>
            
        </div>
    </div>`;
}