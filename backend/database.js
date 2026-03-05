const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Ensure data directory exists
const dbFolder = path.resolve(__dirname, 'data');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}

// Database connection
const dbPath = path.resolve(dbFolder, 'everytel.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la DB:', err.message);
    } else {
        console.log(`Database connected`);
        initTables();
    }
});

function initTables() {
    db.serialize(() => {
        // Tables
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, empresa_asignada TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre_empresa TEXT, ruc TEXT, direccion TEXT, contacto TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS servicios (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo_servicio TEXT, nombre_servicio TEXT)`);

        // Table: informes
        db.run(`CREATE TABLE IF NOT EXISTS informes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_new_project BOOLEAN,
            servicio_cod TEXT,
            codigo_proyecto TEXT,
            project_folder TEXT,
            codigo_cliente TEXT,
            empresa TEXT,
            distrito TEXT,
            direccion TEXT,
            tecnico TEXT,
            asunto TEXT,
            encargado TEXT,
            descripcion TEXT,
            actividades TEXT,
            diagnostico TEXT,
            conclusiones TEXT,
            comentarios_fotos TEXT,
            fecha_inicio DATE,
            fecha_fin DATE,
            ruta_carpeta TEXT,
            logistica_foto_salida TEXT, 
            logistica_foto_retorno TEXT,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        try {
            addCol('informes', 'codigo_proyecto', 'TEXT');
            addCol('informes', 'logistica_foto_salida', 'TEXT');
            addCol('informes', 'logistica_foto_retorno', 'TEXT');
        } catch (e) { }

        // Table: materiales_proyecto
        db.run(`CREATE TABLE IF NOT EXISTS materiales_proyecto (
            id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, tipo TEXT, codigo TEXT, nombre_item TEXT, cant_salida REAL, cant_usada REAL, cant_retorno REAL, estado TEXT, comentario TEXT, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES informes(id) ON DELETE CASCADE
        )`);

        try {
            addCol('materiales_proyecto', 'codigo', 'TEXT');
            addCol('materiales_proyecto', 'comentario', 'TEXT');
            addCol('materiales_proyecto', 'fecha', 'TEXT');
        } catch (e) { }

        // Create admin user
        createAdminUser();
    });
}

// Helper function to add columns to existing tables
function addCol(table, col, type) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
    });
}

function createAdminUser() {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || process.env.ADMIN_KEY || 'admin123';

    db.get("SELECT * FROM usuarios WHERE username = ?", [adminUser], (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync(adminPass, 10);
            db.run("INSERT INTO usuarios (username, password, role, empresa_asignada) VALUES (?, ?, ?, ?)",
                [adminUser, hash, 'admin', 'TODOS'], (err) => {
                    if (!err) console.log(`Admin user created: ${adminUser}`);
                });
        }
    });
}

module.exports = db;