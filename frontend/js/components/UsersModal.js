import { usersService } from '../services/users.service.js';

let editingUserId = null;

export function renderUsersModal() {
    const container = document.getElementById('users-modal-placeholder');
    if (!container) return;

    container.innerHTML = `
    <div id="modalUsuarios" class="hidden fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-2xl border-t-4 border-gray-800">
            
            <button onclick="abrirGestionUsuarios()" class="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-gray-100">
                <i data-feather="x"></i>
            </button>
            <h3 class="font-bold text-lg mb-4 text-gray-800 flex items-center">
                <i data-feather="users" class="mr-2"></i> Gestión de Accesos
            </h3>

            <div id="formContainer" class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 shadow-inner transition-colors duration-300">
                <div class="flex justify-between items-center mb-2">
                    <label id="formTitle" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nuevo Usuario</label>
                    <button id="btnCancelEdit" onclick="cancelarEdicion()" class="hidden text-[10px] text-red-500 font-bold hover:underline cursor-pointer">CANCELAR EDICIÓN</button>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <input id="newUseName" class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-500 outline-none transition disabled:bg-gray-200" placeholder="Usuario">
                    <input id="newUserPass" type="password" class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-gray-500 outline-none transition" placeholder="Contraseña">
                </div>

                <div class="flex gap-3 items-center">
                    <select id="newUserRole" class="w-1/3 p-2 border border-gray-300 rounded text-sm bg-white font-semibold cursor-pointer focus:ring-2 focus:ring-gray-500 outline-none" onchange="toggleEmpresaField(this)">
                        <option value="tecnico">👷 Técnico</option>
                        <option value="cliente">🏢 Empresa</option> 
                        <option value="admin">🛡️ Admin</option>
                    </select>

                    <div id="wrapperEmpresa" class="flex-1 relative">
                        <input id="newUserEmpresa" list="dl_empresas_users" class="w-full p-2 border border-indigo-300 bg-indigo-50 rounded text-sm font-bold text-indigo-900 placeholder-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Asignar Empresa..." value="TODOS">
                        <datalist id="dl_empresas_users" class="lista-empresas-global"></datalist>
                    </div>
                </div>

                <button id="btnSubmitUser" onclick="handleSubmitUser()" class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 mt-3 rounded shadow-md transition transform active:scale-95 flex justify-center items-center">
                    <i data-feather="user-plus" width="16" class="mr-2"></i> CREAR USUARIO
                </button>
            </div>

            <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Usuarios Activos</label>
                <div id="listaUsuarios" class="h-48 overflow-y-auto custom-scroll space-y-2 pr-1 bg-white border-t pt-2">
                    <p class="text-center text-gray-400 text-xs py-4">Cargando...</p>
                </div>
            </div>
        </div>
    </div>`;

    // --- LÓGICA ---
    window.abrirGestionUsuarios = () => {
        const m = document.getElementById('modalUsuarios');
        m.classList.toggle('hidden');
        if (!m.classList.contains('hidden')) {
            cancelarEdicion();
            loadUsersList();
            if(window.actualizarDatalistsEmpresas) window.actualizarDatalistsEmpresas();
        }
    };

    window.toggleEmpresaField = (sel) => {
        const input = document.getElementById('newUserEmpresa');
        if (sel.value === 'admin') {
            input.value = 'TODOS';
            input.disabled = true;
            input.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-100');
            input.classList.remove('bg-indigo-50', 'border-indigo-300');
        } else if (sel.value === 'cliente') {
            if(!input.value || input.value === 'TODOS') input.value = '';
            input.disabled = false;
            input.placeholder = "Busca la empresa...";
            input.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-100');
            input.classList.add('bg-indigo-50', 'border-indigo-300');
            input.focus();
        } else {
            if(!input.value) input.value = 'TODOS';
            input.disabled = false;
            input.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-100');
            input.classList.add('bg-indigo-50', 'border-indigo-300');
        }
    };

    window.handleSubmitUser = async () => {
        if (editingUserId) await guardarEdicion();
        else await crearUsuario();
    };

    async function crearUsuario() {
        const username = document.getElementById('newUseName').value.trim();
        const password = document.getElementById('newUserPass').value.trim();
        const role = document.getElementById('newUserRole').value;
        let empresa = document.getElementById('newUserEmpresa').value.trim();

        if(!username || !password) return alert("Usuario y contraseña requeridos.");
        if(!empresa) empresa = "TODOS";

        try {
            const res = await usersService.create({ username, password, role, empresa });
            if(res.success) {
                cancelarEdicion();
                loadUsersList();
            } else {
                alert(res.error || "Error al crear");
            }
        } catch(e) { alert("Error de conexión"); }
    }

    async function guardarEdicion() {
        const role = document.getElementById('newUserRole').value;
        let empresa = document.getElementById('newUserEmpresa').value.trim();
        if(!empresa) empresa = "TODOS";

        try {
            const res = await usersService.updateData(editingUserId, role, empresa);
            if(res.success) {
                cancelarEdicion();
                loadUsersList();
            } else {
                alert("Error al actualizar: " + (res.error || "Desconocido"));
            }
        } catch(e) { alert("Error de conexión al actualizar"); }
    }

    window.prepararEdicion = (id, username, role, empresa) => {
        editingUserId = id;
        const container = document.getElementById('formContainer');
        container.classList.remove('bg-gray-50');
        container.classList.add('bg-yellow-50', 'border-yellow-200');

        document.getElementById('formTitle').innerText = `EDITANDO: ${username}`;
        document.getElementById('formTitle').classList.add('text-yellow-700');
        document.getElementById('btnCancelEdit').classList.remove('hidden');
        
        const btn = document.getElementById('btnSubmitUser');
        btn.innerHTML = `<i data-feather="save" width="16" class="mr-2"></i> GUARDAR CAMBIOS`;
        btn.classList.remove('bg-gray-800', 'hover:bg-gray-900');
        btn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');

        const inputUser = document.getElementById('newUseName');
        inputUser.value = username;
        inputUser.disabled = true;

        const inputPass = document.getElementById('newUserPass');
        inputPass.classList.add('hidden'); 
        inputPass.value = '';

        const selectRole = document.getElementById('newUserRole');
        selectRole.value = role;
        
        const inputEmpresa = document.getElementById('newUserEmpresa');
        inputEmpresa.value = empresa;

        toggleEmpresaField(selectRole);
        if(window.feather) feather.replace();
    };

    window.cancelarEdicion = () => {
        editingUserId = null;
        const container = document.getElementById('formContainer');
        container.classList.add('bg-gray-50');
        container.classList.remove('bg-yellow-50', 'border-yellow-200');

        document.getElementById('formTitle').innerText = "Nuevo Usuario";
        document.getElementById('formTitle').classList.remove('text-yellow-700');
        document.getElementById('btnCancelEdit').classList.add('hidden');

        const btn = document.getElementById('btnSubmitUser');
        btn.innerHTML = `<i data-feather="user-plus" width="16" class="mr-2"></i> CREAR USUARIO`;
        btn.classList.add('bg-gray-800', 'hover:bg-gray-900');
        btn.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');

        document.getElementById('newUseName').value = '';
        document.getElementById('newUseName').disabled = false;
        document.getElementById('newUserPass').classList.remove('hidden');
        document.getElementById('newUserPass').value = '';
        document.getElementById('newUserRole').value = 'tecnico';
        const inputEmpresa = document.getElementById('newUserEmpresa');
        inputEmpresa.value = 'TODOS';
        inputEmpresa.disabled = false;
        inputEmpresa.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-100');

        if(window.feather) feather.replace();
    };

    window.handleDeleteUser = async (id) => {
        if (confirm("¿Eliminar usuario?")) {
            await usersService.delete(id);
            if(editingUserId === id) cancelarEdicion();
            loadUsersList();
        }
    };

    window.handleChangePass = async (id, username) => {
        const newPass = prompt(`Nueva contraseña para ${username}:`);
        if (newPass) {
            try {
                await usersService.updatePassword(id, newPass);
                alert("Contraseña actualizada.");
            } catch(e) { alert("Error"); }
        }
    };

    if(window.feather) feather.replace();
}

async function loadUsersList() {
    try {
        const users = await usersService.getAll();
        const list = document.getElementById('listaUsuarios');
        
        const dl = document.getElementById('dl_empresas_users');
        if(dl && !dl.innerHTML.includes('value="TODOS"')) {
            dl.innerHTML = `<option value="TODOS">ACCESO TOTAL</option>` + dl.innerHTML;
        }

        if (users.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-400 text-xs py-4">No hay usuarios.</p>';
            return;
        }

        list.innerHTML = users.map(u => {
            let roleBadge = 'bg-gray-100 text-gray-600 border-gray-200';
            let iconRole = 'user';
            
            // Texto para mostrar en la lista
            let roleLabel = u.role;

            if(u.role === 'admin') {
                roleBadge = 'bg-red-100 text-red-700 font-bold border-red-200';
                iconRole = 'shield';
                roleLabel = 'ADMIN';
            } else if(u.role === 'cliente') {
                roleBadge = 'bg-indigo-100 text-indigo-700 font-bold border-indigo-200';
                iconRole = 'briefcase';
                roleLabel = 'EMPRESA'; 
            } else {
                roleBadge = 'bg-blue-100 text-blue-700 font-bold border-blue-200';
                iconRole = 'tool';
                roleLabel = 'TÉCNICO';
            }

            const deleteBtn = u.id === 1 
                ? `<span class="text-[10px] text-gray-300 italic px-2">Master</span>`
                : `<button onclick="handleDeleteUser(${u.id})" class="text-gray-300 hover:text-red-500 p-1.5 transition rounded-full hover:bg-red-50" title="Eliminar"><i data-feather="trash-2" width="14"></i></button>`;

            return `
            <div class="flex justify-between items-center bg-white p-3 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition group">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-gray-800 text-sm">${u.username}</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded border ${roleBadge} uppercase flex items-center gap-1">
                            <i data-feather="${iconRole}" width="8" height="8"></i> ${roleLabel}
                        </span>
                    </div>
                    <div class="text-[10px] text-gray-500 truncate font-mono">
                        <span class="font-semibold text-gray-400">EMPRESA:</span> ${u.empresa_asignada}
                    </div>
                </div>
                <div class="flex items-center gap-1 border-l pl-2 ml-2 border-gray-100">
                    <button onclick="prepararEdicion(${u.id}, '${u.username}', '${u.role}', '${u.empresa_asignada}')" class="text-gray-300 hover:text-blue-600 p-1.5 transition rounded-full hover:bg-blue-50" title="Editar Rol/Empresa">
                        <i data-feather="edit-2" width="14"></i>
                    </button>
                    <button onclick="handleChangePass(${u.id}, '${u.username}')" class="text-gray-300 hover:text-yellow-600 p-1.5 transition rounded-full hover:bg-yellow-50" title="Cambiar Contraseña">
                        <i data-feather="key" width="14"></i>
                    </button>
                    ${deleteBtn}
                </div>
            </div>
            `;
        }).join('');
        
        if(window.feather) feather.replace();
    } catch(e) { console.error(e); }
}