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
                batas_minimum INT,
                is_deleted TINYINT(1) DEFAULT 0
            )
        `);

        // Migrasi kolom is_deleted jika tabel barang sudah ada sebelumnya
        try {
            await pool.query("ALTER TABLE barang ADD COLUMN is_deleted TINYINT(1) DEFAULT 0");
        } catch (e) {
            // Kolom is_deleted sudah ada
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS kategori (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_kategori VARCHAR(100) UNIQUE NOT NULL,
                is_deleted TINYINT(1) DEFAULT 0
            )
        `);

        // Migrasi kolom is_deleted pada kategori jika belum ada
        try {
            await pool.query("ALTER TABLE kategori ADD COLUMN is_deleted TINYINT(1) DEFAULT 0");
        } catch (e) {
            // Kolom sudah ada
        }

        // Migrasi kategori dari tabel barang yang sudah ada
        try {
            await pool.query(`
                INSERT IGNORE INTO kategori (nama_kategori, is_deleted)
                SELECT DISTINCT TRIM(kategori), 0 FROM barang 
                WHERE kategori IS NOT NULL AND TRIM(kategori) != ''
            `);
        } catch (e) {
            console.error("Migrasi kategori info:", e.message);
        }

        // Buat kategori bawaan jika tabel kategori masih kosong
        const [kategoriRows] = await pool.query("SELECT * FROM kategori LIMIT 1");
        if (kategoriRows.length === 0) {
            const defaultKategori = ['Alat Tulis', 'Elektronik', 'Kesehatan', 'Konsumsi', 'Perlengkapan'];
            for (const kat of defaultKategori) {
                await pool.query("INSERT IGNORE INTO kategori (nama_kategori, is_deleted) VALUES (?, 0)", [kat]);
            }
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS riwayat (
                id_transaksi VARCHAR(100) PRIMARY KEY,
                tanggal DATE,
                jenis VARCHAR(50),
                id_barang VARCHAR(50),
                jumlah INT,
                asal_tujuan TEXT,
                petugas VARCHAR(100)
            )
        `);

        // Migrasi kolom keterangan menjadi asal_tujuan jika tabel riwayat sudah ada sebelumnya
        try {
            await pool.query("ALTER TABLE riwayat CHANGE COLUMN keterangan asal_tujuan TEXT");
        } catch (e) {
            // Kolom sudah bernama asal_tujuan
        }

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
        const [kategori] = await pool.query(`
            SELECT 
                k.id, 
                k.nama_kategori, 
                k.is_deleted, 
                COUNT(CASE WHEN b.is_deleted = 0 THEN b.id_barang END) AS jumlah_barang
            FROM kategori k
            LEFT JOIN barang b ON b.kategori = k.nama_kategori
            GROUP BY k.id, k.nama_kategori, k.is_deleted
            ORDER BY k.is_deleted ASC, k.nama_kategori ASC
        `);
        res.json({ barang, riwayat, kategori });
    } catch (error) {
        res.status(500).send("Error membaca database");
    }
});

// Endpoint membaca seluruh data Kategori
app.get('/api/kategori', async (req, res) => {
    try {
        const [kategori] = await pool.query(`
            SELECT 
                k.id, 
                k.nama_kategori, 
                k.is_deleted, 
                COUNT(CASE WHEN b.is_deleted = 0 THEN b.id_barang END) AS jumlah_barang
            FROM kategori k
            LEFT JOIN barang b ON b.kategori = k.nama_kategori
            GROUP BY k.id, k.nama_kategori, k.is_deleted
            ORDER BY k.is_deleted ASC, k.nama_kategori ASC
        `);
        res.json(kategori);
    } catch (error) {
        res.status(500).json({ error: 'Gagal membaca data kategori' });
    }
});

// Endpoint Tambah Kategori
app.post('/api/kategori', async (req, res) => {
    const { nama_kategori } = req.body;
    const nama = (nama_kategori || '').trim();

    if (!nama) {
        return res.status(400).json({ error: 'Nama kategori tidak boleh kosong!' });
    }

    try {
        // Cek apakah kategori sudah ada (case-insensitive)
        const [existing] = await pool.query("SELECT * FROM kategori WHERE LOWER(nama_kategori) = LOWER(?)", [nama]);
        if (existing.length > 0) {
            if (existing[0].is_deleted) {
                // Kategori sebelumnya nonaktif, aktifkan kembali
                await pool.query("UPDATE kategori SET is_deleted = 0, nama_kategori = ? WHERE id = ?", [nama, existing[0].id]);
                return res.json({ message: `Kategori "${nama}" diaktifkan kembali!` });
            }
            return res.status(400).json({ error: `Kategori "${existing[0].nama_kategori}" sudah terdaftar!` });
        }

        await pool.query("INSERT INTO kategori (nama_kategori, is_deleted) VALUES (?, 0)", [nama]);
        res.json({ message: `Kategori "${nama}" berhasil ditambahkan!` });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menambahkan kategori ke database.' });
    }
});

// Endpoint Edit Nama Kategori (Otomatis perbarui nama kategori pada semua barang terkait)
app.put('/api/kategori/:id', async (req, res) => {
    const id = req.params.id;
    const { nama_kategori } = req.body;
    const namaBaru = (nama_kategori || '').trim();

    if (!namaBaru) {
        return res.status(400).json({ error: 'Nama kategori baru tidak boleh kosong!' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [kategoriRows] = await conn.query("SELECT * FROM kategori WHERE id = ? FOR UPDATE", [id]);
        if (kategoriRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Kategori tidak ditemukan!' });
        }

        const namaLama = kategoriRows[0].nama_kategori;

        // Cek apakah nama baru bentrok dengan kategori lain
        const [conflict] = await conn.query("SELECT id FROM kategori WHERE LOWER(nama_kategori) = LOWER(?) AND id != ?", [namaBaru, id]);
        if (conflict.length > 0) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ error: `Kategori "${namaBaru}" sudah digunakan oleh kategori lain!` });
        }

        // Update nama kategori di tabel kategori
        await conn.query("UPDATE kategori SET nama_kategori = ? WHERE id = ?", [namaBaru, id]);

        // Update seluruh barang yang memiliki kategori lama menjadi kategori baru
        const [updateBarangResult] = await conn.query("UPDATE barang SET kategori = ? WHERE kategori = ?", [namaBaru, namaLama]);

        await conn.commit();
        res.json({ 
            message: `Kategori berhasil diubah menjadi "${namaBaru}". ${updateBarangResult.affectedRows} barang diperbarui.`,
            affectedBarang: updateBarangResult.affectedRows
        });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: 'Gagal memperbarui nama kategori.' });
    } finally {
        conn.release();
    }
});

// Endpoint Pemindahan Kategori (Memindahkan seluruh barang dari kategori asal ke kategori tujuan)
app.post('/api/kategori/pindahkan', async (req, res) => {
    const { kategori_asal, kategori_tujuan, nonaktifkan_asal } = req.body;
    const asal = (kategori_asal || '').trim();
    const tujuan = (kategori_tujuan || '').trim();

    if (!asal || !tujuan) {
        return res.status(400).json({ error: 'Kategori asal dan kategori tujuan harus dipilih!' });
    }

    if (asal.toLowerCase() === tujuan.toLowerCase()) {
        return res.status(400).json({ error: 'Kategori tujuan tidak boleh sama dengan kategori asal!' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Pastikan kategori tujuan valid dan aktif
        const [tujuanRows] = await conn.query("SELECT * FROM kategori WHERE nama_kategori = ?", [tujuan]);
        if (tujuanRows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: `Kategori tujuan "${tujuan}" tidak ditemukan!` });
        }

        // Pindahkan semua barang dari kategori asal ke kategori tujuan
        const [updateResult] = await conn.query("UPDATE barang SET kategori = ? WHERE kategori = ?", [tujuan, asal]);

        // Jika opsi nonaktifkan asal dipilih
        if (nonaktifkan_asal) {
            await conn.query("UPDATE kategori SET is_deleted = 1 WHERE nama_kategori = ?", [asal]);
        }

        await conn.commit();
        res.json({ 
            message: `Berhasil memindahkan ${updateResult.affectedRows} barang dari "${asal}" ke "${tujuan}".` + (nonaktifkan_asal ? ` Kategori "${asal}" dinonaktifkan.` : ''),
            affectedBarang: updateResult.affectedRows
        });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: 'Gagal memindahkan barang ke kategori baru.' });
    } finally {
        conn.release();
    }
});

// Endpoint Soft Delete (Nonaktifkan) Kategori
app.delete('/api/kategori/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [rows] = await pool.query("SELECT * FROM kategori WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Kategori tidak ditemukan!' });
        }

        await pool.query("UPDATE kategori SET is_deleted = 1 WHERE id = ?", [id]);
        res.json({ message: `Kategori "${rows[0].nama_kategori}" berhasil dinonaktifkan.` });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menonaktifkan kategori.' });
    }
});

// Endpoint Aktifkan Kembali Kategori
app.put('/api/kategori/:id/aktifkan', async (req, res) => {
    const id = req.params.id;
    try {
        const [rows] = await pool.query("SELECT * FROM kategori WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Kategori tidak ditemukan!' });
        }

        await pool.query("UPDATE kategori SET is_deleted = 0 WHERE id = ?", [id]);
        res.json({ message: `Kategori "${rows[0].nama_kategori}" berhasil diaktifkan kembali.` });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengaktifkan kategori.' });
    }
});

app.post('/api/barang', async (req, res) => {
    const b = req.body;
    const idBarang = (b.id_barang || '').trim();
    const namaBarang = (b.nama || '').trim();

    if (!idBarang || !namaBarang) {
        return res.status(400).json({ error: 'Kode Barang dan Nama Barang wajib diisi!' });
    }

    try {
        // Cek apakah Nama Barang sudah digunakan oleh barang aktif lain (case-insensitive)
        const [existingName] = await pool.query(
            "SELECT id_barang, nama, is_deleted FROM barang WHERE LOWER(TRIM(nama)) = LOWER(?) AND id_barang != ?",
            [namaBarang, idBarang]
        );
        if (existingName.length > 0 && !existingName[0].is_deleted) {
            return res.status(400).json({ error: `Nama Barang "${namaBarang}" sudah digunakan oleh barang lain (${existingName[0].id_barang})!` });
        }

        const [existing] = await pool.query("SELECT is_deleted FROM barang WHERE id_barang = ?", [idBarang]);
        if (existing.length > 0) {
            if (existing[0].is_deleted) {
                await pool.query(
                    "UPDATE barang SET nama = ?, kategori = ?, harga = ?, satuan = ?, stok = ?, batas_minimum = ?, is_deleted = 0 WHERE id_barang = ?",
                    [namaBarang, b.kategori, b.harga, b.satuan, b.stok, b.batas_minimum, idBarang]
                );
                return res.json({ message: 'Barang berhasil ditambahkan kembali!' });
            } else {
                return res.status(400).json({ error: 'Kode Barang sudah digunakan!' });
            }
        }

        await pool.query(
            "INSERT INTO barang (id_barang, nama, kategori, harga, satuan, stok, batas_minimum, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
            [idBarang, namaBarang, b.kategori, b.harga, b.satuan, b.stok, b.batas_minimum]
        );
        res.json({ message: 'Barang berhasil ditambahkan!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal! Pastikan Kode Barang dan Nama Barang tidak duplikat.' });
    }
});

app.put('/api/barang/:id', async (req, res) => {
    const idLama = req.params.id;
    const b = req.body;
    const idBarang = (b.id_barang || '').trim();
    const namaBarang = (b.nama || '').trim();

    if (!idBarang || !namaBarang) {
        return res.status(400).json({ error: 'Kode Barang dan Nama Barang wajib diisi!' });
    }

    try {
        if (idBarang !== idLama) {
            const [exist] = await pool.query("SELECT id_barang FROM barang WHERE id_barang = ? AND id_barang != ?", [idBarang, idLama]);
            if (exist.length > 0) {
                return res.status(400).json({ error: 'Kode Barang baru sudah digunakan!' });
            }
        }

        // Cek apakah Nama Barang sudah digunakan oleh barang aktif lain (case-insensitive)
        const [existingName] = await pool.query(
            "SELECT id_barang, nama, is_deleted FROM barang WHERE LOWER(TRIM(nama)) = LOWER(?) AND id_barang != ? AND is_deleted = 0",
            [namaBarang, idLama]
        );
        if (existingName.length > 0) {
            return res.status(400).json({ error: `Nama Barang "${namaBarang}" sudah digunakan oleh barang lain (${existingName[0].id_barang})!` });
        }

        await pool.query(
            "UPDATE barang SET id_barang = ?, nama = ?, kategori = ?, harga = ?, satuan = ?, stok = ?, batas_minimum = ? WHERE id_barang = ?",
            [idBarang, namaBarang, b.kategori, b.harga, b.satuan, b.stok, b.batas_minimum, idLama]
        );
        res.json({ message: 'Barang berhasil diubah!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengubah barang' });
    }
});

app.delete('/api/barang/:id', async (req, res) => {
    try {
        await pool.query("UPDATE barang SET is_deleted = 1 WHERE id_barang = ?", [req.params.id]);
        res.json({ message: 'Barang berhasil dinonaktifkan!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menonaktifkan barang' });
    }
});

app.put('/api/barang/:id/aktifkan', async (req, res) => {
    try {
        await pool.query("UPDATE barang SET is_deleted = 0 WHERE id_barang = ?", [req.params.id]);
        res.json({ message: 'Barang berhasil diaktifkan kembali!' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengaktifkan kembali barang' });
    }
});

app.post('/api/transaksi', async (req, res) => {
    const trx = req.body;
    const id_transaksi = 'TRX-' + Date.now();
    
    // Gunakan tanggal yang dikirimkan admin jika valid (format YYYY-MM-DD), jika tidak gunakan tanggal hari ini
    let tanggal = trx.tanggal;
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
        const d = new Date();
        const tahun = d.getFullYear();
        const bulan = String(d.getMonth() + 1).padStart(2, '0');
        const hari = String(d.getDate()).padStart(2, '0');
        tanggal = `${tahun}-${bulan}-${hari}`;
    }
    const petugas = "Admin";
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query("SELECT stok, is_deleted FROM barang WHERE id_barang = ? FOR UPDATE", [trx.id_barang]);
        if (rows.length === 0 || rows[0].is_deleted) throw new Error('Barang tidak ditemukan atau sudah dinonaktifkan');

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

        const asal_tujuan = trx.asal_tujuan || trx.keterangan || '';
        await connection.query("UPDATE barang SET stok = ? WHERE id_barang = ?", [stokBaru, trx.id_barang]);
        await connection.query(
            "INSERT INTO riwayat (id_transaksi, tanggal, jenis, id_barang, jumlah, asal_tujuan, petugas) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id_transaksi, tanggal, trx.jenis, trx.id_barang, qty, asal_tujuan, petugas]
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