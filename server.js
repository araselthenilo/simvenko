require('dotenv').config(); // PENTING: Membaca file .env di baris paling atas
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// INISIALISASI KONEKSI MYSQL
// ==============================================
let pool;

(async () => {
    try {
        // Buat database jika belum ada
        const initConn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        await initConn.end();

        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,      
            password: process.env.DB_PASSWORD, // Password diambil secara rahasia dari file .env
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log("Menghubungkan ke MySQL...");

        // Membuat tabel jika belum ada
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin (
                username VARCHAR(50) PRIMARY KEY,
                password VARCHAR(255)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS barang (
                id_barang VARCHAR(50) PRIMARY KEY,
                nama VARCHAR(255),
                kategori VARCHAR(100),
                harga INT,
                satuan VARCHAR(50),
                stok INT,
                batas_minimum INT
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS riwayat (
                id_transaksi VARCHAR(100) PRIMARY KEY,
                tanggal DATE,
                jenis VARCHAR(50),
                id_barang VARCHAR(50),
                jumlah INT,
                keterangan TEXT,
                petugas VARCHAR(100)
            )
        `);

        // Buat akun admin bawaan jika tabel admin masih kosong
        const [adminRows] = await pool.query("SELECT * FROM admin WHERE username = 'admin'");
        if (adminRows.length === 0) {
            await pool.query("INSERT INTO admin (username, password) VALUES ('admin', '123')");
        }
        
        console.log("✅ Database MySQL terhubung dan siap digunakan!");
    } catch (error) {
        console.error("❌ Gagal terhubung ke MySQL. Pastikan MySQL menyala dan file .env sudah benar!", error);
    }
})();

// ==============================================
// JALUR API (PENGHUBUNG FRONTEND & DATABASE)
// ==============================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM admin WHERE username = ? AND password = ?", [username, password]);
    
    if (rows.length > 0) {
        res.json({ sukses: true, message: 'Login berhasil!' });
    } else {
        res.status(401).json({ sukses: false, message: 'Username atau Password salah!' });
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const [barang] = await pool.query("SELECT * FROM barang");
        const [riwayat] = await pool.query("SELECT * FROM riwayat ORDER BY id_transaksi DESC");
        res.json({ barang, riwayat });
    } catch (error) {
        res.status(500).send("Error membaca database");
    }
});

app.post('/api/barang', async (req, res) => {
    const b = req.body;
    try {
        await pool.query(
            "INSERT INTO barang (id_barang, nama, kategori, harga, satuan, stok, batas_minimum) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [b.id_barang, b.nama, b.kategori, b.harga, b.satuan, b.stok, b.batas_minimum]
        );
        res.json({ message: 'Barang berhasil ditambahkan!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal! Pastikan Kode Barang tidak duplikat.' });
    }
});

app.put('/api/barang/:id', async (req, res) => {
    const idLama = req.params.id;
    const b = req.body;
    try {
        await pool.query(
            "UPDATE barang SET id_barang = ?, nama = ?, kategori = ?, harga = ?, satuan = ?, stok = ?, batas_minimum = ? WHERE id_barang = ?",
            [b.id_barang, b.nama, b.kategori, b.harga, b.satuan, b.stok, b.batas_minimum, idLama]
        );
        res.json({ message: 'Barang berhasil diubah!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengubah barang' });
    }
});

app.delete('/api/barang/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM barang WHERE id_barang = ?", [req.params.id]);
        res.json({ message: 'Barang berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus barang' });
    }
});

app.post('/api/transaksi', async (req, res) => {
    const trx = req.body;
    const id_transaksi = 'TRX-' + Date.now();
    const d = new Date();
    const tahun = d.getFullYear();
    const bulan = String(d.getMonth() + 1).padStart(2, '0');
    const hari = String(d.getDate()).padStart(2, '0');
    const tanggal = `${tahun}-${bulan}-${hari}`;
    const petugas = "Admin";
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query("SELECT stok FROM barang WHERE id_barang = ? FOR UPDATE", [trx.id_barang]);
        if (rows.length === 0) throw new Error('Barang tidak ditemukan');

        let stokBaru = rows[0].stok;
        const qty = Number(trx.jumlah);

        if (trx.jenis === 'masuk') {
            stokBaru += qty;
        } else if (trx.jenis === 'keluar') {
            stokBaru -= qty;
            if (stokBaru < 0) {
                res.status(400).json({ error: 'Stok tidak mencukupi!' });
                await connection.rollback();
                connection.release();
                return;
            }
        }

        await connection.query("UPDATE barang SET stok = ? WHERE id_barang = ?", [stokBaru, trx.id_barang]);
        await connection.query(
            "INSERT INTO riwayat (id_transaksi, tanggal, jenis, id_barang, jumlah, keterangan, petugas) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id_transaksi, tanggal, trx.jenis, trx.id_barang, qty, trx.keterangan, petugas]
        );

        await connection.commit();
        res.json({ message: 'Transaksi berhasil & Stok diperbarui!' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message || 'Error saat menyimpan transaksi' });
    } finally {
        connection.release();
    }
});

app.listen(port, () => {
    console.log(`🚀 Server menyala: http://localhost:${port}`);
});