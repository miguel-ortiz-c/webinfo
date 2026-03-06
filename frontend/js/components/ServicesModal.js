import { API_URL } from '../config.js';

export function renderServicesModal() {
    let container = document.getElementById('services-modal-placeholder');
    if (!container) {
        container = document.createElement('div');
        container.id = 'services-modal-placeholder';
        document.getElementById('modal-layer').appendChild(container);
    }

    container.innerHTML = `
    <div id="modalServicios" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <button onclick="document.getElementById('modalServicios').classList.add('hidden')" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-gray-100">
                <i data-feather="x"></i>
            </button>
            
            <h3 class="font-bold text-lg mb-4 text-purple-800 border-b pb-2 flex items-center">
                <i data-feather="settings" class="mr-2"></i> Gestión de Servicios
            </h3>
            
            <div class="flex gap-2 mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
                <input id="newServiceCode" class="border border-gray-300 rounded p-2 w-20 text-center font-mono text-sm uppercase focus:ring-2 focus:ring-purple-500 outline-none" placeholder="COD">
                <input id="newServiceName" class="border border-gray-300 rounded p-2 flex-1 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Nombre del Servicio">
                <button onclick="crearServicio()" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded font-bold shadow transition"><i data-feather="plus"></i></button>
            </div>
            
            <div id="listaServiciosAdmin" class="h-64 overflow-y-auto border border-gray-200 rounded p-2 bg-white custom-scroll space-y-1">
                <p class="text-center text-gray-400 py-4">Cargando...</p>
            </div>
        </div>
    </div>`;

    // --- CERRAR CON ESC ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modalServicios');
            if (modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        }
    });

    // LÓGICA
    window.abrirGestionServicios = async () => {
        document.getElementById('modalServicios').classList.remove('hidden');
        setTimeout(() => document.getElementById('newServiceCode').focus(), 100);
        await cargarListaServicios();
    };

    window.crearServicio = async () => {
        const codigo = document.getElementById('newServiceCode').value.toUpperCase();
        const nombre = document.getElementById('newServiceName').value;
        if (!codigo || !nombre) return await window.sysAlert("Completa ambos campos");

        const res = await fetch(`${API_URL}/informes/servicios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, nombre })
        });

        if (res.ok) {
            document.getElementById('newServiceCode').value = '';
            document.getElementById('newServiceName').value = '';
            document.getElementById('newServiceCode').focus();
            await cargarListaServicios();
        } else {
            await window.sysAlert("Error al crear");
        }
    };

    window.borrarServicio = async (id) => {
        if (!(await window.sysConfirm("¿Eliminar servicio?"))) return;
        await fetch(`${API_URL}/informes/servicios/${id}`, { method: 'DELETE' });
        await cargarListaServicios();
    };

    if (window.feather) feather.replace();
}

async function cargarListaServicios() {
    try {
        const res = await fetch(`${API_URL}/informes/servicios`);
        const servicios = await res.json();
        const lista = document.getElementById('listaServiciosAdmin');

        if (servicios.length === 0) {
            lista.innerHTML = '<p class="text-center text-gray-400 text-xs mt-4">No hay servicios.</p>';
            return;
        }

        lista.innerHTML = servicios.map(s => `
            <div class="flex justify-between items-center bg-gray-50 hover:bg-purple-50 p-2 border border-gray-100 rounded transition group">
                <div class="flex items-center">
                    <span class="bg-purple-100 text-purple-700 font-mono font-bold px-2 py-0.5 rounded text-xs mr-3 border border-purple-200">${s.codigo_servicio}</span>
                    <span class="font-medium text-gray-700 text-sm">${s.nombre_servicio}</span>
                </div>
                <button onclick="borrarServicio(${s.id})" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i data-feather="trash-2" width="14"></i></button>
            </div>
        `).join('');

        if (window.feather) feather.replace();
    } catch (e) { console.error(e); }
}