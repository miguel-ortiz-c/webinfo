const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const UPLOADS_ROOT = path.join(__dirname, '../uploads');

// Multer configuration
const upload = multer({ dest: path.join(UPLOADS_ROOT, 'temp') });

// Get items data
router.get('/:projectId', (req, res) => {
    // Get logistics data for a project
    db.all("SELECT * FROM materiales_proyecto WHERE project_id = ? ORDER BY fecha DESC, id DESC", [req.params.projectId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [req.params.projectId], (err2, row2) => {
            const rootFolder = row2 ? row2.ruta_carpeta : null;
            let fotosSalida = [];
            let fotosEntrada = [];

            if (rootFolder) {
                const dirSalida = path.join(UPLOADS_ROOT, rootFolder, 'Logistica', 'Guias_Salida');
                const dirEntrada = path.join(UPLOADS_ROOT, rootFolder, 'Logistica', 'Guias_Entrada');

                // Helper to read dir and attach metadata
                const getFilesWithMetadata = (dirPath) => {
                    let files = [];
                    let metadata = {};

                    if (fs.existsSync(dirPath)) {
                        files = fs.readdirSync(dirPath).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));

                        const metaPath = path.join(dirPath, 'metadata.json');
                        if (fs.existsSync(metaPath)) {
                            try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); }
                            catch (e) { console.error("Error leyendo metadata:", e); }
                        }

                        // Map files to objects if metadata exists
                        files = files.map(file => {
                            if (metadata[file] && metadata[file].comment) {
                                return { nombre: file, comentario: metadata[file].comment };
                            }
                            return file; // fallback strings
                        });
                    }
                    return files;
                };

                fotosSalida = getFilesWithMetadata(dirSalida);
                fotosEntrada = getFilesWithMetadata(dirEntrada);
            }

            res.json({
                items: rows,
                fotos: {
                    salida: fotosSalida,
                    entrada: fotosEntrada,
                    rootFolder
                }
            });
        });
    });
});

// Add item
router.post('/', (req, res) => {
    const { project_id, tipo, codigo, nombre, cantidad, comentario, fecha } = req.body;
    const sql = `INSERT INTO materiales_proyecto (project_id, tipo, codigo, nombre_item, cant_salida, cant_usada, cant_retorno, estado, comentario, fecha) VALUES (?, ?, ?, ?, ?, 0, 0, 'PENDIENTE', ?, ?)`;
    db.run(sql, [project_id, tipo, codigo || '', nombre, cantidad, comentario || '', fecha || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Update item
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;
    let sets = [], params = [];

    if (body.nombre_item !== undefined) { sets.push("nombre_item = ?"); params.push(body.nombre_item); }
    if (body.codigo !== undefined) { sets.push("codigo = ?"); params.push(body.codigo); }
    if (body.cant_salida !== undefined) { sets.push("cant_salida = ?"); params.push(body.cant_salida); }

    if (body.cant_usada !== undefined) { sets.push("cant_usada = ?"); params.push(body.cant_usada); }
    if (body.cant_retorno !== undefined) { sets.push("cant_retorno = ?"); params.push(body.cant_retorno); }
    if (body.estado !== undefined) { sets.push("estado = ?"); params.push(body.estado); }
    if (body.comentario !== undefined) { sets.push("comentario = ?"); params.push(body.comentario); }
    if (body.fecha !== undefined) { sets.push("fecha = ?"); params.push(body.fecha); }

    if (sets.length === 0) return res.json({ success: true });

    params.push(id);
    db.run(`UPDATE materiales_proyecto SET ${sets.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Upload evidence
router.post('/upload-evidence/:projectId/:tipo', upload.single('foto'), (req, res) => {
    const { projectId, tipo } = req.params; // tipo: 'salida' o 'entrada'
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No se recibió archivo" });

    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Proyecto no encontrado" });

        // Definir subcarpeta basada en el tipo
        const folderName = tipo === 'salida' ? 'Guias_Salida' : 'Guias_Entrada';
        const targetDir = path.join(UPLOADS_ROOT, row.ruta_carpeta, 'Logistica', folderName);

        // Crear carpeta si no existe
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const ext = path.extname(file.originalname);
        const mdName = req.body.metadata ? JSON.parse(req.body.metadata).originalName : '';
        const safeOriginalName = mdName ? mdName.replace(/[^a-zA-Z0-9_\-\.]/g, '_') : file.originalname;
        const targetFilename = file.originalname; // Using exactly what was sent via FormData explicitly
        const targetPath = path.join(targetDir, targetFilename);

        try {
            // Mover archivo de temp a destino final
            fs.renameSync(file.path, targetPath);

            // Save metadata
            if (req.body.metadata) {
                const metaPath = path.join(targetDir, 'metadata.json');
                let metadata = {};
                if (fs.existsSync(metaPath)) {
                    try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
                }

                const payload = JSON.parse(req.body.metadata);
                metadata[targetFilename] = payload;
                fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
            }

            res.json({ success: true, file: targetFilename });
        } catch (e) {
            res.status(500).json({ error: "Error guardando archivo: " + e.message });
        }
    });
});

// Rename evidence comment
router.post('/rename-evidence/:projectId', (req, res) => {
    const { projectId } = req.params;
    const { tipo, filename, newComment } = req.body;

    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Proyecto no encontrado" });

        const folderName = tipo === 'salida' ? 'Guias_Salida' : 'Guias_Entrada';
        const targetDir = path.join(UPLOADS_ROOT, row.ruta_carpeta, 'Logistica', folderName);
        const metaPath = path.join(targetDir, 'metadata.json');

        try {
            let metadata = {};
            if (fs.existsSync(metaPath)) {
                try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
            }
            if (!metadata[filename]) metadata[filename] = {};
            metadata[filename].comment = newComment;
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Error renombrando: " + e.message });
        }
    });
});

// Delete evidence
router.post('/delete-evidence/:projectId', (req, res) => {
    const { projectId } = req.params;
    const { tipo, filename } = req.body;

    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Proyecto no encontrado" });

        const folderName = tipo === 'salida' ? 'Guias_Salida' : 'Guias_Entrada';
        const filePath = path.join(UPLOADS_ROOT, row.ruta_carpeta, 'Logistica', folderName, filename);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Error borrando archivo" });
        }
    });
});

// Delete db item
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM materiales_proyecto WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// Descargas múltiples fotos como ZIP
router.post('/descargar-multiples/:id', (req, res) => {
    const projectId = req.params.id;
    const { tipo, files } = req.body; // tipo: 'salida' o 'entrada'

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "No se enviaron archivos para descargar" });
    }

    db.get("SELECT ruta_carpeta, codigo_proyecto FROM informes WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Proyecto no encontrado" });

        const folderName = tipo === 'salida' ? 'Guias_Salida' : 'Guias_Entrada';
        const targetDir = path.join(UPLOADS_ROOT, row.ruta_carpeta, 'Logistica', folderName);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${row.codigo_proyecto}_Guias_${tipo.toUpperCase()}_Seleccion.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error("Error zipping logistica files:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Error creando ZIP" });
            }
        });

        archive.pipe(res);

        let metadata = {};
        const metaPath = path.join(targetDir, 'metadata.json');
        if (fs.existsSync(metaPath)) {
            try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
        }

        const usedNames = new Set();

        files.forEach(file => {
            const filePath = path.join(targetDir, file);
            if (fs.existsSync(filePath)) {
                let downloadName = file;
                if (metadata[file] && metadata[file].comment) {
                    const ext = path.extname(file);
                    let baseName = metadata[file].comment.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim();
                    if (!baseName) baseName = "Foto";

                    downloadName = `${baseName}${ext}`;

                    // Prevent duplicate names in the ZIP
                    let counter = 1;
                    while (usedNames.has(downloadName.toLowerCase())) {
                        downloadName = `${baseName}_${counter}${ext}`;
                        counter++;
                    }
                }

                usedNames.add(downloadName.toLowerCase());
                archive.file(filePath, { name: downloadName });
            }
        });

        archive.finalize();
    });
});

module.exports = router;