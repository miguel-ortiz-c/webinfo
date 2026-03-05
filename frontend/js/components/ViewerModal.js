import { API_URL } from '../config.js';
import { getModalHTML } from './ViewerTemplates.js';
import { initTabs } from './ViewerTabs.js';
import { renderLogisticaSection } from './ViewerLogistica.js';
import { leerProyectoDescargado } from '../utils/offline-sync.js';

// Create container if it doesn't exist
export function renderViewerModal() {
    let container = document.getElementById('viewer-modal-container');
    if (!container) {
        const layer = document.getElementById('modal-layer');
        if (layer) {
            container = document.createElement('div');
            container.id = 'viewer-modal-container';
            layer.appendChild(container);
        } else {
            console.error("Error crítico: No se encontró #modal-layer en el HTML");
        }
    }
}

// Open viewer
export async function openViewer(id) {
    renderViewerModal();
    const container = document.getElementById('viewer-modal-container');
    if (!container) return alert("Error de interfaz.");

    window.currentViewerId = id;

    // Update history state for back button handling
    history.pushState({ modal: 'viewer', id: id }, '', `#proyecto-${id}`);

    // Mostrar Loader
    container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm transition-opacity">
        <div class="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce-small">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <span class="text-blue-800 font-bold text-lg tracking-wide">Cargando Proyecto...</span>
        </div>
    </div>`;

    try {
        let info = null;
        let logisticaPreCargada = null;

        try {
            // Attempt 1: Online Fetch
            const res = await fetch(`${API_URL}/informes/archivos/${id}`);
            if (!res.ok) throw new Error("Fetch falló");
            const data = await res.json();
            info = data.datos;

        } catch (networkError) {
            // Attempt 2: Offline Cache Fetch
            console.log("Network offline. Fetching from local cache...");
            const paqueteLocal = await leerProyectoDescargado(id);

            if (paqueteLocal && paqueteLocal.info) {
                info = paqueteLocal.info;
                // Si existe logística, la guardamos para pasarla al renderizado
                logisticaPreCargada = paqueteLocal.logistica;
                console.log("Loaded offline data");
            } else {
                throw new Error("Offline. Project was not downloaded for offline use.");
            }
        }

        if (!info) throw new Error("Datos del proyecto corruptos o no encontrados.");

        // Load templates and logic
        container.innerHTML = getModalHTML(info);

        if (logisticaPreCargada) {
            const logisticaContainer = document.getElementById('logistica-content');
            if (logisticaContainer) {
                logisticaContainer.innerHTML = '<div class="p-6 text-center text-gray-500 italic bg-gray-50 border border-gray-200 rounded-lg">Offline Mode. Logistics data will be shown here once local view is configured.</div>';
            }
        } else {
            await renderLogisticaSection(id);
        }

        initTabs(id);

        if (window.feather) feather.replace();
        document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo

    } catch (err) {
        console.error(err);
        alert(err.message);
        container.innerHTML = ''; // Limpiar loader
        document.body.style.overflow = '';
    }
}

// Global assignment
window.abrirViewer = openViewer;

// Close Viewer
export function closeViewer(fromPopState = false) {
    const container = document.getElementById('viewer-modal-container');
    const modal = document.getElementById('reporteModal');

    // Clean URL hash if closing directly
    if (!fromPopState && window.location.hash.startsWith('#proyecto-')) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }

    if (modal) {
        modal.classList.add('opacity-0'); // Efecto fade-out
        setTimeout(() => {
            if (container) container.innerHTML = '';
            document.body.style.overflow = '';
            window.currentViewerId = null;
        }, 200);
    } else {
        if (container) container.innerHTML = '';
        document.body.style.overflow = '';
        window.currentViewerId = null;
    }
}

window.cerrarReporte = closeViewer;

window.descargarUno = (id) => {
    window.open(`${API_URL}/informes/descargar-proyecto/${id}`, '_blank');
};