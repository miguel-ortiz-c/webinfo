import { closeLightbox } from '../components/Lightbox.js';
import { closeViewer } from '../components/ViewerModal.js';

export function initGlobalEvents() {

    // 1. Keyboard Events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {

            // Priority 1: Lightbox
            const lightbox = document.getElementById('previewModal');
            if (lightbox) {
                closeLightbox();
                return;
            }

            // Priority 2: Secondary Modals
            const secondaryModals = [
                'modal-logistica',
                'editDataModal',
                'modalClientes',
                'modalServicios',
                'modalUsuarios',
                'adminPanel'
            ];

            let secondaryClosed = false;
            secondaryModals.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden')) {
                    if (id === 'modal-logistica' && typeof window.cerrarModalLogistica === 'function') {
                        window.cerrarModalLogistica();
                    } else {
                        el.classList.add('hidden');
                    }
                    secondaryClosed = true;
                }
            });

            if (secondaryClosed) return;

            // Priority 3: Main Project Viewer
            const reporte = document.getElementById('reporteModal');
            if (reporte && !reporte.classList.contains('hidden')) {
                if (typeof closeViewer === 'function') {
                    closeViewer();
                } else if (window.cerrarReporte) {
                    window.cerrarReporte();
                }
            }
        }
    });

    // 2. Mobile Back Gesture
    window.addEventListener('popstate', (e) => {

        // Priority 1: Lightbox
        const lightbox = document.getElementById('previewModal');
        if (lightbox) {
            closeLightbox();
            // Restore project hash to stay in viewer
            if (window.currentViewerId) {
                history.pushState({ modal: 'viewer' }, '', `#proyecto-${window.currentViewerId}`);
            }
            return;
        }

        // Priority 2: Secondary Modals
        const secondaryModals = ['modal-logistica', 'editDataModal', 'modalClientes', 'modalServicios', 'modalUsuarios', 'adminPanel'];
        let secondaryClosed = false;
        secondaryModals.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) {
                if (id === 'modal-logistica' && typeof window.cerrarModalLogistica === 'function') {
                    window.cerrarModalLogistica(true);
                } else {
                    el.classList.add('hidden');
                }
                secondaryClosed = true;
            }
        });

        if (secondaryClosed) return;

        // Priority 3: Project Viewer
        const reporte = document.getElementById('reporteModal');
        if (reporte && !reporte.classList.contains('hidden')) {
            if (typeof closeViewer === 'function') {
                closeViewer(true);
            } else if (window.cerrarReporte) {
                window.cerrarReporte(true);
            }
        }
    });
}