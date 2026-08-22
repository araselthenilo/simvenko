document.addEventListener('DOMContentLoaded', () => {
    // Fungsi ini dipanggil dari barang.js setiap kali data di-load
    // untuk memastikan dropdown pilihan barang selalu up-to-date
});

// Fungsi untuk mengisi opsi pada pilihan barang di form transaksi
function updateDropdownBarang(barangData) {
    const dropdown = document.getElementById('trx-barang');
    dropdown.innerHTML = '<option value="">-- Pilih Barang --</option>'; // Reset opsi
    
    barangData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id_barang;
        option.textContent = `${item.id_barang} - ${item.nama} (Stok: ${item.stok})`;
        dropdown.appendChild(option);
    });
}

// Fungsi untuk menampilkan tabel riwayat
function renderTabelRiwayat(riwayatData) {
    const tbody = document.getElementById('tabel-riwayat-body');
    tbody.innerHTML = '';
    
    if (!riwayatData || riwayatData.length === 0) return;

    riwayatData.forEach(trx => {
        const barangInfo = globalDataBarang.find(b => b.id_barang === trx.id_barang);
        const namaBarang = barangInfo ? barangInfo.nama : trx.id_barang;

        const warnaJenis = trx.jenis === 'masuk' ? '#27ae60' : '#e74c3c';
        const labelJenis = trx.jenis === 'masuk' ? '📥 Masuk' : '📤 Keluar';

        // --- INI KUNCI UTAMANYA ---
        // Mengubah format tanggal mentah (apapun bentuknya) menjadi YYYY-MM-DD saja
        let tanggalRapi = trx.tanggal;
        if (tanggalRapi) {
            // Ambil 10 karakter pertama (contoh: "2026-08-21")
            tanggalRapi = String(tanggalRapi).substring(0, 10);
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tanggalRapi}</td>
            <td style="color: ${warnaJenis}; font-weight: bold;">${labelJenis}</td>
            <td>${namaBarang}</td>
            <td>${trx.jumlah}</td>
            <td>${trx.keterangan}</td>
            <td>${trx.petugas}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Menangani pengiriman form transaksi
document.getElementById('form-transaksi').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const trxBaru = {
        jenis: document.getElementById('trx-jenis').value,
        id_barang: document.getElementById('trx-barang').value,
        jumlah: Number(document.getElementById('trx-jumlah').value),
        keterangan: document.getElementById('trx-keterangan').value
    };

    if (await catatTransaksi(trxBaru)) {
        alert('Transaksi berhasil disimpan!');
        document.getElementById('form-transaksi').reset();
        
        // Panggil fungsi dari barang.js untuk memuat ulang SEMUA data (stok dan riwayat)
        loadDanTampilkanData(); 
    }
});