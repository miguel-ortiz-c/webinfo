const express = require('express');
const router = express.Router();
const db = require('../database');

// List all companies
router.get('/', (req, res) => {
    db.all("SELECT * FROM clientes ORDER BY nombre_empresa ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create company
router.post('/', (req, res) => {
    const { nombre, ruc } = req.body;
    if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

    const nombreFinal = nombre.toUpperCase().trim();

    db.run("INSERT INTO clientes (nombre_empresa, ruc) VALUES (?, ?)", [nombreFinal, ruc], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "La empresa ya existe" });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// Delete company
router.delete('/:id', (req, res) => {
    db.run("DELETE FROM clientes WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;