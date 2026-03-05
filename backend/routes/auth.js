const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');

// LOGIN
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    // Find user
    const sql = "SELECT * FROM usuarios WHERE username = ?";
    db.get(sql, [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error de servidor" });
        }

        // User not found
        if (!user) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        // Check password hash
        const passwordMatch = bcrypt.compareSync(password, user.password);

        if (passwordMatch) {
            return res.json({
                success: true,
                user: user.username,
                role: user.role,
                empresa: user.empresa_asignada,
                message: "Login correcto"
            });
        }
        // Fallback for plaintext passwords
        else if (user.password === password) {
            return res.json({
                success: true,
                user: user.username,
                role: user.role,
                empresa: user.empresa_asignada,
                message: "Login correcto (Legacy)"
            });
        }
        else {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }
    });
});

// Logout
router.post('/logout', (req, res) => {
    res.json({ success: true, message: "Sesión cerrada" });
});

module.exports = router;