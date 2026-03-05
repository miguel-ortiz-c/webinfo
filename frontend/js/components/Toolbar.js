import { state } from '../config.js';

export function renderToolbar() {
    const container = document.getElementById('toolbar-container');
    if (!container) return;

    // 1. TÉCNICO: No ve ninguna herramienta de gestión global
    if (state.user.role === 'tecnico') {
        container.classList.add('hidden');
        return;
    }

    // Aseguramos que el contenedor sea una sola fila y esté bien alineado a la derecha
    container.className = "flex flex-row justify-end gap-2 sm:gap-3 mb-6";
    
    let html = '';

    // 2. ADMIN: Ve todo (Servicios, Empresas, Usuarios)
    if (state.user.role === 'admin') {
        html += `
            <button onclick="abrirGestionServicios()" class="bg-purple-600 hover:bg-purple-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold flex items-center shadow-md transition hover:-translate-y-0.5" title="Servicios">
                <i data-feather="settings" class="sm:mr-2" width="18"></i> 
                <span class="hidden sm:inline">Servicios</span>
            </button>
            
            <button onclick="abrirGestionClientes()" class="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold flex items-center shadow-md transition hover:-translate-y-0.5" title="Empresas">
                <i data-feather="briefcase" class="sm:mr-2" width="18"></i> 
                <span class="hidden sm:inline">Empresas</span>
            </button>

            <button onclick="abrirGestionUsuarios()" class="bg-gray-700 hover:bg-gray-800 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold flex items-center shadow-md transition hover:-translate-y-0.5" title="Usuarios">
                <i data-feather="users" class="sm:mr-2" width="18"></i> 
                <span class="hidden sm:inline">Usuarios</span>
            </button>
        `;
    }

    // 3. AMBOS (Admin y Cliente): Ven el botón "Nuevo"
    html += `
        <button onclick="toggleUploadPanel()" class="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold flex items-center shadow-md transition hover:-translate-y-0.5" title="Nuevo Proyecto">
            <i data-feather="folder-plus" class="sm:mr-2" width="18"></i> 
            <span class="hidden sm:inline">Nuevo</span>
        </button>
    `;

    container.innerHTML = html;
    if (window.feather) feather.replace();
}