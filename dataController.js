// src/controllers/dataController.js (VERSI FINAL LENGKAP)
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = require('../database/database.js');
const dbPath = path.join(__dirname, '..', 'database', 'db.sqlite');

const getDbConnection = () => {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Gagal koneksi ke database:', err.message);
  });
  db.run('PRAGMA foreign_keys = ON');
  return db;
};


// Helper untuk menjalankan query SELECT (mengembalikan banyak baris)
const queryAll = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

// Helper untuk menjalankan query INSERT, UPDATE, DELETE
const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this); // 'this' berisi info seperti lastID, changes
    });
});


// == FUNGSI UNTUK MENGAMBIL SEMUA DATA ==
exports.getAllData = async (req, res) => {
    const db = getDbConnection();
    try {
        const [sekolahRows, siswaRows, nilaiRows, settingsRows, sklPhotosRows, mulokNamesRows] = await Promise.all([
            queryAll(db, 'SELECT * FROM sekolah'),
            queryAll(db, 'SELECT * FROM siswa'),
            queryAll(db, 'SELECT * FROM nilai'),
            queryAll(db, 'SELECT * FROM settings'),
            queryAll(db, 'SELECT * FROM skl_photos'),
            queryAll(db, 'SELECT * FROM mulok_names')
        ]);

        const finalDb = {
            sekolah: sekolahRows.map(row => [ row.kodeBiasa, row.kodePro, row.kecamatan, row.npsn, row.namaSekolahLengkap, row.namaSekolahSingkat ]),
            siswa: siswaRows.map(row => [ row.kodeBiasa, row.kodePro, row.namaSekolah, row.kecamatan, row.noUrut, row.noInduk, row.noPeserta, row.nisn, row.namaPeserta, row.ttl, row.namaOrtu, row.noIjazah ]),
            nilai: { _mulokNames: {} }, settings: {}, sklPhotos: {}
        };
        nilaiRows.forEach(row => {
            if (!finalDb.nilai[row.nisn]) finalDb.nilai[row.nisn] = {};
            if (!finalDb.nilai[row.nisn][row.semester]) finalDb.nilai[row.nisn][row.semester] = {};
            if (!finalDb.nilai[row.nisn][row.semester][row.subject]) finalDb.nilai[row.nisn][row.semester][row.subject] = {};
            finalDb.nilai[row.nisn][row.semester][row.subject][row.type] = row.value;
        });
        mulokNamesRows.forEach(row => {
            if (!finalDb.nilai._mulokNames[row.kodeBiasa]) finalDb.nilai._mulokNames[row.kodeBiasa] = {};
            finalDb.nilai._mulokNames[row.kodeBiasa][row.mulok_key] = row.mulok_name;
        });
        settingsRows.forEach(row => {
            finalDb.settings[row.kodeBiasa] = JSON.parse(row.settings_json || '{}');
        });
        sklPhotosRows.forEach(row => {
            finalDb.sklPhotos[row.nisn] = row.photo_data;
        });

        res.json({ success: true, data: finalDb });
    } catch (error) {
        console.error('Get All Data from SQLite error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data dari server.' });
    } finally {
        db.close();
    }
};

// == FUNGSI UNTUK SIMPAN DATA SEKOLAH ==

exports.saveSekolah = async (req, res) => {
    const { mode, sekolahData, originalKodeBiasa } = req.body;
    if (!mode || !sekolahData) return res.status(400).json({ success: false, message: 'Data yang dikirim tidak lengkap.' });

    const db = getDbConnection(); // <-- Kunci utamanya: Kode ini membuka koneksi DB
    try {
        let sql, params;
        if (mode === 'add') {
            sql = `INSERT INTO sekolah (kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat) VALUES (?, ?, ?, ?, ?, ?)`;
            params = sekolahData;
        } else { // mode 'edit'
            sql = `UPDATE sekolah SET kodeBiasa = ?, kodePro = ?, kecamatan = ?, npsn = ?, namaSekolahLengkap = ?, namaSekolahSingkat = ? WHERE kodeBiasa = ?`;
            params = [...sekolahData, originalKodeBiasa];
        }
        await run(db, sql, params);
        res.json({ success: true, message: `Data sekolah berhasil di${mode === 'add' ? 'tambahkan' : 'perbarui'}.` });
    } catch (error) {
        console.error('Save Sekolah error:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan data sekolah: ' + error.message });
    } finally {
        db.close(); // <-- Dan ini menutupnya, sangat baik.
    }
};


exports.saveGrade = async (req, res) => {
    const { nisn, semester, subject, type, value } = req.body;
    if (nisn === undefined || semester === undefined || subject === undefined || type === undefined) {
        return res.status(400).json({ success: false, message: 'Data nilai tidak lengkap.' });
    }
    const db = getDbConnection();
    try {
        const sql = `INSERT OR REPLACE INTO nilai (nisn, semester, subject, type, value) VALUES (?, ?, ?, ?, ?)`;
        await run(db, sql, [nisn, semester, subject, type, value || '']);
        res.json({ success: true, message: 'Nilai tersimpan.' });
    } catch (error) {
        console.error('Save Grade error:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai.' });
    } finally {
        db.close();
    }
};

// == FUNGSI UNTUK SIMPAN BANYAK NILAI (DARI EXCEL) ==
exports.saveBulkGrades = async (req, res) => {
    const gradesToSave = req.body;
    if (!gradesToSave || !Array.isArray(gradesToSave)) {
        return res.status(400).json({ success: false, message: 'Data yang dikirim tidak valid.' });
    }
    const db = getDbConnection();
    try {
        await run(db, "BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT OR REPLACE INTO nilai (nisn, semester, subject, type, value) VALUES (?, ?, ?, ?, ?)");
        gradesToSave.forEach(grade => {
            stmt.run(grade.nisn, grade.semester, grade.subject, grade.type, grade.value || '');
        });
        stmt.finalize();
        await run(db, "COMMIT");
        res.json({ success: true, message: `Berhasil menyimpan ${gradesToSave.length} data nilai.` });
    } catch (error) {
        await run(db, "ROLLBACK");
        console.error('Save Bulk Grades error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan nilai bulk ke server.' });
    } finally {
        db.close();
    }
};

// == FUNGSI UNTUK UPDATE DATA SISWA ==
exports.updateSiswa = async (req, res) => {
    const { nisn, updatedData } = req.body;
    if (!nisn || !updatedData) return res.status(400).json({ success: false, message: 'Data update tidak lengkap.' });

    const db = getDbConnection();
    try {
        // Mapping nama field dari frontend ke nama kolom di database
        const fieldMap = {
            nis: 'noInduk', noPeserta: 'noPeserta', nisn: 'nisn',
            namaPeserta: 'namaPeserta', ttl: 'ttl', namaOrtu: 'namaOrtu',
            noIjazah: 'noIjazah'
        };

        const fieldsToUpdate = Object.keys(updatedData)
            .filter(key => fieldMap[key]) // Filter hanya field yang valid
            .map(key => `${fieldMap[key]} = ?`);

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada field valid untuk diupdate.' });
        }

        const values = Object.keys(updatedData)
            .filter(key => fieldMap[key])
            .map(key => updatedData[key]);

        const sql = `UPDATE siswa SET ${fieldsToUpdate.join(', ')} WHERE nisn = ?`;
        await run(db, sql, [...values, nisn]);
        res.json({ success: true, message: 'Data siswa berhasil diperbarui.' });
    } catch (error) {
        console.error('Update Siswa error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data siswa di server.' });
    } finally {
        db.close();
    }
};

// == FUNGSI UNTUK SIMPAN PENGATURAN ==
exports.saveSettings = async (req, res) => {
    const { schoolCode, settingsData, mulokNamesData } = req.body;
    if (!schoolCode) return res.status(400).json({ success: false, message: 'Kode sekolah tidak ada.' });

    const db = getDbConnection();
    try {
        await run(db, "BEGIN TRANSACTION");

        if (settingsData) {
            const existing = await queryAll(db, "SELECT settings_json FROM settings WHERE kodeBiasa = ?", [schoolCode]);
            const existingSettings = existing.length > 0 ? JSON.parse(existing[0].settings_json) : {};
            const newSettings = { ...existingSettings, ...settingsData };
            await run(db, "INSERT OR REPLACE INTO settings (kodeBiasa, settings_json) VALUES (?, ?)", [schoolCode, JSON.stringify(newSettings)]);
        }

        if (mulokNamesData) {
            for (const mulokKey in mulokNamesData) {
                await run(db, "INSERT OR REPLACE INTO mulok_names (kodeBiasa, mulok_key, mulok_name) VALUES (?, ?, ?)", [schoolCode, mulokKey, mulokNamesData[mulokKey]]);
            }
        }

        await run(db, "COMMIT");
        res.json({ success: true, message: 'Pengaturan berhasil disimpan.' });
    } catch (error) {
        await run(db, "ROLLBACK");
        console.error('Save Settings error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan.' });
    } finally {
        db.close();
    }
};

// == FUNGSI LAINNYA ==
exports.saveSklPhoto = async (req, res) => {
    const { nisn, photoData } = req.body;
    const db = getDbConnection();
    try {
        await run(db, "INSERT OR REPLACE INTO skl_photos (nisn, photo_data) VALUES (?, ?)", [nisn, photoData]);
        res.json({ success: true, message: 'Foto berhasil disimpan.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    finally { db.close(); }
};

exports.deleteSklPhoto = async (req, res) => {
    const { nisn } = req.body;
    const db = getDbConnection();
    try {
        await run(db, "DELETE FROM skl_photos WHERE nisn = ?", [nisn]);
        res.json({ success: true, message: 'Foto berhasil dihapus.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    finally { db.close(); }
};

exports.deleteGradesBySemester = async (req, res) => {
    const { schoolCode, semesterId } = req.body;
    const db = getDbConnection();
    try {
        const siswa = await queryAll(db, "SELECT nisn FROM siswa WHERE kodeBiasa = ?", [schoolCode]);
        if (siswa.length > 0) {
            const nisns = siswa.map(s => s.nisn);
            const placeholders = nisns.map(() => '?').join(',');
            await run(db, `DELETE FROM nilai WHERE semester = ? AND nisn IN (${placeholders})`, [semesterId, ...nisns]);
        }
        res.json({ success: true, message: 'Berhasil menghapus nilai semester.' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
    finally { db.close(); }
};

// === FINAL: Ganti SELURUH exports.importData Anda dengan ini ===
exports.importData = async (req, res) => {
  const { tableId } = req.params;
  const rows = req.body;

  // pastikan payload benar
  if (!Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: 'Payload harus berupa array-of-arrays.' });
  }

  const db = getDbConnection();

  // helper lokal berbasis Promise agar error tertangkap (tidak crash)
  const runP = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

  const allP = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

  // sanitasi cell ala Excel → trim string, ubah '' jadi null, normalisasi angka
  const norm = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
      const t = v.trim();
      return t === '' || t.toUpperCase() === 'NULL' ? null : t;
    }
    return v;
  };

  try {
    await runP('PRAGMA foreign_keys = ON');
    await runP('BEGIN TRANSACTION');

    if (tableId === 'sekolah') {
      // Struktur: [kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat]
      let inserted = 0, failed = [];
      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx] || [];
        const vals = [
          norm(r[0]), norm(r[1]), norm(r[2]), norm(r[3]), norm(r[4]), norm(r[5])
        ];
        try {
          await runP(
            `INSERT OR REPLACE INTO sekolah
             (kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat)
             VALUES (?, ?, ?, ?, ?, ?)`,
            vals
          );
          inserted++;
        } catch (e) {
          failed.push({ rowIndex: idx + 1, reason: e.message, row: r });
        }
      }

      await runP('COMMIT');
      return res.json({
        success: true,
        message: `Import sekolah selesai.`,
        inserted,
        failedCount: failed.length,
        failed
      });
    }

    if (tableId === 'siswa') {
      // Ambil daftar kodeBiasa yang valid dari tabel sekolah (untuk validasi FK)
      const sekolahCodes = new Set(
        (await allP('SELECT kodeBiasa FROM sekolah')).map((x) => String(x.kodeBiasa))
      );

      let inserted = 0, skipped = [], failed = [];

      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx] || [];

        // Normalisasi 12 kolom pertama sesuai schema siswa
        // [kodeBiasa, kodePro, namaSekolah, kecamatan, noUrut, noInduk, noPeserta, nisn, namaPeserta, ttl, namaOrtu, noIjazah]
        const raw = [
          r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11]
        ];
        const vals = raw.map(norm);

        // Validasi minimal
        const kodeBiasa = vals[0] ? String(vals[0]) : null;
        const nisn = vals[7] ? String(vals[7]) : null;

        if (!kodeBiasa || !nisn) {
          skipped.push({ rowIndex: idx + 1, reason: 'kodeBiasa/nisn kosong', row: r });
          continue;
        }

        if (!sekolahCodes.has(kodeBiasa)) {
          // Jika ingin auto-create sekolah minimal, Anda bisa lakukan di sini.
          // Saat ini: skip agar FK tidak gagal.
          skipped.push({ rowIndex: idx + 1, reason: `kodeBiasa '${kodeBiasa}' tidak ada di tabel sekolah`, row: r });
          continue;
        }

        // Pastikan noUrut (indeks 4) angka bulat jika ada
        if (vals[4] !== null && !Number.isNaN(Number(vals[4]))) {
          vals[4] = parseInt(vals[4], 10);
        }

        try {
          await runP(
            `INSERT OR REPLACE INTO siswa
             (kodeBiasa, kodePro, namaSekolah, kecamatan, noUrut, noInduk, noPeserta, nisn, namaPeserta, ttl, namaOrtu, noIjazah)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            vals
          );
          inserted++;
        } catch (e) {
          // Tangkap error per baris supaya server tidak crash
          failed.push({ rowIndex: idx + 1, reason: e.message, row: r });
        }
      }

      await runP('COMMIT');
      return res.json({
        success: true,
        message: 'Import siswa selesai.',
        inserted,
        skippedCount: skipped.length,
        failedCount: failed.length,
        skipped,
        failed
      });
    }

    // Tabel lain belum didukung
    await runP('ROLLBACK');
    return res.status(400).json({ success: false, message: `Import untuk '${tableId}' belum didukung.` });

  } catch (e) {
    try { await runP('ROLLBACK'); } catch {}
    return res.status(500).json({ success: false, message: e.message });
  } finally {
    db.close();
  }
};



// HAPUS SEMUA DATA (TRUNCATE-ISH) DENGAN TRANSAKSI
// === FINAL: REPLACE SEMUA exports.deleteAllData (hapus versi 501 yang duplikat) ===
// === FINAL (REPLACE): Hapus sesuai tableId, tanpa menyentuh tabel lain.
// - tableId = 'sekolah': hapus SEMUA sekolah SAJA.
//     Jika masih ada siswa terkait, KEMBALIKAN 409 (tolak) agar admin hapus siswa dulu.
// - tableId = 'siswa'  : hapus SEMUA siswa SAJA.
//     Jika masih ada nilai/foto terkait, KEMBALIKAN 409 (tolak) agar admin bersihkan nilai/foto dulu.
// Endpoint tetap: POST /api/data/delete-all (body { tableId })
exports.deleteAllData = async (req, res) => {
  const tableId = (req.body && req.body.tableId) || '';
  const db = getDbConnection();

  const runP = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

  const getOne = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

  try {
    await runP('PRAGMA foreign_keys = ON');
    await runP('BEGIN TRANSACTION');

    if (tableId === 'sekolah') {
      // Cek ketergantungan: masih ada siswa?
      const row = await getOne('SELECT COUNT(1) AS c FROM siswa');
      if (row?.c > 0) {
        await runP('ROLLBACK');
        // kirim plain text agar fetchWithAuth menampilkan pesan rapi
        return res.status(409).send('Tidak dapat menghapus semua SEKOLAH karena masih ada data SISWA. Hapus semua siswa terlebih dahulu.');
      }

      await runP('DELETE FROM sekolah');
      await runP('COMMIT');
      // optional: reset auto-increment dan vacuum
      try { await runP(`DELETE FROM sqlite_sequence WHERE name IN ('sekolah')`); } catch {}
      try { await runP('VACUUM'); } catch {}
      return res.json({ success: true, message: 'Semua data SEKOLAH telah dihapus.' });
    }

    if (tableId === 'siswa') {
      // Cek ketergantungan: masih ada nilai atau foto terkait siswa?
      const rn = await getOne('SELECT COUNT(1) AS c FROM nilai');
      const rp = await getOne('SELECT COUNT(1) AS c FROM skl_photos');
      if ((rn?.c || 0) > 0 || (rp?.c || 0) > 0) {
        await runP('ROLLBACK');
        return res.status(409).send('Tidak dapat menghapus semua SISWA karena masih ada data NILAI atau FOTO terkait. Hapus nilai/foto terlebih dahulu.');
      }

      await runP('DELETE FROM siswa');
      await runP('COMMIT');
      try { await runP(`DELETE FROM sqlite_sequence WHERE name IN ('siswa')`); } catch {}
      try { await runP('VACUUM'); } catch {}
      return res.json({ success: true, message: 'Semua data SISWA telah dihapus. Data SEKOLAH tetap ada.' });
    }

    // tableId tidak dikenali
    await runP('ROLLBACK');
    return res.status(400).send("Parameter 'tableId' harus 'sekolah' atau 'siswa'.");
  } catch (e) {
    try { await runP('ROLLBACK'); } catch {}
    return res.status(500).send(e.message || 'Terjadi kesalahan pada server.');
  } finally {
    db.close();
  }
};




// RESTORE DATA DARI PAYLOAD JSON (TRANSAKSIONAL)
exports.restoreData = async (req, res) => {
  const db = getDbConnection();
  try {
    const payload = req.body || {};
    // Mendukung dua bentuk: { data: {...} } atau langsung {...}
    const data = payload.data ? payload.data : payload;

    const sekolahRows = Array.isArray(data.sekolah) ? data.sekolah : [];
    const siswaRows   = Array.isArray(data.siswa)   ? data.siswa   : [];
    // Opsi 1 (paling mudah): nilaiRows sudah dipre-flatten di FE/backup
    // Contoh struktur: [nisn, semester, mapel, ki3, ki4, rt]
    const nilaiRows   = Array.isArray(data.nilaiRows) ? data.nilaiRows : [];
    // Opsi 2: jika Anda punya table foto, boleh restore dari array juga
    // Contoh: [nisn, dataUrl]
    const sklPhotoRows = Array.isArray(data.sklPhotosRows) ? data.sklPhotosRows : [];

    await run(db, 'PRAGMA foreign_keys = ON');
    await run(db, 'BEGIN TRANSACTION');

    // 1) Kosongkan data dulu (restore = replace)
    const tables = ['nilai', 'skl_photos', 'siswa', 'sekolah', 'settings'];
    for (const t of tables) {
      try { await run(db, `DELETE FROM ${t}`); } catch {}
    }

    // 2) Insert SEKOLAH
    if (sekolahRows.length) {
      const stmtSekolah = db.prepare(`
        INSERT OR REPLACE INTO sekolah
        (kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const r of sekolahRows) {
        // Asumsi indeks: [0..5] seperti FE
        stmtSekolah.run(r[0], r[1], r[2], r[3], r[4], r[5]);
      }
      stmtSekolah.finalize();
    }

    // 3) Insert SISWA
    if (siswaRows.length) {
      const stmtSiswa = db.prepare(`
        INSERT OR REPLACE INTO siswa
        (kodeBiasa, kodePro, namaSekolah, kecamatan, noUrut, noInduk, noPeserta, nisn, namaPeserta, ttl, namaOrtu, noIjazah, jk)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of siswaRows) {
        // Tambah 'jk' (jenis kelamin) bila tersedia di indeks [12]; jika tidak, isi null
        stmtSiswa.run(
          r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11],
          typeof r[12] === 'undefined' ? null : r[12]
        );
      }
      stmtSiswa.finalize();
    }

    // 4) Insert NILAI (jika disediakan sebagai baris datar)
    if (nilaiRows.length) {
      const stmtNilai = db.prepare(`
        INSERT OR REPLACE INTO nilai
        (nisn, semester, mapel, ki3, ki4, rt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const n of nilaiRows) {
        stmtNilai.run(n[0], n[1], n[2], n[3], n[4], n[5]);
      }
      stmtNilai.finalize();
    } else if (data.nilai && typeof data.nilai === 'object') {
      // (OPSIONAL) Jika backup berbentuk object { [nisn]: { [semester]: { MAPEL: {ki3, ki4, rt}, ... } } }
      // Kita iterasi & flatten di sini.
      const stmtNilai = db.prepare(`
        INSERT OR REPLACE INTO nilai
        (nisn, semester, mapel, ki3, ki4, rt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const nisn of Object.keys(data.nilai)) {
        const semObj = data.nilai[nisn] || {};
        for (const semester of Object.keys(semObj)) {
          const mapelObj = semObj[semester] || {};
          for (const mapel of Object.keys(mapelObj)) {
            const v = mapelObj[mapel] || {};
            stmtNilai.run(nisn, semester, mapel, v.ki3 ?? null, v.ki4 ?? null, v.rt ?? null);
          }
        }
      }
      stmtNilai.finalize();
    }

    // 5) Insert FOTO (jika ada)
    if (sklPhotoRows.length) {
      const stmtPhoto = db.prepare(`
        INSERT OR REPLACE INTO skl_photos
        (nisn, photoDataUrl) VALUES (?, ?)
      `);
      for (const p of sklPhotoRows) {
        stmtPhoto.run(p[0], p[1]);
      }
      stmtPhoto.finalize();
    } else if (data.sklPhotos && typeof data.sklPhotos === 'object') {
      const stmtPhoto = db.prepare(`
        INSERT OR REPLACE INTO skl_photos
        (nisn, photoDataUrl) VALUES (?, ?)
      `);
      for (const nisn of Object.keys(data.sklPhotos)) {
        stmtPhoto.run(nisn, data.sklPhotos[nisn]);
      }
      stmtPhoto.finalize();
    }

    // 6) SETTINGS (opsional key-value)
    if (data.settings && typeof data.settings === 'object') {
      const stmtSet = db.prepare(`
        INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
      `);
      for (const k of Object.keys(data.settings)) {
        stmtSet.run(k, JSON.stringify(data.settings[k]));
      }
      stmtSet.finalize();
    }

    await run(db, 'COMMIT');

    res.json({
      success: true,
      message: 'Restore data berhasil.',
      inserted: {
        sekolah: sekolahRows.length,
        siswa: siswaRows.length,
        nilai: Array.isArray(data.nilaiRows) ? data.nilaiRows.length : 'by-object',
        skl_photos: Array.isArray(data.sklPhotosRows) ? data.sklPhotosRows.length : Object.keys(data.sklPhotos || {}).length,
        settings: data.settings ? Object.keys(data.settings).length : 0
      }
    });
  } catch (e) {
    try { await run(db, 'ROLLBACK'); } catch {}
    res.status(500).json({ success: false, message: e.message });
  } finally {
    db.close();
  }
};


exports.getAllSekolah = async (req, res) => {
    const db = getDbConnection();
    try {
        const sekolahRows = await queryAll(db, 'SELECT * FROM sekolah');
        const dataSekolah = sekolahRows.map(row => Object.values(row));
        res.json({ success: true, data: dataSekolah });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data sekolah.' });
    } finally {
        db.close();
    }
};

// FUNGSI 2: Hanya mengambil siswa dari satu sekolah (untuk sekolah saat login)
exports.getSiswaBySekolah = async (req, res) => {
    const { kodeSekolah } = req.query; // Mengambil kode dari parameter URL (?kodeSekolah=XYZ)
    if (!kodeSekolah) {
        return res.status(400).json({ success: false, message: 'Kode sekolah dibutuhkan.' });
    }
    const db = getDbConnection();
    try {
        const siswaRows = await queryAll(db, 'SELECT * FROM siswa WHERE kodeBiasa = ?', [kodeSekolah]);
        const dataSiswa = siswaRows.map(row => Object.values(row));
        res.json({ success: true, data: dataSiswa });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data siswa.' });
    } finally {
        db.close();
    }
};

// FUNGSI 3: Mengambil SEMUA data yang berhubungan dengan satu sekolah (nilai, settings, dll)
exports.getFullDataSekolah = async (req, res) => {
    const { kodeBiasa } = req.params;
    const db = getDbConnection();
    try {
        const [siswaRows, settingsRows, mulokNamesRows] = await Promise.all([
            queryAll(db, 'SELECT nisn FROM siswa WHERE kodeBiasa = ?', [kodeBiasa]),
            queryAll(db, 'SELECT * FROM settings WHERE kodeBiasa = ?', [kodeBiasa]),
            queryAll(db, 'SELECT * FROM mulok_names WHERE kodeBiasa = ?', [kodeBiasa])
        ]);

        const nisns = siswaRows.map(s => s.nisn);
        let nilaiRows = [];
        let sklPhotosRows = [];

        if (nisns.length > 0) {
            const placeholders = nisns.map(() => '?').join(',');
            nilaiRows = await queryAll(db, `SELECT * FROM nilai WHERE nisn IN (${placeholders})`, nisns);
            sklPhotosRows = await queryAll(db, `SELECT * FROM skl_photos WHERE nisn IN (${placeholders})`, nisns);
        }

        // Susun kembali data ke format yang diharapkan frontend
        const finalData = {
            nilai: { _mulokNames: {} },
            settings: {},
            sklPhotos: {}
        };

        nilaiRows.forEach(row => {
            if (!finalData.nilai[row.nisn]) { finalData.nilai[row.nisn] = {}; }
            if (!finalData.nilai[row.nisn][row.semester]) { finalData.nilai[row.nisn][row.semester] = {}; }
            if (!finalData.nilai[row.nisn][row.semester][row.subject]) { finalData.nilai[row.nisn][row.semester][row.subject] = {}; }
            finalData.nilai[row.nisn][row.semester][row.subject][row.type] = row.value;
        });
        mulokNamesRows.forEach(row => {
            if (!finalData.nilai._mulokNames[row.kodeBiasa]) { finalData.nilai._mulokNames[row.kodeBiasa] = {}; }
            finalData.nilai._mulokNames[row.kodeBiasa][row.mulok_key] = row.mulok_name;
        });
        settingsRows.forEach(row => {
            finalData.settings[row.kodeBiasa] = JSON.parse(row.settings_json || '{}');
        });
        sklPhotosRows.forEach(row => {
            finalData.sklPhotos[row.nisn] = row.photo_data;
        });

        res.json({ success: true, data: finalData });

    } catch (error) {
        console.error('Get Full Data Sekolah error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data lengkap sekolah.' });
    } finally {
        db.close();
    }
};

// Tambahkan tiga fungsi baru ini di dataController.js

// FUNGSI UNTUK MENAMBAH SEKOLAH BARU
exports.addSekolah = (req, res) => {
    
};

// === REPLACE dari sini ===

// FUNGSI UNTUK MENAMBAH SEKOLAH BARU
exports.addSekolah = async (req, res) => {
  const { sekolahData } = req.body;
  if (!sekolahData || sekolahData.length !== 6) {
    return res.status(400).json({ success: false, message: 'Payload sekolahData tidak valid.' });
  }
  const db = getDbConnection();
  try {
    const sql = `INSERT INTO sekolah (kodeBiasa, kodePro, kecamatan, npsn, namaSekolahLengkap, namaSekolahSingkat)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await run(db, sql, sekolahData);
    res.json({ success: true, message: 'Sekolah berhasil ditambahkan.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally { db.close(); }
};

// FUNGSI UNTUK MEMPERBARUI DATA SEKOLAH
exports.updateSekolah = async (req, res) => {
  const { originalKodeBiasa, sekolahData } = req.body;
  if (!originalKodeBiasa || !sekolahData || sekolahData.length !== 6) {
    return res.status(400).json({ success: false, message: 'Payload tidak lengkap.' });
  }
  const db = getDbConnection();
  try {
    const sql = `UPDATE sekolah
                 SET kodeBiasa=?, kodePro=?, kecamatan=?, npsn=?, namaSekolahLengkap=?, namaSekolahSingkat=?
                 WHERE kodeBiasa=?`;
    await run(db, sql, [...sekolahData, originalKodeBiasa]);
    res.json({ success: true, message: 'Data sekolah berhasil diperbarui.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  } finally { db.close(); }
};

// FUNGSI UNTUK MENGHAPUS SEKOLAH (DAN SEMUA DATA TERKAIT)
// src/controllers/dataController.js
exports.deleteSekolah = async (req, res) => {
  const { kodeBiasa } = req.body; // penting: camelCase
  if (!kodeBiasa) {
    return res.status(400).json({ success: false, message: 'Kode sekolah tidak ditemukan.' });
  }

  const db = getDbConnection();
  try {
    await run(db, 'PRAGMA foreign_keys = ON'); // pastikan FK aktif
    const result = await run(db, 'DELETE FROM sekolah WHERE kodeBiasa = ?', [kodeBiasa]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Sekolah dengan kode tersebut tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Data sekolah dan semua data terkait berhasil dihapus.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  } finally {
    db.close();
  }
};


// HAPUS SISWA (beserta nilai & foto) — versi sqlite3
exports.deleteSiswa = async (req, res) => {
  const { nisn } = req.body;
  if (!nisn) return res.status(400).json({ success: false, message: 'NISN diperlukan.' });

  const db = getDbConnection();
  try {
    await run(db, 'BEGIN TRANSACTION');
    await run(db, 'DELETE FROM nilai WHERE nisn = ?', [nisn]);
    await run(db, 'DELETE FROM skl_photos WHERE nisn = ?', [nisn]);
    const del = await run(db, 'DELETE FROM siswa WHERE nisn = ?', [nisn]);
    if (del.changes === 0) {
      await run(db, 'ROLLBACK');
      return res.status(404).json({ success: false, message: 'Siswa dengan NISN tersebut tidak ditemukan.' });
    }
    await run(db, 'COMMIT');
    res.json({ success: true, message: 'Siswa dan semua data terkait berhasil dihapus.' });
  } catch (e) {
    await run(db, 'ROLLBACK');
    res.status(500).json({ success: false, message: e.message });
  } finally { db.close(); }
};



exports.deleteSiswa = (req, res) => {
    const { nisn } = req.body;
    if (!nisn) {
        return res.status(400).json({ success: false, message: "NISN diperlukan." });
    }

    const db = require('../db'); // Panggil database
    try {
        const transaction = db.transaction(() => {
            // Hapus nilai terkait terlebih dahulu
            const deleteGradesStmt = db.prepare('DELETE FROM nilai WHERE nisn = ?');
            deleteGradesStmt.run(nisn);

            // Hapus foto terkait
            const deletePhotoStmt = db.prepare('DELETE FROM skl_photos WHERE nisn = ?');
            deletePhotoStmt.run(nisn);

            // Hapus siswa
            const deleteSiswaStmt = db.prepare('DELETE FROM siswa WHERE nisn = ?');
            const info = deleteSiswaStmt.run(nisn);

            if (info.changes === 0) {
                // Jika tidak ada baris yang terhapus, lemparkan error agar transaksi di-rollback
                throw new Error('Siswa dengan NISN tersebut tidak ditemukan.');
            }
        });

        transaction(); // Jalankan transaksi

        res.json({ success: true, message: 'Siswa dan semua data terkait berhasil dihapus.' });

    } catch (error) {
        console.error('Gagal menghapus siswa:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Gagal menghapus data siswa dari server.' });
    }
};
// === FINAL: Hapus semua SEKOLAH (akan ikut hapus siswa/nilai/foto via CASCADE) ===
exports.truncateSekolah = async (req, res) => {
  const db = getDbConnection();
  try {
    await run(db, 'PRAGMA foreign_keys = ON');
    await run(db, 'BEGIN TRANSACTION');

    // Urutan aman: hapus child dulu (mempercepat & jelas), lalu sekolah
    await run(db, 'DELETE FROM nilai');
    await run(db, 'DELETE FROM skl_photos');
    await run(db, 'DELETE FROM siswa');
    await run(db, 'DELETE FROM sekolah');

    await run(db, 'COMMIT');

    // Reset autoincrement & vacuum (opsional)
    try { await run(db, `DELETE FROM sqlite_sequence WHERE name IN ('nilai','skl_photos','siswa','sekolah')`); } catch {}
    try { await run(db, 'VACUUM'); } catch {}

    return res.json({ success: true, message: 'Semua data SEKOLAH (beserta siswa, nilai, foto) telah dihapus.' });
  } catch (e) {
    try { await run(db, 'ROLLBACK'); } catch {}
    return res.status(500).json({ success: false, message: e.message });
  } finally {
    db.close();
  }
};


// === FINAL: Hapus semua SISWA (sekolah tetap) ===
exports.truncateSiswa = async (req, res) => {
  const db = getDbConnection();
  try {
    await run(db, 'PRAGMA foreign_keys = ON');
    await run(db, 'BEGIN TRANSACTION');

    // Hapus semua data turunan siswa
    await run(db, 'DELETE FROM nilai');
    await run(db, 'DELETE FROM skl_photos');
    await run(db, 'DELETE FROM siswa');

    await run(db, 'COMMIT');

    // Reset autoincrement & vacuum (opsional)
    try { await run(db, `DELETE FROM sqlite_sequence WHERE name IN ('nilai','skl_photos','siswa')`); } catch {}
    try { await run(db, 'VACUUM'); } catch {}

    return res.json({ success: true, message: 'Semua data SISWA (beserta nilai & foto) telah dihapus. Data sekolah tetap ada.' });
  } catch (e) {
    try { await run(db, 'ROLLBACK'); } catch {}
    return res.status(500).json({ success: false, message: e.message });
  } finally {
    db.close();
  }
};
