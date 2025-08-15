// File baru: /backend/init-db.js

const db = require('./src/database/database.js');

const createSekolahTable = `
CREATE TABLE IF NOT EXISTS sekolah (
    kode_biasa TEXT PRIMARY KEY,
    kode_pro TEXT,
    kecamatan TEXT,
    npsn TEXT,
    nama_sekolah_lengkap TEXT,
    nama_sekolah_singkat TEXT
);`;

const createSiswaTable = `
CREATE TABLE IF NOT EXISTS siswa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_biasa TEXT,
    kode_pro TEXT,
    nama_sekolah TEXT,
    kecamatan TEXT,
    no_urut TEXT,
    noInduk TEXT,
    noPeserta TEXT,
    nisn TEXT UNIQUE,
    namaPeserta TEXT,
    ttl TEXT,
    namaOrtu TEXT,
    noIjazah TEXT
);`;

const createNilaiTable = `
CREATE TABLE IF NOT EXISTS nilai (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nisn TEXT,
    semester TEXT,
    subject TEXT,
    type TEXT,
    value TEXT,
    UNIQUE(nisn, semester, subject, type)
);`;

const createSettingsTable = `
CREATE TABLE IF NOT EXISTS settings (
    school_code TEXT PRIMARY KEY,
    principalName TEXT,
    principalNip TEXT,
    schoolAddress TEXT,
    printDate TEXT,
    transcriptNumber TEXT,
    skkbNumber TEXT,
    logoLeft TEXT,
    logoRight TEXT,
    logoLeftSize TEXT,
    logoRightSize TEXT,
    sklPhotoLayout TEXT,
    logoLeftPosTop TEXT,
    logoLeftPosLeft TEXT,
    logoRightPosTop TEXT,
    logoRightPosRight TEXT,
    subject_visibility_json TEXT,
    mulok1_name TEXT,
    mulok2_name TEXT,
    mulok3_name TEXT
);`;

const createSklPhotosTable = `
CREATE TABLE IF NOT EXISTS skl_photos (
    nisn TEXT PRIMARY KEY,
    photo_data TEXT
);`;


db.serialize(() => {
    db.run(createSekolahTable, (err) => {
        if (err) console.error("Error creating sekolah table:", err.message);
        else console.log("Tabel 'sekolah' berhasil dibuat atau sudah ada.");
    });

    db.run(createSiswaTable, (err) => {
        if (err) console.error("Error creating siswa table:", err.message);
        else console.log("Tabel 'siswa' berhasil dibuat atau sudah ada.");
    });

    db.run(createNilaiTable, (err) => {
        if (err) console.error("Error creating nilai table:", err.message);
        else console.log("Tabel 'nilai' berhasil dibuat atau sudah ada.");
    });

    db.run(createSettingsTable, (err) => {
        if (err) console.error("Error creating settings table:", err.message);
        else console.log("Tabel 'settings' berhasil dibuat atau sudah ada.");
    });

    db.run(createSklPhotosTable, (err) => {
        if (err) console.error("Error creating skl_photos table:", err.message);
        else console.log("Tabel 'skl_photos' berhasil dibuat atau sudah ada.");
    });
});

db.close((err) => {
    if (err) console.error("Error closing database:", err.message);
    else console.log("Koneksi database ditutup.");
});