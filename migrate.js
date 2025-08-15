// migrate.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbJsonPath = path.join(__dirname, 'database', 'db.json');
const dbSqlitePath = path.join(__dirname, 'database', 'db.sqlite');

const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
const db = new sqlite3.Database(dbSqlitePath);

db.serialize(() => {
    console.log("Memulai migrasi data...");

    // 1. Migrasi Sekolah
    const stmtSekolah = db.prepare("INSERT OR IGNORE INTO sekolah (kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat) VALUES (?, ?, ?, ?, ?, ?)");
    dbJson.sekolah.forEach(s => stmtSekolah.run(s));
    stmtSekolah.finalize();
    console.log(`- ${dbJson.sekolah.length} data sekolah selesai.`);

    // 2. Migrasi Siswa
    const stmtSiswa = db.prepare("INSERT OR IGNORE INTO siswa (kodeBiasa, kodePro, namaSekolah, kecamatan, noUrut, noInduk, noPeserta, nisn, namaPeserta, ttl, namaOrtu, noIjazah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    dbJson.siswa.forEach(s => stmtSiswa.run(s));
    stmtSiswa.finalize();
    console.log(`- ${dbJson.siswa.length} data siswa selesai.`);

    // 3. Migrasi Nilai
    const stmtNilai = db.prepare("INSERT OR IGNORE INTO nilai (nisn, semester, subject, type, value) VALUES (?, ?, ?, ?, ?)");
    let nilaiCount = 0;
    for (const nisn in dbJson.nilai) {
        if (nisn === '_mulokNames') continue;
        for (const semester in dbJson.nilai[nisn]) {
            for (const subject in dbJson.nilai[nisn][semester]) {
                for (const type in dbJson.nilai[nisn][semester][subject]) {
                    stmtNilai.run(nisn, semester, subject, type, dbJson.nilai[nisn][semester][subject][type]);
                    nilaiCount++;
                }
            }
        }
    }
    stmtNilai.finalize();
    console.log(`- ${nilaiCount} data nilai selesai.`);

    // 4. Migrasi Nama Mulok
    if (dbJson.nilai._mulokNames) {
        const stmtMulok = db.prepare("INSERT OR IGNORE INTO mulok_names (kodeBiasa, mulok_key, mulok_name) VALUES (?, ?, ?)");
        for (const kodeBiasa in dbJson.nilai._mulokNames) {
            for (const mulokKey in dbJson.nilai._mulokNames[kodeBiasa]) {
                stmtMulok.run(kodeBiasa, mulokKey, dbJson.nilai._mulokNames[kodeBiasa][mulokKey]);
            }
        }
        stmtMulok.finalize();
        console.log(`- Data nama Mulok selesai.`);
    }

    // 5. Migrasi Settings
    if (dbJson.settings) {
        const stmtSettings = db.prepare("INSERT OR IGNORE INTO settings (kodeBiasa, settings_json) VALUES (?, ?)");
        for (const kodeBiasa in dbJson.settings) {
            stmtSettings.run(kodeBiasa, JSON.stringify(dbJson.settings[kodeBiasa]));
        }
        stmtSettings.finalize();
        console.log(`- Data settings selesai.`);
    }

    // 6. Migrasi Foto SKL
    if (dbJson.sklPhotos) {
        const stmtSklPhotos = db.prepare("INSERT OR IGNORE INTO skl_photos (nisn, photo_data) VALUES (?, ?)");
        for (const nisn in dbJson.sklPhotos) {
            stmtSklPhotos.run(nisn, dbJson.sklPhotos[nisn]);
        }
        stmtSklPhotos.finalize();
        console.log(`- Data foto SKL selesai.`);
    }

    console.log("Migrasi data berhasil!");
});

db.close();