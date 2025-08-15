// setup.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/db.sqlite', (err) => {
    if (err) {
        return console.error('Gagal koneksi ke database:', err.message);
    }
    console.log('Berhasil terhubung ke database SQLite.');
});

db.serialize(() => {
    console.log("Membuat tabel-tabel...");

    // 1. Tabel Sekolah
    db.run(`CREATE TABLE IF NOT EXISTS sekolah (
        kodeBiasa TEXT PRIMARY KEY,
        kodePro TEXT,
        kecamatan TEXT,
        npsn TEXT,
        namaSekolahLengkap TEXT,
        namaSekolahSingkat TEXT
    )`);

    // 2. Tabel Siswa
    db.run(`CREATE TABLE IF NOT EXISTS siswa (
        nisn TEXT PRIMARY KEY,
        kodeBiasa TEXT,
        kodePro TEXT,
        namaSekolah TEXT,
        kecamatan TEXT,
        noUrut INTEGER,
        noInduk TEXT,
        noPeserta TEXT,
        namaPeserta TEXT,
        ttl TEXT,
        namaOrtu TEXT,
        noIjazah TEXT,
        FOREIGN KEY(kodeBiasa) REFERENCES sekolah(kodeBiasa) ON DELETE CASCADE
    )`);

    // 3. Tabel Nilai
    db.run(`CREATE TABLE IF NOT EXISTS nilai (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nisn TEXT NOT NULL,
        semester TEXT NOT NULL,
        subject TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT,
        UNIQUE(nisn, semester, subject, type)
    )`);

    // 4. Tabel Pengaturan
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        kodeBiasa TEXT PRIMARY KEY,
        settings_json TEXT,
        FOREIGN KEY(kodeBiasa) REFERENCES sekolah(kodeBiasa) ON DELETE CASCADE
    )`);

    // 5. Tabel Foto SKL
    db.run(`CREATE TABLE IF NOT EXISTS skl_photos (
        nisn TEXT PRIMARY KEY,
        photo_data TEXT,
        FOREIGN KEY(nisn) REFERENCES siswa(nisn) ON DELETE CASCADE
    )`);

    // 6. Tabel Nama Mulok
    db.run(`CREATE TABLE IF NOT EXISTS mulok_names (
        kodeBiasa TEXT NOT NULL,
        mulok_key TEXT NOT NULL,
        mulok_name TEXT,
        PRIMARY KEY (kodeBiasa, mulok_key),
        FOREIGN KEY(kodeBiasa) REFERENCES sekolah(kodeBiasa) ON DELETE CASCADE
    )`);

    console.log("Semua tabel berhasil dibuat atau sudah ada.");
});

db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Koneksi database ditutup.');
});