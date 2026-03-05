const express = require('express');
const router = express.Router();
const db = require('../database');

// LISTAR
router.get('/', (req, res) => {
    db.all("SELECT id, username, role, empresa_asignada FROM usuarios ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// CREAR
router.post('/', (req, res) => {
    const { username, password, role, empresa } = req.body;
    let empresaFinal = empresa;
    // Si es admin o no se especificó empresa, es TODOS
    if (role === 'admin' || !empresaFinal) empresaFinal = 'TODOS';

    db.run("INSERT INTO usuarios (username, password, role, empresa_asignada) VALUES (?, ?, ?, ?)",
        [username, password, role, empresaFinal],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "El usuario ya existe" });
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { password, role, empresa } = req.body;

    if (role) {
        let empresaFinal = empresa;
        if (role === 'admin') empresaFinal = 'TODOS';

        const sql = "UPDATE usuarios SET role = ?, empresa_asignada = ? WHERE id = ?";
        db.run(sql, [role, empresaFinal, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
        return;
    }

    if (password) {
        db.run("UPDATE usuarios SET password = ? WHERE id = ?", [password, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
        return;
    }


    res.status(400).json({ error: "No se enviaron datos para actualizar" });
});

// BORRAR
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    if (id == 1) return res.status(400).json({ error: "No puedes borrar al Admin principal" });
    db.run("DELETE FROM usuarios WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;