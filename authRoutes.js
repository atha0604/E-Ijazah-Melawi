// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Saat ada permintaan POST ke /api/auth/login, jalankan fungsi authController.login
router.post('/login', authController.login);

module.exports = router;