// API config
export const API_URL = window.location.origin + '/api';

// Global State
export const state = {
    user: {
        role: null,
        username: null,
        empresa: null
    },
    currentProject: null,
    currentPath: '',
    uploadQueue: [],
    activeTab: 'fotos'
};