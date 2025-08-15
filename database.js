// File baru: /src/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path ini mengasumsikan file db.sqlite Anda berada di folder utama 'backend/'
const dbPath = path.resolve(__dirname, '../db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('Error connecting to database:', err.message);
    }
    console.log('Successfully connected to the SQLite database.');
});

// Ekspor koneksi agar bisa digunakan file lain
module.exports = db;