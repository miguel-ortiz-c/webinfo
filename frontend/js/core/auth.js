import { state } from '../config.js';

export function initAuth() {
    const role = localStorage.getItem('everytel_role');
    const user = localStorage.getItem('everytel_user') || 'Usuario';
    const empresa = localStorage.getItem('everytel_empresa');

    // Check role
    if (!role) {
        window.location.href = 'index.html';
        return false;
    }

    // Save to global state
    state.user.role = role;
    state.user.username = user;
    state.user.empresa = empresa;

    console.log(`Session started as: ${role}`);
    return true;
}

export function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Expose logout globally
window.logout = logout;