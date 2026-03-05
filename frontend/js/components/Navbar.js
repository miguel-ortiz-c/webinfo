import { state } from '../config.js';

export function renderNavbar() {
    const container = document.getElementById('navbar-container');
    
    // 1. Nombre del Usuario (Capitalizado)
    const rawUser = state.user.username || 'Usuario';
    const userName = rawUser.charAt(0).toUpperCase() + rawUser.slice(1);
    
    // 2. Subtítulo: Determinamos el TIPO (Rol) en lugar del valor específico
    let userSubtitle = '';
    switch (state.user.role) {
        case 'admin':
            userSubtitle = 'ADMINISTRADOR';
            break;
        case 'tecnico':
            userSubtitle = 'TÉCNICO';
            break;
        case 'cliente':
            userSubtitle = 'EMPRESA'; // Antes decía el nombre de la empresa, ahora dice el tipo
            break;
        default:
            userSubtitle = 'INVITADO';
    }

    const html = `
        <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center bg-blue-900 shadow-md text-white">
            <div class="flex items-center">
                <i data-feather="layers" class="mr-2"></i>
                <div>
                    <h1 class="text-lg font-bold tracking-tight">EVERYTEL</h1>
                    <p class="text-[10px] text-blue-200 uppercase tracking-widest">v8.5 Modular</p>
                </div>
            </div>
            
            <div class="flex items-center gap-3">
                <div class="hidden sm:block text-right">
                    <div class="text-sm font-bold text-white leading-none">${userName}</div>
                    <div class="text-[10px] text-blue-300 font-mono mt-0.5 tracking-wide">${userSubtitle}</div>
                </div>

                <div class="bg-blue-800 p-1.5 rounded-lg border border-blue-700">
                    <i data-feather="user" width="18" height="18"></i>
                </div>

                <button onclick="logout()" class="text-white hover:text-red-300 ml-2 transition" title="Cerrar Sesión">
                    <i data-feather="log-out" width="18"></i>
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    if (window.feather) window.feather.replace();
}