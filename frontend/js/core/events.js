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

            // Priority 2.5: Clear selections before closing viewers
            let selectionCleared = false;

            if (window.evidenciasSeleccionadas && window.evidenciasSeleccionadas.length > 0) {
                if (typeof window.clearSeleccionEvidencias === 'function') {
                    window.clearSeleccionEvidencias();
                } else {
                    window.evidenciasSeleccionadas = [];
                }
                selectionCleared = true;
            }

            if (window.logisticaSeleccionadas && (window.logisticaSeleccionadas.salida.length > 0 || window.logisticaSeleccionadas.entrada.length > 0)) {
                if (typeof window.clearSeleccionLogistica === 'function') {
                    window.clearSeleccionLogistica();
                } else {
                    window.logisticaSeleccionadas.salida = [];
                    window.logisticaSeleccionadas.entrada = [];
                }
                selectionCleared = true;
            }

            if (selectionCleared) return;

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

        // Priority 1.5: UploadCarousel
        if (window.UploadCarousel && window.UploadCarousel.context.isOpen) {
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

        // Priority 2.5: Clear selections before closing viewers
        let selectionClearedPopstate = false;

        if (window.evidenciasSeleccionadas && window.evidenciasSeleccionadas.length > 0) {
            if (typeof window.clearSeleccionEvidencias === 'function') {
                window.clearSeleccionEvidencias();
            } else {
                window.evidenciasSeleccionadas = [];
            }
            selectionClearedPopstate = true;
        }

        if (window.logisticaSeleccionadas && (window.logisticaSeleccionadas.salida.length > 0 || window.logisticaSeleccionadas.entrada.length > 0)) {
            if (typeof window.clearSeleccionLogistica === 'function') {
                window.clearSeleccionLogistica();
            } else {
                window.logisticaSeleccionadas.salida = [];
                window.logisticaSeleccionadas.entrada = [];
            }
            selectionClearedPopstate = true;
        }

        if (selectionClearedPopstate) {
            if (window.currentViewerId) {
                history.pushState({ modal: 'viewer' }, '', `#proyecto-${window.currentViewerId}`);
            }
            return;
        }

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