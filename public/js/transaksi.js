document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi styling warna dropdown pilihan jenis transaksi
    const trxJenis = document.getElementById('trx-jenis');
    if (trxJenis) {
        const updateJenisColor = () => {
            if (trxJenis.value === 'masuk') {
                trxJenis.style.color = '#27ae60';
                trxJenis.style.borderColor = '#27ae60';
            } else if (trxJenis.value === 'keluar') {
                trxJenis.style.color = '#e74c3c';
                trxJenis.style.borderColor = '#e74c3c';
            } else {
                trxJenis.style.color = '#333';
                trxJenis.style.borderColor = '#ccc';
            }
        };

        trxJenis.addEventListener('change', updateJenisColor);
        updateJenisColor();
    }
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

        const isMasuk = trx.jenis === 'masuk';
        const labelJenis = isMasuk ? 'Masuk' : 'Keluar';
        const iconClass = isMasuk ? 'fa-plus' : 'fa-minus';
        const badgeClass = isMasuk ? 'masuk' : 'keluar';

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
            <td>
                <span class="badge-transaksi ${badgeClass}">
                    <i class="fa-solid ${iconClass}"></i> ${labelJenis}
                </span>
            </td>
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
        const form = document.getElementById('form-transaksi');
        form.reset();
        
        const trxJenis = document.getElementById('trx-jenis');
        if (trxJenis) {
            trxJenis.dispatchEvent(new Event('change'));
        }
        
        // Panggil fungsi dari barang.js untuk memuat ulang SEMUA data (stok dan riwayat)
        loadDanTampilkanData(); 
    }
});