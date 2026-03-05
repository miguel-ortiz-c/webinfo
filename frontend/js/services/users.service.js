import { API_URL } from '../config.js';

export const usersService = {
    async getAll() {
        const res = await fetch(`${API_URL}/usuarios`);
        return await res.json();
    },
    async create(user) {
        const res = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(user)
        });
        return await res.json();
    },
    // Cambio de contraseña (Solo pass)
    async updatePassword(id, newPassword) {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password: newPassword })
        });
        return await res.json();
    },
    // NUEVO: Actualizar Rol y Empresa
    async updateData(id, role, empresa) {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ role, empresa })
        });
        return await res.json();
    },
    async delete(id) {
        const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        return res.ok;
    }
};