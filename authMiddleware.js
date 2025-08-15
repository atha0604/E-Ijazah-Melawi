// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;  // Pastikan ini SAMA PERSIS dengan yang di authController.js

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Ambil token dari "Bearer <token>"

    if (token == null) {
        return res.sendStatus(401); // Unauthorized (tidak ada token)
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (token tidak valid/kedaluwarsa)
        }
        req.user = user; // Simpan payload token ke request untuk digunakan nanti jika perlu
        next(); // Lanjutkan ke fungsi controller jika token valid
    });
};

module.exports = verifyToken;