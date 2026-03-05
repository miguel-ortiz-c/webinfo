export function openLightbox(url, type, title) {
    const container = document.getElementById('overlay-layer');
    
    let content = '';
    if (type === 'image') {
        content = `<img src="${url}" class="max-w-full max-h-full object-contain rounded shadow-2xl animate-fade-in">`;
    } else if (type === 'pdf') {
        content = `<iframe src="${url}" class="w-full h-full rounded bg-white shadow-2xl" frameborder="0"></iframe>`;
    }

    container.innerHTML = `
    <div id="previewModal" class="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center backdrop-blur-sm transition-opacity duration-300">
        <div class="absolute top-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
            <h3 class="text-white font-bold text-sm truncate max-w-md drop-shadow-md">${title || 'Vista Previa'}</h3>
            <button onclick="closeLightbox()" class="text-white hover:text-red-400 bg-white/10 p-2 rounded-full backdrop-blur-md transition"><i data-feather="x"></i></button>
        </div>
        <div class="w-full h-full flex items-center justify-center p-4 md:p-8">
            ${content}
        </div>
    </div>`;

    document.body.style.overflow = 'hidden'; // Bloquear scroll
    if(window.feather) feather.replace();

    // Exponer cierre al window
    window.closeLightbox = closeLightbox;
}

export function closeLightbox() {
    const container = document.getElementById('overlay-layer');
    container.innerHTML = '';
    document.body.style.overflow = ''; // Restaurar scroll
}