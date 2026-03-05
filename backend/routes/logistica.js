const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_ROOT = path.join(__dirname, '../uploads');

// Multer configuration
const upload = multer({ dest: path.join(UPLOADS_ROOT, 'temp') });

// Get items data
router.get('/:projectId', (req, res) => {
    const projectId = req.params.projectId;

    db.all("SELECT * FROM materiales_proyecto WHERE project_id = ?", [projectId], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [projectId], (err, info) => {
            if (err || !info) return res.status(500).json({ error: "Proyecto no encontrado" });

            const projectPath = path.join(UPLOADS_ROOT, info.ruta_carpeta, 'Logistica');
            const pathSalida = path.join(projectPath, 'Guias_Salida');
            const pathEntrada = path.join(projectPath, 'Guias_Entrada'); // O Retorno

            // Helper to read images
            const getPhotos = (dirPath) => {
                if (!fs.existsSync(dirPath)) return [];
                return fs.readdirSync(dirPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            };

            res.json({
                items: items || [],
                fotos: {
                    salida: getPhotos(pathSalida),
                    entrada: getPhotos(pathEntrada),
                    rootFolder: info.ruta_carpeta
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
        const targetFilename = `GUIA_${tipo.toUpperCase()}_${Date.now()}${ext}`;
        const targetPath = path.join(targetDir, targetFilename);

        try {
            // Mover archivo de temp a destino final
            fs.renameSync(file.path, targetPath);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Error guardando archivo: " + e.message });
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

module.exports = router;