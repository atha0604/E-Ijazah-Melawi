// src/routes/dataRoutes.js (Versi Final yang Sudah Diperbaiki)
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const verifyToken = require('../middleware/authMiddleware');

// Semua rute di bawah baris ini dilindungi oleh token
router.use(verifyToken);

// == RUTE BARU UNTUK MENGAMBIL DATA SPESIFIK ==
router.get('/sekolah', dataController.getAllSekolah); // Hanya mengambil daftar sekolah
router.get('/siswa', dataController.getSiswaBySekolah);   // Mengambil siswa berdasarkan kode sekolah
router.get('/data-sekolah/:kodeBiasa', dataController.getFullDataSekolah); // Mengambil semua data untuk satu sekolah

// Rute lama /all, kita beri komentar untuk sementara, nanti bisa dihapus
router.get('/all', dataController.getAllData);

// Rute untuk menyimpan dan menghapus data (tetap sama)
router.post('/import/:tableId', dataController.importData);
router.post('/grade/save', dataController.saveGrade);
router.post('/grades/save-bulk', dataController.saveBulkGrades);
router.post('/settings/save', dataController.saveSettings);
router.post('/skl-photo/save', dataController.saveSklPhoto);
router.post('/skl-photo/delete', dataController.deleteSklPhoto);
router.post('/siswa/update', dataController.updateSiswa);
router.post('/delete-all', dataController.deleteAllData);
router.post('/grades/delete-by-semester', dataController.deleteGradesBySemester);
router.post('/restore', dataController.restoreData);
router.post('/sekolah/save', dataController.saveSekolah);
// Perhatikan: Rute delete, add, dan update sekolah di bawah ini duplikat,
// tapi kita biarkan karena frontend mungkin memanggilnya.
// Fungsi yang benar ada di dataController dan akan dipanggil oleh /sekolah/save
router.post('/sekolah/delete', dataController.deleteSekolah);
router.post('/sekolah/add', verifyToken, dataController.addSekolah);
router.post('/sekolah/update', verifyToken, dataController.updateSekolah);
// === FINAL: Routes truncate terpisah ===
router.post('/truncate/sekolah', dataController.truncateSekolah);
router.post('/truncate/siswa',   dataController.truncateSiswa);

router.post('/siswa/delete', verifyToken, dataController.deleteSiswa);


module.exports = router;