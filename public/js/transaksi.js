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
    
    // Pastikan hanya barang aktif yang masuk ke dropdown pilihan
    const barangAktif = (barangData || []).filter(item => !item.is_deleted);

    barangAktif.forEach(item => {
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
    
    if (!riwayatData || riwayatData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">Belum ada riwayat transaksi.</td></tr>`;
        return;
    }

    riwayatData.forEach(trx => {
        const barangInfo = globalDataBarang.find(b => b.id_barang === trx.id_barang);
        let namaBarang = trx.id_barang;

        if (barangInfo) {
            if (barangInfo.is_deleted) {
                namaBarang = `${barangInfo.nama} <span class="item-deleted-tag"><i class="fa-solid fa-ban"></i> Dihapus</span>`;
            } else {
                namaBarang = barangInfo.nama;
            }
        }

        const isMasuk = trx.jenis === 'masuk';
        const labelJenis = isMasuk ? 'Masuk' : 'Keluar';
        const iconClass = isMasuk ? 'fa-plus' : 'fa-minus';
        const badgeClass = isMasuk ? 'masuk' : 'keluar';

        // Mengubah format tanggal mentah menjadi YYYY-MM-DD
        let tanggalRapi = trx.tanggal;
        if (tanggalRapi) {
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
        if (typeof showToast === 'function') {
            showToast('Transaksi berhasil disimpan!', 'success');
        } else {
            alert('Transaksi berhasil disimpan!');
        }

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