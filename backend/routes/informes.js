const express = require('express');
const router = express.Router();
const db = require('../database');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');
const archiver = require('archiver');
const xlsx = require('xlsx');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const UPLOADS_ROOT = path.join(__dirname, '../uploads');

// Asegurar que existe al iniciar
if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_ROOT);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = (file.originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `temp_${uniqueSuffix}_${cleanName}`);
    }
});
const upload = multer({ storage: storage });

// List projects
router.get('/listar', (req, res) => {
    const busqueda = req.query.busqueda || '';
    const empresaFilter = req.query.empresa || '';

    let sql = "SELECT * FROM informes WHERE 1=1";
    let params = [];

    if (empresaFilter && empresaFilter !== 'EVERYTEL' && empresaFilter !== 'TODOS') {
        sql += " AND empresa = ?";
        params.push(empresaFilter);
    }

    if (busqueda) {
        sql += " AND (empresa LIKE ? OR distrito LIKE ? OR direccion LIKE ? OR codigo_proyecto LIKE ? OR codigo_cliente LIKE ?)";
        params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    sql += " ORDER BY fecha_creacion DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// List services
router.get('/servicios', (req, res) => {
    db.all("SELECT * FROM servicios ORDER BY nombre_servicio ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create service
router.post('/servicios', (req, res) => {
    const { codigo, nombre } = req.body;
    db.run("INSERT INTO servicios (codigo_servicio, nombre_servicio) VALUES (?, ?)", [codigo, nombre], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Delete service
router.delete('/servicios/:id', (req, res) => {
    db.run("DELETE FROM servicios WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Explore files
router.get('/explorar/:id', (req, res) => {
    const { id } = req.params;
    const subPath = req.query.path || '';
    const filter = req.query.filter || 'all';
    const isRecursive = req.query.recursive === 'true';

    db.get("SELECT * FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Proyecto no encontrado" });

        const rootFolder = row.ruta_carpeta;
        const currentAbsPath = path.join(UPLOADS_ROOT, rootFolder, subPath);

        if (!currentAbsPath.startsWith(path.join(UPLOADS_ROOT, rootFolder))) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        if (!fs.existsSync(currentAbsPath)) return res.json({ items: [], rootFolder });

        try {
            // FUNCIÓN RECURSIVA PARA LEER TODO EL ÁRBOL (SI ES NECESARIO)
            const scanDirectory = (dirPath, relativeBase) => {
                let results = [];
                const files = fs.readdirSync(dirPath);

                let metadata = {};
                const metaPath = path.join(dirPath, 'metadata.json');
                if (fs.existsSync(metaPath)) {
                    try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
                }

                for (const file of files) {
                    const fullPath = path.join(dirPath, file);
                    const relPath = path.join(relativeBase, file).replace(/\\/g, '/');

                    try {
                        const stats = fs.lstatSync(fullPath);
                        const isDir = stats.isDirectory();

                        // Ignorar archivos de sistema
                        if (file === 'GENERAL.txt' || file === 'temp_render.docx' || file.startsWith('.') || file === 'metadata.json') continue;

                        if (isDir) {
                            if (!isRecursive) {
                                results.push({ name: file, type: 'folder', path: relPath });
                            } else {
                                results = results.concat(scanDirectory(fullPath, relPath));
                            }
                        } else {
                            // Filtros de archivo
                            if (filter === 'fotos' && !file.match(/\.(jpg|jpeg|png|webp|svg|gif|bmp)$/i)) continue;
                            if (filter === 'word' && !file.endsWith('.docx')) continue;
                            if (filter === 'pdf' && !file.endsWith('.pdf')) continue;

                            let comentario = '';
                            if (metadata[file] && metadata[file].comment) {
                                comentario = metadata[file].comment;
                            }

                            results.push({ name: file, type: 'file', path: relPath, comentario });
                        }
                    } catch (e) { /* Ignorar archivo ilegible */ }
                }
                return results;
            };

            const items = scanDirectory(currentAbsPath, subPath);
            res.json({ items, rootFolder });

        } catch (e) {
            console.error("Error leyendo directorio:", e);
            res.status(500).json({ error: "Error leyendo archivos" });
        }
    });
});
// Get project data
router.get('/archivos/:id', (req, res) => {
    db.get("SELECT * FROM informes WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "No encontrado" });
        res.json({ datos: row });
    });
});

// Upload files
router.post('/subir', upload.array('files'), async (req, res) => {
    try {
        const { projectFolder, subPath, isNewProject, filePaths } = req.body;

        let relativePaths = [];
        try { relativePaths = filePaths ? JSON.parse(filePaths) : []; } catch (e) { }

        if (isNewProject === 'true') {
            const projectRoot = path.join(UPLOADS_ROOT, projectFolder);

            // Crear carpetas base
            if (!fs.existsSync(projectRoot)) fs.mkdirSync(projectRoot, { recursive: true });
            if (!fs.existsSync(path.join(projectRoot, 'Evidencias'))) fs.mkdirSync(path.join(projectRoot, 'Evidencias'));
            if (!fs.existsSync(path.join(projectRoot, 'Logistica'))) fs.mkdirSync(path.join(projectRoot, 'Logistica'));

            const {
                empresa, codigo_cliente, distrito, direccion, tecnico, asunto,
                encargado, servicio_cod, fecha_inicio, fecha_fin, descripcion,
                actividades, diagnostico, conclusiones, comentarios_fotos
            } = req.body;

            // Generar Código...
            const date = new Date();
            const yy = date.getFullYear().toString().slice(-2);
            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
            const prefijo = `${servicio_cod}-${yy}${mm}`;

            const getLastCode = () => {
                return new Promise((resolve, reject) => {
                    db.get("SELECT codigo_proyecto FROM informes WHERE codigo_proyecto LIKE ? ORDER BY id DESC LIMIT 1", [`${prefijo}-%`], (err, row) => {
                        if (err) reject(err); else resolve(row);
                    });
                });
            };

            const lastRow = await getLastCode();
            let minStart = parseInt(process.env.INICIO_CORRELATIVO || 21);
            let nextNum = minStart;

            if (lastRow && lastRow.codigo_proyecto) {
                const parts = lastRow.codigo_proyecto.split('-');
                const lastSeq = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastSeq)) nextNum = Math.max(minStart, lastSeq + 1);
            }

            const correlativo = nextNum.toString().padStart(3, '0');
            const codigo_proyecto = `${prefijo}-${correlativo}`;

            const sql = `INSERT INTO informes (
                codigo_proyecto, empresa, codigo_cliente, distrito, direccion, tecnico, asunto, encargado, 
                fecha_inicio, fecha_fin, descripcion, actividades, diagnostico, 
                conclusiones, comentarios_fotos, ruta_carpeta
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [
                codigo_proyecto, empresa, codigo_cliente, distrito, direccion, tecnico, asunto, encargado,
                fecha_inicio, fecha_fin, descripcion, actividades, diagnostico,
                conclusiones, comentarios_fotos, projectFolder
            ], function (err) {
                if (err) return res.status(500).json({ error: "Error DB: " + err.message });

                // Mover archivos iniciales a 'Evidencias' por defecto si se subieron al crear
                if (req.files && req.files.length > 0) {
                    req.files.forEach((file, i) => {
                        const dest = path.join(projectRoot, 'Evidencias', file.originalname);
                        fs.renameSync(file.path, dest);
                    });
                }
                res.json({ success: true, message: `Proyecto ${codigo_proyecto} creado.` });
            });

        } else {
            // Si subPath está vacío, forzamos que vaya a 'Evidencias' para mantener el orden
            // A menos que el usuario esté navegando explícitamente en otra carpeta.
            let targetSubPath = subPath || 'Evidencias';

            let filesProcessed = 0;
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    const originalRelPath = relativePaths[i] || file.originalname;
                    const fileName = path.basename(originalRelPath);
                    const fileDir = path.dirname(originalRelPath);

                    // Lógica de destino: Project / Evidencias / (Subcarpetas del archivo)
                    const finalDir = path.join(UPLOADS_ROOT, projectFolder, targetSubPath, fileDir === '.' ? '' : fileDir);
                    const finalPath = path.join(finalDir, fileName);

                    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
                    fs.renameSync(file.path, finalPath);

                    // Manejo de metadata
                    if (req.body.metadata) {
                        try {
                            const metaPath = path.join(finalDir, 'metadata.json');
                            let metadataObj = {};
                            if (fs.existsSync(metaPath)) {
                                try { metadataObj = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
                            }

                            // Extrae el JSON que envia el frontend
                            // Handle both string and array for cases with multiple files or formData array
                            let metaPayload = null;
                            if (Array.isArray(req.body.metadata)) {
                                metaPayload = JSON.parse(req.body.metadata[i] || '{}');
                            } else {
                                metaPayload = JSON.parse(req.body.metadata);
                            }

                            metadataObj[fileName] = metaPayload;
                            fs.writeFileSync(metaPath, JSON.stringify(metadataObj, null, 2), 'utf8');
                        } catch (err) { console.error("Error al procesar metadata.json:", err); }
                    }

                    filesProcessed++;
                }
            }
            res.json({ success: true, count: filesProcessed });
        }

    } catch (err) {
        console.error("Error en /subir:", err);
        res.status(500).json({ error: "Error servidor: " + err.message });
    }
});

// Generate draft
router.post('/generar/:tipo/:id', (req, res) => {
    const { tipo, id } = req.params;
    db.get("SELECT * FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "Proyecto no encontrado" });

        const projectPath = path.join(UPLOADS_ROOT, row.ruta_carpeta);
        const txtPath = path.join(projectPath, 'GENERAL.txt');

        // PREPARAR VARIABLES PARA PYTHON
        const distritoStr = row.distrito || '';
        const direccionStr = row.direccion || '';
        const localCombo = (distritoStr && direccionStr) ? `${distritoStr} - ${direccionStr}` : (row.local || '');

        const contenidoTxt = `[DATOS]
INFORME_NUM = ${row.codigo_proyecto}
CODIGO_CLIENTE = ${row.codigo_cliente || ''}
EMPRESA = ${row.empresa}
DISTRITO = ${distritoStr}
DIRECCION = ${direccionStr}
LOCAL = ${localCombo}
ENCARGADO = ${row.encargado || ''}
ASUNTO = ${row.asunto}
FECHA = ${row.fecha_inicio}
TECNICO = ${row.tecnico || ''}

[DESCRIPCION]
${row.descripcion || ''}

[ACTIVIDADES]
${row.actividades || ''}

[DIAGNOSTICO]
${row.diagnostico || ''}

[CONCLUSIONES]
${row.conclusiones || ''}

[COMENTARIOS_FOTOS]
${row.comentarios_fotos || ''}
`;
        // Crear archivo de texto para el script python
        try {
            if (!fs.existsSync(projectPath)) fs.mkdirSync(projectPath, { recursive: true });
            fs.writeFileSync(txtPath, contenidoTxt, 'utf8');
        }
        catch (e) { return res.status(500).json({ error: "Error creando GENERAL.txt", details: e.message }); }

        const scriptPath = path.join(__dirname, '../scripts/generador.py');
        const pythonProcess = spawn('python', [scriptPath, projectPath, tipo]);

        let dataString = '';
        pythonProcess.stdout.on('data', (data) => dataString += data.toString());
        pythonProcess.stderr.on('data', (data) => console.error(`PyErr: ${data}`));

        pythonProcess.on('close', (code) => {
            if (code !== 0) return res.status(500).json({ error: "Error al generar" });
            if (dataString.includes('SUCCESS_')) res.json({ success: true });
            else res.status(500).json({ error: "Fallo generación" });
        });
    });
});

// Convert to PDF
router.post('/convertir/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "No encontrado" });

        const projectPath = path.join(UPLOADS_ROOT, row.ruta_carpeta);
        const scriptPath = path.join(__dirname, '../scripts/generador.py');
        const pythonProcess = spawn('python', [scriptPath, projectPath, 'convert_only']);

        pythonProcess.on('close', (code) => {
            if (code !== 0) return res.status(500).json({ error: "Error convirtiendo" });
            res.json({ success: true });
        });
    });
});

// Edit project data
router.put('/editar/:id', (req, res) => {
    const { id } = req.params;
    const d = req.body;

    const sql = `UPDATE informes SET 
        empresa=?, codigo_cliente=?, distrito=?, direccion=?, encargado=?, tecnico=?, asunto=?, 
        fecha_inicio=?, fecha_fin=?, descripcion=?, actividades=?, diagnostico=?, 
        conclusiones=?, comentarios_fotos=? 
        WHERE id=?`;

    const params = [
        d.empresa, d.codigo_cliente, d.distrito, d.direccion, d.encargado, d.tecnico, d.asunto,
        d.fecha_inicio, d.fecha_fin, d.descripcion, d.actividades, d.diagnostico,
        d.conclusiones, d.comentarios_fotos, id
    ];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete project
router.delete('/eliminar/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "No encontrado" });

        const targetPath = path.join(UPLOADS_ROOT, row.ruta_carpeta);
        if (fs.existsSync(targetPath)) {
            try { fs.rmSync(targetPath, { recursive: true, force: true }); } catch (e) { }
        }

        db.run("DELETE FROM informes WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Download ZIP
router.post('/descargar', (req, res) => {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: "Sin IDs" });

    const archive = archiver('zip', { zlib: { level: 1 } });

    res.attachment('Proyectos_Everytel.zip');
    archive.pipe(res);

    let processed = 0;
    // Iteramos secuencialmente para evitar condiciones de carrera en el zip
    const processNext = (index) => {
        if (index >= ids.length) {
            archive.finalize();
            return;
        }

        const id = ids[index];
        db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [id], (err, row) => {
            if (row) {
                const p = path.join(UPLOADS_ROOT, row.ruta_carpeta);
                if (fs.existsSync(p)) archive.directory(p, row.ruta_carpeta);
            }
            processNext(index + 1);
        });
    };

    processNext(0);
});

// OTROS ENDPOINTS (Rename, Delete Item, Mkdir)
router.post('/rename/:id', (req, res) => {
    const { id } = req.params;
    const { currentPath, oldName, newName } = req.body;
    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "No encontrado" });
        const rootDir = path.join(UPLOADS_ROOT, row.ruta_carpeta);
        const folderPath = path.join(rootDir, currentPath || '');
        const oldPathFull = path.join(folderPath, oldName);
        const newPathFull = path.join(folderPath, newName);

        try {
            const metaPath = path.join(folderPath, 'metadata.json');

            if (req.body.editCommentOnly) {
                let metadata = {};
                if (fs.existsSync(metaPath)) {
                    try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
                }
                if (!metadata[oldName]) metadata[oldName] = {};
                metadata[oldName].comment = newName;
                fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
                return res.json({ success: true });
            }

            fs.renameSync(oldPathFull, newPathFull);

            // Rename metadata key if exists
            if (fs.existsSync(metaPath)) {
                let metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                if (metadata[oldName]) {
                    metadata[newName] = metadata[oldName];
                    delete metadata[oldName];
                    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
                }
            }

            res.json({ success: true });
        }
        catch (e) { res.status(500).json({ error: e.message }); }
    });
});

router.post('/delete-item/:id', (req, res) => {
    const { id } = req.params;
    const { currentPath, itemName } = req.body;
    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "No encontrado" });
        const folderDir = path.join(UPLOADS_ROOT, row.ruta_carpeta, currentPath || '');
        const targetPath = path.join(folderDir, itemName);

        try {
            const stats = fs.statSync(targetPath);
            if (stats.isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
            else {
                fs.unlinkSync(targetPath);

                // Remove from metadata if it's a file
                const metaPath = path.join(folderDir, 'metadata.json');
                if (fs.existsSync(metaPath)) {
                    let metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    if (metadata[itemName]) {
                        delete metadata[itemName];
                        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
                    }
                }
            }
            res.json({ success: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

router.post('/mkdir/:id', (req, res) => {
    const { id } = req.params;
    const { currentPath, newFolderName } = req.body;
    db.get("SELECT ruta_carpeta FROM informes WHERE id = ?", [id], (err, row) => {
        if (!row) return res.status(404).json({ error: "No encontrado" });
        const targetDir = path.join(UPLOADS_ROOT, row.ruta_carpeta, currentPath || '', newFolderName);
        try { fs.mkdirSync(targetDir, { recursive: true }); res.json({ success: true }); }
        catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// Helper: append folder files (recursively) using metadata comments as zip names
function appendFolderWithComments(archive, localPath, targetZipFolder) {
    if (!fs.existsSync(localPath)) return;

    // Read metadata for the current directory
    let metadata = {};
    const metaPath = path.join(localPath, 'metadata.json');
    if (fs.existsSync(metaPath)) {
        try { metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { }
    }

    const entries = fs.readdirSync(localPath);
    const usedNames = new Set();

    entries.forEach(entry => {
        if (entry === 'metadata.json' || entry.startsWith('.')) return;

        const fullPath = path.join(localPath, entry);
        let stats;
        try { stats = fs.lstatSync(fullPath); } catch (e) { return; }

        if (stats.isDirectory()) {
            // Recurse into subdirectory, preserving folder name in zip path
            appendFolderWithComments(archive, fullPath, `${targetZipFolder}/${entry}`);
        } else if (stats.isFile()) {
            let downloadName = entry;

            if (metadata[entry] && metadata[entry].comment) {
                const ext = path.extname(entry);
                let baseName = metadata[entry].comment.replace(/[^a-zA-Z0-9 _\-\.áéíóúñÁÉÍÓÚÑ]/g, '').trim();
                if (!baseName) baseName = 'Evidencia';

                downloadName = `${baseName}${ext}`;

                let counter = 1;
                while (usedNames.has(downloadName.toLowerCase())) {
                    downloadName = `${baseName}_${counter}${ext}`;
                    counter++;
                }
            }

            usedNames.add(downloadName.toLowerCase());
            archive.file(fullPath, { name: `${targetZipFolder}/${downloadName}` });
        }
    });
}

router.get('/descargar-proyecto/:id', (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM informes WHERE id = ?", [id], (err, info) => {
        if (err || !info) return res.status(404).json({ error: "Proyecto no encontrado" });

        // Buscamos los materiales de este proyecto
        db.all("SELECT * FROM materiales_proyecto WHERE project_id = ?", [id], (err, items) => {
            if (err) items = [];

            // 1. CREATE EXCEL FILE
            const wb = xlsx.utils.book_new();

            // Hoja 1: Herramientas
            const herramientas = items.filter(i => i.tipo === 'herramienta').map(h => ({
                'Código': h.codigo || '-',
                'Ítem': h.nombre_item,
                'Cant. Salida': h.cant_salida,
                'Cant. Retorno': h.cant_retorno,
                'Estado': h.estado,
                'Observaciones': h.comentario || ''
            }));
            const wsHerr = xlsx.utils.json_to_sheet(herramientas.length ? herramientas : [{ Mensaje: "Sin herramientas registradas" }]);
            xlsx.utils.book_append_sheet(wb, wsHerr, "Herramientas");

            // Hoja 2: Materiales
            const materiales = items.filter(i => i.tipo === 'material').map(m => ({
                'Código': m.codigo || '-',
                'Ítem': m.nombre_item,
                'Entregado': m.cant_salida,
                'Usado': m.cant_usada,
                'Devuelto': m.cant_salida - m.cant_usada,
                'Observaciones': m.comentario || ''
            }));
            const wsMat = xlsx.utils.json_to_sheet(materiales.length ? materiales : [{ Mensaje: "Sin materiales registrados" }]);
            xlsx.utils.book_append_sheet(wb, wsMat, "Materiales");

            // Convertir el Excel a Buffer (Memoria)
            const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // --- 2. PREPARAR EL ZIP ---
            const archive = archiver('zip', { zlib: { level: 9 } });

            // Forzar la descarga en el navegador con el nombre del proyecto
            const zipName = info.codigo_cliente
                ? `${info.codigo_proyecto}_${info.codigo_cliente}.zip`
                : `${info.codigo_proyecto}.zip`;
            res.attachment(zipName);
            archive.pipe(res);

            // A) Agregar el Archivo Excel
            archive.append(excelBuffer, { name: `Inventario_Logistica_${info.codigo_proyecto}.xlsx` });

            const projectRoot = path.join(UPLOADS_ROOT, info.ruta_carpeta);

            // B) Carpeta Evidencias (con renombrado por metadata)
            appendFolderWithComments(archive, path.join(projectRoot, 'Evidencias'), 'Evidencias');

            // C) Carpeta Guía de Salida (con renombrado por metadata)
            appendFolderWithComments(archive, path.join(projectRoot, 'Logistica', 'Guias_Salida'), 'Guia_de_salida');

            // D) Carpeta Guía de Entrada / Retorno (con renombrado por metadata)
            appendFolderWithComments(archive, path.join(projectRoot, 'Logistica', 'Guias_Entrada'), 'Guia_de_entrada_retorno');

            // E) Archivos Word y PDF (Los busca sueltos en la raíz de la carpeta)
            if (fs.existsSync(projectRoot)) {
                const files = fs.readdirSync(projectRoot);
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    // Ignoramos el temp_render.docx
                    if ((ext === '.docx' || ext === '.pdf') && file !== 'temp_render.docx') {
                        archive.file(path.join(projectRoot, file), { name: file });
                    }
                }
            }

            // Finalizar el empaquetado y enviar al usuario
            archive.finalize();
        });
    });
});


// Desargar multiples archivos como ZIP
router.post('/descargar-multiples/:id', (req, res) => {
    const projectId = req.params.id;
    const { currentPath, files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "No se enviaron archivos para descargar" });
    }

    db.get("SELECT ruta_carpeta, codigo_proyecto FROM informes WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: "Proyecto no encontrado" });

        const rootDir = path.join(UPLOADS_ROOT, row.ruta_carpeta);
        const targetDir = currentPath === 'Evidencias' ? path.join(rootDir, 'Evidencias') : path.join(rootDir, currentPath);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${row.codigo_proyecto}_Seleccion_${Date.now()}.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error("Error zipping multiple files:", err);
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
                    if (!baseName) baseName = "Evidencia";

                    downloadName = `${baseName}${ext}`;

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