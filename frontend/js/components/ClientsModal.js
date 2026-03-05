import { API_URL } from '../config.js';

export function renderClientsModal() {
    let container = document.getElementById('clients-modal-placeholder');
    if (!container) {
        container = document.createElement('div');
        container.id = 'clients-modal-placeholder';
        document.getElementById('modal-layer').appendChild(container);
    }

    container.innerHTML = `
    <div id="modalClientes" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <button onclick="document.getElementById('modalClientes').classList.add('hidden')" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-gray-100">
                <i data-feather="x"></i>
            </button>
            
            <h3 class="font-bold text-lg mb-4 text-indigo-800 border-b pb-2 flex items-center">
                <i data-feather="briefcase" class="mr-2"></i> Directorio de Empresas
            </h3>
            
            <div class="flex flex-col gap-2 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <input id="newClientName" class="border border-gray-300 rounded p-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="NOMBRE EMPRESA (Ej: CLARO)">
                <div class="flex gap-2">
                    <input id="newClientRuc" class="border border-gray-300 rounded p-2 flex-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="RUC (Opcional)">
                    <button onclick="crearCliente()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold shadow transition">AGREGAR</button>
                </div>
            </div>
            
            <div class="mb-2">
                <input type="text" id="searchClientInput" onkeyup="filtrarListaClientes()" placeholder="🔎 Buscar en lista..." class="w-full text-xs p-2 border rounded bg-gray-50 focus:outline-none focus:border-indigo-300">
            </div>

            <div id="listaClientesAdmin" class="h-64 overflow-y-auto border border-gray-200 rounded p-2 bg-white custom-scroll space-y-1">
                <p class="text-center text-gray-400 py-4">Cargando...</p>
            </div>
        </div>
    </div>`;

    // --- CERRAR CON ESC ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modalClientes');
            if (modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        }
    });

    // LÓGICA
    window.abrirGestionClientes = async () => {
        document.getElementById('modalClientes').classList.remove('hidden');
        // Enfocar el input al abrir para escribir rápido
        setTimeout(() => document.getElementById('newClientName').focus(), 100);
        await cargarListaClientes();
    };

    window.crearCliente = async () => {
        const nombre = document.getElementById('newClientName').value;
        const ruc = document.getElementById('newClientRuc').value;
        if (!nombre) return alert("El nombre es obligatorio");

        const res = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nombre, ruc })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('newClientName').value = '';
            document.getElementById('newClientRuc').value = '';
            document.getElementById('newClientName').focus(); // Re-enfocar
            await cargarListaClientes();
            if(window.actualizarDatalistsEmpresas) window.actualizarDatalistsEmpresas();
        } else {
            alert(data.error);
        }
    };

    window.borrarCliente = async (id) => {
        if(!confirm("¿Eliminar empresa del directorio?")) return;
        await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' });
        await cargarListaClientes();
        if(window.actualizarDatalistsEmpresas) window.actualizarDatalistsEmpresas();
    };

    window.filtrarListaClientes = () => {
        const term = document.getElementById('searchClientInput').value.toLowerCase();
        const items = document.querySelectorAll('.client-item');
        items.forEach(item => {
            const txt = item.innerText.toLowerCase();
            item.style.display = txt.includes(term) ? 'flex' : 'none';
        });
    };
    
    if(window.feather) feather.replace();
}

async function cargarListaClientes() {
    try {
        const res = await fetch(`${API_URL}/clientes`);
        const clientes = await res.json();
        const lista = document.getElementById('listaClientesAdmin');
        
        window.listaEmpresasGlobal = clientes;

        if (clientes.length === 0) {
            lista.innerHTML = '<p class="text-center text-gray-400 text-xs mt-4">No hay empresas registradas</p>';
            return;
        }

        lista.innerHTML = clientes.map(c => `
            <div class="client-item flex justify-between items-center bg-gray-50 hover:bg-indigo-50 p-2 border border-gray-100 rounded transition group">
                <div>
                    <div class="font-bold text-gray-800 text-sm">${c.nombre_empresa}</div>
                    <div class="text-[10px] text-gray-500">${c.ruc || 'S/N'}</div>
                </div>
                <button onclick="borrarCliente(${c.id})" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i data-feather="trash-2" width="14"></i></button>
            </div>
        `).join('');
        
        if(window.feather) feather.replace();
    } catch(e) { console.error(e); }
}