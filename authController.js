// src/controllers/authController.js (Versi Baru dengan JWT)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken'); // <-- Tambahkan ini

const dbPath = path.join(__dirname, '..', 'database', 'db.sqlite');

// KUNCI RAHASIA: Ganti ini dengan teks acak yang panjang dan sulit ditebak
const JWT_SECRET = process.env.JWT_SECRET; 

const getDbConnection = () => {
    return new sqlite3.Database(dbPath);
};

exports.login = (req, res) => {
    const { appCode, kurikulum } = req.body;
    if (!appCode || !kurikulum) {
        return res.status(400).json({ success: false, message: 'Kode Aplikasi dan Kurikulum harus diisi.' });
    }

    const db = getDbConnection();

    if (appCode.toLowerCase() === 'admin') {
        // Logika login untuk Admin
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        db.close();
        return res.json({
            success: true,
            message: 'Login Admin berhasil!',
            role: 'admin',
            token: token // Kirim token
        });
    }

    // Logika login untuk Sekolah
    const sql = `SELECT * FROM sekolah WHERE kodeBiasa = ? OR kodePro = ?`;
    db.get(sql, [appCode, appCode], (err, sekolah) => {
        db.close();
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
        }
        if (!sekolah) {
            return res.status(401).json({ success: false, message: 'Kode Aplikasi tidak ditemukan.' });
        }

        // Tentukan tipe login (biasa atau pro)
        const loginType = sekolah.kodeBiasa === appCode ? 'biasa' : 'pro';

        // Buat token JWT yang berisi info penting dan aman
        const tokenPayload = {
            kodeBiasa: sekolah.kodeBiasa,
            kodePro: sekolah.kodePro,
            role: 'sekolah',
            loginType: loginType
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' }); // Token berlaku 1 hari

        // Kirim token dan data yang dibutuhkan frontend saat login
        res.json({
            success: true,
            message: 'Login berhasil!',
            role: 'sekolah',
            token: token, // Kirim token, bukan seluruh data
            schoolData: Object.values(sekolah), // Kirim data sekolah untuk tampilan awal
            kurikulum: kurikulum,
            loginType: loginType
        });
    });
};