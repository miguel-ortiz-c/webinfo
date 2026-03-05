import { API_URL, state } from '../config.js';
// Offline sync dependencies
import { obtenerTodosProyectosDescargados } from '../utils/offline-sync.js';

export const projectsService = {

    // Get all (with offline support)
    async getAll(search = '') {
        let empresaQuery = '';
        if (state.user.role === 'cliente' && state.user.empresa) {
            empresaQuery = `&empresa=${encodeURIComponent(state.user.empresa)}`;
        }

        try {
            // Validate online state
            if (!navigator.onLine) throw new Error("Offline mode");

            // Fetch online
            const url = `${API_URL}/informes/listar?busqueda=${search}${empresaQuery}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Fallo en servidor");
            return await res.json();

        } catch (error) {
            // Fetch from offline local DB
            console.log("Offline mode: fetching projects from local DB...");
            try {
                let proyectosLocales = await obtenerTodosProyectosDescargados();

                // Apply search filter locally
                if (search) {
                    const s = search.toLowerCase();
                    proyectosLocales = proyectosLocales.filter(p =>
                        (p.empresa && p.empresa.toLowerCase().includes(s)) ||
                        (p.distrito && p.distrito.toLowerCase().includes(s)) ||
                        (p.direccion && p.direccion.toLowerCase().includes(s)) ||
                        (p.codigo_proyecto && p.codigo_proyecto.toLowerCase().includes(s)) ||
                        (p.codigo_cliente && p.codigo_cliente.toLowerCase().includes(s))
                    );
                }

                // Apply company role filter
                if (state.user.role === 'cliente' && state.user.empresa && state.user.empresa !== 'TODOS') {
                    proyectosLocales = proyectosLocales.filter(p => p.empresa === state.user.empresa);
                }

                return proyectosLocales;
            } catch (e) {
                console.error("Error leyendo DB local:", e);
                return [];
            }
        }
    },

    // Eliminar
    async delete(id) {
        try {
            const res = await fetch(`${API_URL}/informes/eliminar/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (error) { return false; }
    },

    // Generación de reportes
    async generar(tipo, id) {
        const res = await fetch(`${API_URL}/informes/generar/${tipo}/${id}`, { method: 'POST' });
        return await res.json();
    },

    async convertirPdf(id) {
        const res = await fetch(`${API_URL}/informes/convertir/${id}`, { method: 'POST' });
        return await res.json();
    }
};