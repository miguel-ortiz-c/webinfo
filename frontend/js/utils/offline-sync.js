// Photo compression engine
export async function comprimirFoto(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        // Si no es imagen, no la comprimimos
        if (!file.type.match(/image.*/)) return resolve(file);

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calcular nueva proporción
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert hack to blob
                canvas.toBlob((blob) => {
                    // Recreamos un objeto File para que sea compatible con FormData
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.src = readerEvent.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// IndexedDB offline storage
let dbPromise = null;

export function initOfflineDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('EverytelOfflineDB', 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Creamos la "tabla" para la cola de subidas (fotos nuevas)
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('proyectosDescargados')) {
                    db.createObjectStore('proyectosDescargados', { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

// Guardar un elemento en la cola de subida
export async function guardarEnColaOffline(datosProyecto, archivos) {
    const db = await initOfflineDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');

    const payload = {
        datos: datosProyecto,
        archivos: archivos, // Archivos ya comprimidos
        fecha_guardado: new Date().toISOString(),
        estado: 'pendiente'
    };

    return new Promise((resolve, reject) => {
        const req = store.add(payload);
        req.onsuccess = () => resolve(req.result); // Devuelve el ID local
        req.onerror = () => reject(req.error);
    });
}

export async function guardarProyectoDescargado(proyectoId, datosProyecto) {
    const db = await initOfflineDB();
    const tx = db.transaction('proyectosDescargados', 'readwrite');
    const store = tx.objectStore('proyectosDescargados');

    return new Promise((resolve, reject) => {
        // 'put' actualiza si ya existe, crea si no existe
        const req = store.put({ id: proyectoId, datos: datosProyecto });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

// Delete downloaded project
export async function borrarProyectoDescargado(proyectoId) {
    const db = await initOfflineDB();
    const tx = db.transaction('proyectosDescargados', 'readwrite');
    const store = tx.objectStore('proyectosDescargados');

    return new Promise((resolve, reject) => {
        const req = store.delete(proyectoId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

// Read downloaded project
export async function leerProyectoDescargado(proyectoId) {
    const db = await initOfflineDB();
    const tx = db.transaction('proyectosDescargados', 'readonly');
    const store = tx.objectStore('proyectosDescargados');

    return new Promise((resolve, reject) => {
        const req = store.get(proyectoId);
        req.onsuccess = () => resolve(req.result ? req.result.datos : null);
        req.onerror = () => reject(req.error);
    });
}

// Check if project is downloaded
export async function isProyectoDescargado(proyectoId) {
    const data = await leerProyectoDescargado(proyectoId);
    return data !== null;
}

export async function uploadOrQueue(url, formData, proyectoId, tipoUpload) {
    try {
        // Intento 1: Mandar al servidor (Online)
        const res = await fetch(url, { method: 'POST', body: formData });
        if (!res.ok) throw new Error("Fallo en el servidor");
        return { status: 'success', source: 'online' };

    } catch (networkError) {
        console.warn("Network offline. Saving to local queue.");

        const db = await initOfflineDB();
        const tx = db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');

        // Extraer el archivo del FormData (es un Blob/File)
        let fileBlob = null;
        for (let [key, value] of formData.entries()) {
            if (value instanceof File || value instanceof Blob) {
                fileBlob = value;
                break;
            }
        }

        if (!fileBlob) return { status: 'error', message: 'No se encontró archivo para guardar' };

        const payload = {
            proyectoId: proyectoId,
            urlDestino: url,
            tipo: tipoUpload, // ej: 'logistica-salida', 'logistica-entrada', 'evidencia-general'
            archivo: fileBlob,
            nombreOriginal: fileBlob.name,
            fecha_guardado: new Date().toISOString(),
            estado: 'pendiente'
        };

        return new Promise((resolve, reject) => {
            const req = store.add(payload);
            req.onsuccess = () => resolve({ status: 'queued', source: 'offline' });
            req.onerror = () => reject({ status: 'error', message: 'Fallo al guardar en cola local' });
        });
    }
}

export async function obtenerPendientesProyecto(proyectoId) {
    const db = await initOfflineDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
            const todos = req.result || [];
            // Devolvemos solo las fotos que le pertenecen a este proyecto
            const pendientes = todos.filter(item => item.proyectoId === proyectoId);
            resolve(pendientes);
        };
        req.onerror = () => reject(req.error);
    });
}

// Sync manager
export async function sincronizarPendientes() {
    if (!navigator.onLine) {
        console.log("No internet connection. Sync postponed.");
        return false;
    }

    let db;
    try {
        db = await initOfflineDB();
    } catch (dbError) {
        console.error("Error al inicializar la base de datos offline para sincronización:", dbError);
        return false;
    }

    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');

    const pendientes = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => {
            console.error("Error al obtener elementos pendientes de la cola:", req.error);
            reject(req.error);
        };
    });

    if (pendientes.length === 0) {
        // No hay nada que sincronizar, salimos silenciosamente.
        return false;
    }

    console.log(`Starting sync for ${pendientes.length} files...`);

    let sincronizados = 0;
    const proyectosAfectados = new Set();

    const promesas = pendientes.map(async (item) => {
        try {
            console.log(`Uploading (${item.tipo}): ${item.nombreOriginal}`);

            const fd = new FormData();

            // LÓGICA CRUCIAL: Determinar si es para Logística ('foto') o Evidencias ('files')
            if (item.tipo.startsWith('logistica')) {
                fd.append('foto', item.archivo, item.nombreOriginal);
            } else if (item.tipo.startsWith('evidencias')) {
                fd.append('files', item.archivo, item.nombreOriginal);

                // IMPORTANTE: El backend de /informes/subir exige 'projectFolder' y 'subPath' y 'filePaths'
                // Si la función uploadOrQueue no guardó esto, el servidor rechazará la petición.
                // Intentamos deducirlos. Si falla aquí, ese es el problema.
                try {
                    // Necesitamos acceder al registro del proyecto en la base de datos local para saber la ruta
                    const txProj = db.transaction('proyectosDescargados', 'readonly');
                    const storeProj = txProj.objectStore('proyectosDescargados');
                    const proyectoData = await new Promise((res) => {
                        const r = storeProj.get(item.proyectoId);
                        r.onsuccess = () => res(r.result ? r.result.datos : null);
                        r.onerror = () => res(null);
                    });

                    if (proyectoData && proyectoData.info) {
                        fd.append('projectFolder', proyectoData.info.ruta_carpeta);

                        // Extraemos el subPath del tipo ('evidencias-SubCarpeta' -> 'SubCarpeta')
                        const partesTipo = item.tipo.split('-');
                        // Si el split resulta en ['evidencias', ''], el subPath es ''
                        const subPath = partesTipo.slice(1).join('-') || '';

                        fd.append('subPath', subPath);
                        fd.append('filePaths', JSON.stringify([item.nombreOriginal]));
                    } else {
                        console.error(`⚠️ No se pudo encontrar projectFolder para el ID ${item.proyectoId}. La subida podría fallar.`);
                    }
                } catch (folderError) {
                    console.error("⚠️ Error intentando reconstruir las rutas del archivo de evidencia:", folderError);
                }
            } else {
                console.warn(`Unknown upload type: ${item.tipo}. Using default files array.`);
                fd.append('files', item.archivo, item.nombreOriginal);
            }

            console.log(`Sending to: ${item.urlDestino}`);

            const res = await fetch(item.urlDestino, {
                method: 'POST',
                body: fd
            });

            if (res.ok) {
                // Borramos de la DB INMEDIATAMENTE después de subir exitosamente
                await new Promise((resolveDelete, rejectDelete) => {
                    const txDel = db.transaction('syncQueue', 'readwrite');
                    txDel.objectStore('syncQueue').delete(item.id);
                    txDel.oncomplete = resolveDelete;
                    txDel.onerror = () => {
                        console.error(`Error borrando ${item.id} de IndexedDB`, txDel.error);
                        rejectDelete(txDel.error);
                    };
                });
                sincronizados++;
                proyectosAfectados.add(item.proyectoId);
                console.log(`Success: ${item.nombreOriginal}`);
            } else {
                // Si el servidor responde con error (ej. 500, 400), lo leemos para saber por qué
                const textError = await res.text();
                console.error(`❌ El servidor rechazó ${item.nombreOriginal}. Status: ${res.status}. Respuesta:`, textError);
                // NOTA: NO borramos el ítem de la cola aquí, para que reintente en el próximo latido.
            }
        } catch (e) {
            console.error(`Critical failure uploading ${item.nombreOriginal}:`, e);
        }
    });

    // Esperamos a que todas terminen (exitosas o fallidas)
    await Promise.all(promesas);

    // Si subimos al menos 1, emitimos el grito para refrescar la pantalla
    if (sincronizados > 0) {
        console.log(`Mass sync completed. ${sincronizados} files uploaded.`);
        const eventoSync = new CustomEvent('everytel_sync_completada', {
            detail: { proyectos: Array.from(proyectosAfectados) }
        });
        window.dispatchEvent(eventoSync);
    }

    return sincronizados > 0;
}

export async function obtenerTodosProyectosDescargados() {
    const db = await initOfflineDB();
    const tx = db.transaction('proyectosDescargados', 'readonly');
    const store = tx.objectStore('proyectosDescargados');

    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
            const localData = req.result || [];
            // Extraemos solo la parte 'info' de cada proyecto guardado
            const proyectos = localData.map(item => item.datos.info);
            resolve(proyectos);
        };
        req.onerror = () => reject(req.error);
    });
}