export const UploadCarousel = {
    context: {
        files: [],
        currentIndex: 0,
        isOpen: false,
        onConfirm: null,
        title: "Subir Fotos"
    },

    init: function () {
        if (document.getElementById('upload-carousel-modal')) return;

        const html = `
        <div id="upload-carousel-modal" class="fixed inset-0 bg-black/95 z-[70] flex flex-col hidden opacity-0 transition-opacity duration-300">
            <!-- Header -->
            <div class="w-full p-4 flex justify-between items-center text-white shrink-0">
                <div class="flex flex-col">
                    <span id="uc-title" class="font-bold text-lg">Subir Fotos</span>
                    <span id="uc-counter" class="text-sm text-gray-400">0 / 0</span>
                </div>
                <button onclick="UploadCarousel.close()" class="text-white hover:text-red-400 p-2 transition rounded-full bg-white/10 hover:bg-white/20">
                    <i data-feather="x" width="24" height="24"></i>
                </button>
            </div>

            <!-- Main Image View -->
            <div class="flex-1 w-full relative flex items-center justify-center p-2 sm:p-4 min-h-0">
                <button id="uc-btn-prev" onclick="UploadCarousel.prev()" class="absolute left-2 sm:left-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition shadow-lg">
                    <i data-feather="chevron-left" width="24" height="24"></i>
                </button>
                
                <img id="uc-main-img" src="" class="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-opacity duration-200">
                
                <button id="uc-btn-next" onclick="UploadCarousel.next()" class="absolute right-2 sm:right-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition shadow-lg">
                    <i data-feather="chevron-right" width="24" height="24"></i>
                </button>
            </div>

            <!-- Thumbnails Strip -->
            <div class="w-full h-24 bg-black/50 flex items-center px-4 gap-2 overflow-x-auto custom-scroll shrink-0 py-2 border-t border-gray-800" id="uc-thumbnails">
            </div>

            <!-- Input & Upload Button Area -->
            <div class="w-full p-4 sm:p-6 bg-gray-900 shrink-0 flex flex-col gap-4 border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div>
                    <label class="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                        <span>Comentario (Opcional)</span>
                        <span id="uc-filename-lbl" class="font-mono text-[10px] text-gray-500 truncate max-w-[50%] text-right"></span>
                    </label>
                    <input type="text" id="uc-input-comment" oninput="UploadCarousel.updateComment(this.value)" placeholder="Escribe un comentario o nota para esta foto..." class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition shadow-inner">
                </div>
                <button id="uc-btn-subir" onclick="UploadCarousel.confirm()" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-lg shadow-lg transition flex items-center justify-center gap-2 text-base">
                    <i data-feather="upload-cloud" width="20"></i> <span id="uc-lbl-subir">SUBIR FOTOS</span>
                </button>
            </div>
            
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        if (window.feather) window.feather.replace();
    },

    open: function (filesArray, title, onConfirmCallback) {
        if (!filesArray || filesArray.length === 0) return;

        this.context.title = title || "Subir Fotos";
        this.context.onConfirm = onConfirmCallback;
        this.context.currentIndex = 0;

        // Prepare file wrappers
        this.context.files = filesArray.map(f => {
            let originalName = f.name;
            // Clean weird characters from filename
            let safeName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

            return {
                file: f,
                originalName: originalName,
                safeName: safeName,
                comment: "",
                previewUrl: URL.createObjectURL(f)
            };
        });

        const modal = document.getElementById('upload-carousel-modal');
        document.getElementById('uc-title').innerText = this.context.title;

        modal.classList.remove('hidden');
        // Trigger reflow
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');

        this.context.isOpen = true;
        this.renderThumbnails();
        this.renderCurrent();

        // Push state for mobile back button
        history.pushState({ uploadCarousel: true }, '', location.href);
    },

    close: function (fromPopState = false) {
        const modal = document.getElementById('upload-carousel-modal');
        if (!modal) return;

        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            // Cleanup object URLs to avoid memory leaks
            this.context.files.forEach(f => URL.revokeObjectURL(f.previewUrl));
            this.context.files = [];
            this.context.isOpen = false;
        }, 300);

        if (!fromPopState && history.state && history.state.uploadCarousel) {
            history.back();
        }
    },

    renderCurrent: function () {
        const ctx = this.context;
        if (ctx.files.length === 0) return this.close();

        const curr = ctx.files[ctx.currentIndex];

        document.getElementById('uc-counter').innerText = `${ctx.currentIndex + 1} / ${ctx.files.length}`;

        const imgEl = document.getElementById('uc-main-img');
        imgEl.style.opacity = '0';
        setTimeout(() => {
            imgEl.src = curr.previewUrl;
            imgEl.style.opacity = '1';
        }, 150);

        document.getElementById('uc-input-comment').value = curr.comment || '';
        document.getElementById('uc-filename-lbl').innerText = curr.originalName;

        // Buttons
        document.getElementById('uc-btn-prev').style.opacity = ctx.currentIndex > 0 ? '1' : '0.3';
        document.getElementById('uc-btn-prev').style.pointerEvents = ctx.currentIndex > 0 ? 'auto' : 'none';

        document.getElementById('uc-btn-next').style.opacity = ctx.currentIndex < ctx.files.length - 1 ? '1' : '0.3';
        document.getElementById('uc-btn-next').style.pointerEvents = ctx.currentIndex < ctx.files.length - 1 ? 'auto' : 'none';

        this.updateThumbnailSelection();
    },

    renderThumbnails: function () {
        const container = document.getElementById('uc-thumbnails');
        container.innerHTML = this.context.files.map((f, i) => `
            <div onclick="UploadCarousel.goTo(${i})" id="uc-thumb-${i}" class="h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${i === this.context.currentIndex ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}">
                <img src="${f.previewUrl}" class="w-full h-full object-cover">
            </div>
        `).join('');
    },

    updateThumbnailSelection: function () {
        this.context.files.forEach((_, i) => {
            const el = document.getElementById(`uc-thumb-${i}`);
            if (el) {
                if (i === this.context.currentIndex) {
                    el.className = "h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 border-blue-500 scale-110 shadow-lg transition-all";
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    el.className = "h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 border-transparent opacity-50 hover:opacity-100 transition-all";
                }
            }
        });
    },

    goTo: function (index) {
        if (index >= 0 && index < this.context.files.length && index !== this.context.currentIndex) {
            this.context.currentIndex = index;
            this.renderCurrent();
        }
    },

    prev: function () { this.goTo(this.context.currentIndex - 1); },
    next: function () { this.goTo(this.context.currentIndex + 1); },

    updateComment: function (val) {
        if (this.context.files.length > 0) {
            this.context.files[this.context.currentIndex].comment = val;
        }
    },

    confirm: async function () {
        if (this.context.files.length === 0) return;

        const btn = document.getElementById('uc-btn-subir');
        const lbl = document.getElementById('uc-lbl-subir');
        const originalHTML = btn.innerHTML;

        btn.disabled = true;
        btn.classList.add('opacity-80', 'cursor-not-allowed');
        lbl.innerHTML = `<i data-feather="loader" class="animate-spin" width="18"></i> PROCESANDO ${this.context.files.length}...`;
        if (window.feather) window.feather.replace();

        try {
            if (typeof this.context.onConfirm === 'function') {
                await this.context.onConfirm(this.context.files);
            }
            this.close();
        } catch (e) {
            console.error("UploadCarousel Error:", e);
            await window.sysAlert("Ocurrió un error al procesar la subida.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
                btn.innerHTML = originalHTML;
                if (window.feather) window.feather.replace();
            }
        }
    }
};

// Initialize early
document.addEventListener('DOMContentLoaded', () => {
    UploadCarousel.init();
});

// Expose globally for popstate and external calls
window.UploadCarousel = UploadCarousel;

// Handle back button on mobile
window.addEventListener('popstate', (e) => {
    if (UploadCarousel.context.isOpen) {
        UploadCarousel.close(true);
    }
});
