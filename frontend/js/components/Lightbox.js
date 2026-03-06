window.LightboxGallery = {
    items: [],
    currentIndex: 0,
    touchStartX: 0,
    touchEndX: 0,

    open: function (itemsArray, startIndex = 0) {
        if (!itemsArray || itemsArray.length === 0) return;
        this.items = itemsArray;
        this.currentIndex = startIndex;

        const container = document.getElementById('overlay-layer');
        container.innerHTML = `
        <div id="previewModal" class="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between backdrop-blur-sm transition-opacity duration-300">
            <!-- Top bar -->
            <div class="w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent shrink-0">
                <div class="text-gray-400 font-mono text-sm">
                    <span id="lb-counter"></span>
                </div>
                <div class="flex items-center gap-2">
                    <button id="lb-btn-edit" onclick="window.LightboxGallery.editComment()" class="text-white hover:text-blue-400 bg-white/10 p-2 rounded-full backdrop-blur-md transition hidden" title="Editar Comentario">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button onclick="window.LightboxGallery.close()" class="text-white hover:text-red-400 bg-white/10 p-2 rounded-full backdrop-blur-md transition">
                        <i data-feather="x"></i>
                    </button>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 w-full relative flex flex-col items-center justify-center p-2 sm:p-4 min-h-0">
                
                <!-- Navigation Arrows -->
                <button id="lb-btn-prev" onclick="window.LightboxGallery.prev(event)" class="absolute left-2 sm:left-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition shadow-lg hidden">
                    <i data-feather="chevron-left" width="24" height="24"></i>
                </button>
                <button id="lb-btn-next" onclick="window.LightboxGallery.next(event)" class="absolute right-2 sm:right-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-3 backdrop-blur-sm transition shadow-lg hidden">
                    <i data-feather="chevron-right" width="24" height="24"></i>
                </button>

                <!-- Render container -->
                <div id="lb-main-content" class="w-full h-full flex items-center justify-center overflow-hidden"></div>

                <!-- Title below image -->
                <div class="w-full text-center mt-4 shrink-0 px-8">
                    <p id="lb-title" class="text-white font-medium text-base md:text-lg break-words drop-shadow-md"></p>
                </div>
            </div>

            <!-- Thumbnails Strip -->
            <div id="lb-thumbnails" class="w-full h-24 bg-black/80 flex items-center px-4 gap-2 overflow-x-auto custom-scroll shrink-0 py-2 border-t border-gray-800 hidden">
            </div>
        </div>`;

        document.body.style.overflow = 'hidden';
        if (window.feather) feather.replace();
        this.renderCurrent();
        this.renderThumbnails();
        this.updateControls();
        this.addTouchListeners();
    },

    addTouchListeners: function () {
        const container = document.getElementById('lb-main-content');
        if (!container) return;

        container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    },

    handleSwipe: function () {
        const threshold = 50; // minimum distance to be considered a swipe
        if (this.touchEndX < this.touchStartX - threshold) {
            this.next();
        }
        if (this.touchEndX > this.touchStartX + threshold) {
            this.prev();
        }
    },

    renderCurrent: function () {
        if (!this.items.length) return;
        const item = this.items[this.currentIndex];
        const contentDiv = document.getElementById('lb-main-content');
        const titleEl = document.getElementById('lb-title');
        const counterEl = document.getElementById('lb-counter');

        counterEl.innerText = `${this.currentIndex + 1} / ${this.items.length}`;
        titleEl.innerText = item.title || '';

        // Solo permitir transición fadeIn para imágenes
        contentDiv.innerHTML = '';
        if (item.type === 'image') {
            const img = document.createElement('img');
            img.src = item.url;
            img.className = 'max-w-full max-h-full object-contain rounded shadow-2xl animate-fade-in transition-opacity duration-300';
            contentDiv.appendChild(img);
        } else if (item.type === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = item.url;
            iframe.className = 'w-full h-full rounded bg-white shadow-2xl';
            iframe.frameBorder = '0';
            contentDiv.appendChild(iframe);
        }

        this.updateThumbnailsSelection();
    },

    renderThumbnails: function () {
        const thumbContainer = document.getElementById('lb-thumbnails');
        if (this.items.length <= 1) {
            thumbContainer.classList.add('hidden');
            return;
        }

        thumbContainer.classList.remove('hidden');
        thumbContainer.innerHTML = this.items.map((item, i) => {
            if (item.type !== 'image') {
                return `
                <div id="lb-thumb-${i}" onclick="window.LightboxGallery.goTo(${i})" class="h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 border-transparent opacity-50 bg-gray-200 flex items-center justify-center">
                    <i data-feather="file" class="text-gray-500"></i>
                </div>`;
            }
            return `
            <div id="lb-thumb-${i}" onclick="window.LightboxGallery.goTo(${i})" class="h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all opacity-50 hover:opacity-100 border-transparent">
                <img src="${item.url}" class="w-full h-full object-cover">
            </div>`;
        }).join('');

        if (window.feather) feather.replace();
    },

    updateThumbnailsSelection: function () {
        if (this.items.length <= 1) return;
        this.items.forEach((_, i) => {
            const el = document.getElementById(`lb-thumb-${i}`);
            if (el) {
                if (i === this.currentIndex) {
                    el.className = "h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 border-blue-500 scale-110 shadow-lg transition-all";
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    el.className = "h-16 w-16 shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all opacity-50 hover:opacity-100 border-transparent";
                }
            }
        });
    },

    updateControls: function () {
        const btnPrev = document.getElementById('lb-btn-prev');
        const btnNext = document.getElementById('lb-btn-next');

        if (this.items.length > 1) {
            btnPrev.classList.remove('hidden');
            btnNext.classList.remove('hidden');

            btnPrev.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
            btnPrev.style.pointerEvents = this.currentIndex === 0 ? 'none' : 'auto';

            btnNext.style.opacity = this.currentIndex === this.items.length - 1 ? '0.3' : '1';
            btnNext.style.pointerEvents = this.currentIndex === this.items.length - 1 ? 'none' : 'auto';
        } else {
            btnPrev.classList.add('hidden');
            btnNext.classList.add('hidden');
        }

        const btnEdit = document.getElementById('lb-btn-edit');
        if (btnEdit) {
            const currentItem = this.items[this.currentIndex];
            if (currentItem && currentItem.type === 'image' && currentItem.fileRef) {
                btnEdit.classList.remove('hidden');
            } else {
                btnEdit.classList.add('hidden');
            }
        }
    },

    editComment: async function () {
        const item = this.items[this.currentIndex];
        if (!item || item.type !== 'image' || !item.fileRef) return;

        if (item.isLogistica) {
            await window.renombrarFotoLogistica(item.tipoLogistica, item.fileRef, item.comentario);
        } else {
            await window.renombrarItem(item.fileRef, item.comentario || '', true);
        }
        this.close();
    },

    next: function (e) {
        if (e) e.stopPropagation();
        if (this.currentIndex < this.items.length - 1) {
            this.currentIndex++;
            this.renderCurrent();
            this.updateControls();
        }
    },

    prev: function (e) {
        if (e) e.stopPropagation();
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderCurrent();
            this.updateControls();
        }
    },

    goTo: function (index) {
        this.currentIndex = index;
        this.renderCurrent();
        this.updateControls();
    },

    close: function () {
        const container = document.getElementById('overlay-layer');
        container.innerHTML = '';
        document.body.style.overflow = '';
        this.items = [];
    }
};

export function openLightbox(url, type, title) {
    window.LightboxGallery.open([{ url, type, title }]);
}

export function openLightboxGallery(itemsArray, startIndex) {
    window.LightboxGallery.open(itemsArray, startIndex);
}

export function closeLightbox() {
    window.LightboxGallery.close();
}

// Global exposure
window.closeLightbox = closeLightbox;
window.openLightboxGallery = openLightboxGallery;