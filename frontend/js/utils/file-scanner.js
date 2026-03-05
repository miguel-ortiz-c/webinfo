// frontend/js/utils/file-scanner.js

export function scanFiles(entry) {
    return new Promise((resolve) => {
        if (entry.isFile) {
            entry.file(file => {
                const path = entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath;
                file.fullPath = path;
                resolve([file]);
            }, (err) => {
                console.error("Error leyendo archivo:", err);
                resolve([]);
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const readEntries = () => {
                dirReader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        resolve([]);
                    } else {
                        const promises = entries.map(subEntry => scanFiles(subEntry));
                        const results = await Promise.all(promises);
                        resolve(results.flat());
                    }
                }, (err) => {
                    console.error("Error leyendo carpeta:", err);
                    resolve([]);
                });
            };
            readEntries();
        } else {
            resolve([]);
        }
    });
}