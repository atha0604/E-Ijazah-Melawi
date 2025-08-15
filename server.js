// server.js

// 1. Impor package yang dibutuhkan

require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('ENV JWT_SECRET belum di-set. Tambahkan JWT_SECRET ke file .env');
  process.exit(1);
}


const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');


// 2. Inisialisasi aplikasi Express
const app = express();
const PORT = 3000;

// 3. Gunakan middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. Definisikan route/endpoint dasar untuk tes
app.get('/api', (req, res) => {
  res.json({ message: 'Selamat datang di API E-Ijazah!' });
});

// 5. Impor dan gunakan SEMUA routes
// ==========================================================
// == BAGIAN YANG PERLU DIPERBAIKI ADA DI SINI ==

// Daftarkan rute untuk otentikasi/login
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);

// (TAMBAHKAN INI) Daftarkan rute untuk impor data
const dataRoutes = require('./src/routes/dataRoutes');
app.use('/api/data', dataRoutes);

// ==========================================================

// 6. Jalankan server
app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});