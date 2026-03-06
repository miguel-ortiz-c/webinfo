import { initAuth } from './core/auth.js';
import { API_URL } from './config.js';
import { initGlobalEvents } from './core/events.js';
import { renderNavbar } from './components/Navbar.js';
import { renderToolbar } from './components/Toolbar.js';
import { renderUploadModal } from './components/UploadModal.js';
import { renderUsersModal } from './components/UsersModal.js';
import { renderClientsModal } from './components/ClientsModal.js';
import { renderServicesModal } from './components/ServicesModal.js';
import { renderEditModal } from './components/EditModal.js';
import './components/ViewerModal.js';

import { projectsService } from './services/projects.service.js';
import { renderProjectList } from './components/ProjectList.js';
import { sincronizarPendientes } from './utils/offline-sync.js';

// --- GLOBAL MODAL HELPERS ---
window.sysAlert = async (text, icon = 'error') => {
    return Swal.fire({ text, icon, customClass: { container: 'custom-swal-container' }, confirmButtonColor: '#2563eb' });
};
window.sysConfirm = async (text) => {
    const res = await Swal.fire({ text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Sí', cancelButtonText: 'No', customClass: { container: 'custom-swal-container' } });
    return res.isConfirmed;
};
window.sysPrompt = async (title, inputValue = '') => {
    const res = await Swal.fire({ title, input: 'text', inputValue, showCancelButton: true, confirmButtonColor: '#2563eb', cancelButtonColor: '#6b7280', confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', customClass: { container: 'custom-swal-container' } });
    return res.isConfirmed ? res.value : null;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Starting Everytel v8.5...');

    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (e) {
            console.error('Fallo al registrar SW:', e);
        }
    } else {
        console.warn('Service Workers not supported.');
    }

    // 2. System Initialization

    // Verify session
    if (!initAuth()) return;

    // Inicializa eventos globales (como cerrar modales con Escape)
    initGlobalEvents();

    // Renderiza la interfaz base
    renderNavbar();
    renderToolbar();

    // Renderiza los modales (ocultos por defecto)
    renderUploadModal();
    renderUsersModal();
    renderServicesModal();
    renderClientsModal();
    renderEditModal();

    // Load projects
    await cargarProyectos();

    // 3. Global Listeners

    // Buscador global
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => cargarProyectos(e.target.value));
    }

    // Inicializa iconos de Feather
    if (window.feather) feather.replace();
});

// Load projects function
async function cargarProyectos(filtro = '') {
    const proyectos = await projectsService.getAll(filtro);
    renderProjectList(proyectos);
}

// Expose function to update company datalists
window.actualizarDatalistsEmpresas = async () => {
    try {
        const res = await fetch(`${API_URL}/clientes`);
        // Abort if error response
        if (!res.ok) return;

        const clientes = await res.json();
        const options = clientes.map(c => `<option value="${c.nombre_empresa}">`).join('');

        const lists = document.querySelectorAll('datalist.lista-empresas-global');
        lists.forEach(l => l.innerHTML = options);
    } catch (e) {
        console.error("Offline mode or error loading companies:", e);
    }
};
window.addEventListener('online', () => {
    console.log("🌐 Red detectada. Sincronizando...");
    sincronizarPendientes();
});

// 2. Intentar al cargar la app
setTimeout(sincronizarPendientes, 2000);

// Silent sync check
setInterval(() => {
    if (navigator.onLine) {
        sincronizarPendientes();
    }
}, 10000);

// Listen for sync completion
window.addEventListener('everytel_sync_completada', (e) => {
    const proyectosActualizados = e.detail.proyectos;
    console.log("Sync completed. Updated projects:", proyectosActualizados);

    if (window.currentViewerId && window.abrirViewer) {
        window.abrirViewer(window.currentViewerId);
    }
});

// Initial sync
setTimeout(sincronizarPendientes, 1000);
setTimeout(window.actualizarDatalistsEmpresas, 1000);