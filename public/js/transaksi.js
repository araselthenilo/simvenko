// Variabel global untuk menyimpan data riwayat transaksi
let globalDataRiwayat = [];

// Fungsi untuk mengisi opsi pada pilihan barang di form modal transaksi
function updateDropdownBarang(barangData) {
    const dropdown = document.getElementById('trx-barang');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- Pilih Barang --</option>'; // Reset opsi
    
    // Pastikan hanya barang aktif yang masuk ke dropdown pilihan
    const barangAktif = (barangData || []).filter(item => !item.is_deleted);

    barangAktif.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id_barang;
        option.textContent = `${item.id_barang} - ${item.nama} (Stok: ${item.stok} ${item.satuan})`;
        dropdown.appendChild(option);
    });
}

// Fungsi untuk menampilkan tabel riwayat transaksi
function renderTabelRiwayat(riwayatData) {
    if (riwayatData) {
        globalDataRiwayat = riwayatData;
    }
    
    const dataToRender = riwayatData || globalDataRiwayat;
    const tbody = document.getElementById('tabel-riwayat-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">Belum ada riwayat transaksi.</td></tr>`;
        return;
    }

    dataToRender.forEach(trx => {
        const barangInfo = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === trx.id_barang);
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

        // Format tanggal YYYY-MM-DD
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
            <td>${trx.keterangan || '-'}</td>
            <td>${trx.petugas || 'Admin'}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN MODAL TRANSAKSI ---
    const modalTransaksi = document.getElementById('modal-transaksi');
    const btnTambahTransaksi = document.getElementById('btn-tambah-transaksi');
    const tutupModalTransaksi = document.getElementById('tutup-modal-transaksi');
    const batalTransaksi = document.getElementById('batal-transaksi');
    const formTransaksi = document.getElementById('form-transaksi');
    const trxJenisHidden = document.getElementById('trx-jenis');
    const cardTrxMasuk = document.getElementById('card-trx-masuk');
    const cardTrxKeluar = document.getElementById('card-trx-keluar');
    const trxBarang = document.getElementById('trx-barang');
    const trxJumlah = document.getElementById('trx-jumlah');
    const trxKeterangan = document.getElementById('trx-keterangan');
    const iconTrxKeterangan = document.getElementById('icon-trx-keterangan');
    const textTrxKeterangan = document.getElementById('text-trx-keterangan');
    const hintTrxKeterangan = document.getElementById('hint-trx-keterangan');
    const trxStokPreview = document.getElementById('trx-stok-preview');
    const trxStokPreviewText = document.getElementById('trx-stok-preview-text');
    const inputPencarianRiwayat = document.getElementById('input-pencarian-riwayat');

    // Fungsi update tipe transaksi (Sekuensial: mengubah label Supplier/Pembeli)
    function setJenisTransaksi(jenis) {
        if (!trxJenisHidden) return;
        trxJenisHidden.value = jenis;

        if (jenis === 'masuk') {
            if (cardTrxMasuk) {
                cardTrxMasuk.classList.add('active-masuk');
                const radio = cardTrxMasuk.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
            if (cardTrxKeluar) {
                cardTrxKeluar.classList.remove('active-keluar');
            }

            // Update Label & Placeholder untuk Restock (Supplier)
            if (iconTrxKeterangan) {
                iconTrxKeterangan.className = 'fa-solid fa-truck-field';
            }
            if (textTrxKeterangan) {
                textTrxKeterangan.textContent = 'Nama Supplier / Asal Barang';
            }
            if (trxKeterangan) {
                trxKeterangan.placeholder = 'Contoh: PT Sumber Makmur, CV Abadi Jaya';
            }
            if (hintTrxKeterangan) {
                hintTrxKeterangan.textContent = 'Masukkan nama supplier atau pihak asal pengiriman stok.';
            }
        } else {
            if (cardTrxKeluar) {
                cardTrxKeluar.classList.add('active-keluar');
                const radio = cardTrxKeluar.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            }
            if (cardTrxMasuk) {
                cardTrxMasuk.classList.remove('active-masuk');
            }

            // Update Label & Placeholder untuk Penjualan / Barang Keluar (Pembeli)
            if (iconTrxKeterangan) {
                iconTrxKeterangan.className = 'fa-solid fa-user-tag';
            }
            if (textTrxKeterangan) {
                textTrxKeterangan.textContent = 'Nama Pembeli / Tujuan Barang';
            }
            if (trxKeterangan) {
                trxKeterangan.placeholder = 'Contoh: Toko Berkah, Bpk. Budi, Divisi Operasional';
            }
            if (hintTrxKeterangan) {
                hintTrxKeterangan.textContent = 'Masukkan nama pembeli, pelanggan, atau tujuan pengeluaran barang.';
            }
        }

        updateLiveStockInfo();
    }

    // Fungsi untuk memperbarui info preview stok real-time
    function updateLiveStockInfo() {
        if (!trxBarang || !trxStokPreview || !trxStokPreviewText) return;

        const idTerpilih = trxBarang.value;
        if (!idTerpilih) {
            trxStokPreview.style.display = 'none';
            return;
        }

        const barang = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === idTerpilih);
        if (!barang) {
            trxStokPreview.style.display = 'none';
            return;
        }

        const jenis = trxJenisHidden ? trxJenisHidden.value : 'masuk';
        trxStokPreview.style.display = 'flex';
        trxStokPreview.classList.remove('warning-stock', 'danger-stock');

        if (barang.stok === 0) {
            trxStokPreview.classList.add('danger-stock');
            trxStokPreviewText.innerHTML = `Stok saat ini: <strong>0 ${barang.satuan}</strong> (Stok Habis)`;
        } else if (barang.stok <= barang.batas_minimum) {
            trxStokPreview.classList.add('warning-stock');
            trxStokPreviewText.innerHTML = `Stok saat ini: <strong>${barang.stok} ${barang.satuan}</strong> (Menipis)`;
        } else {
            trxStokPreviewText.innerHTML = `Stok saat ini: <strong>${barang.stok} ${barang.satuan}</strong>`;
        }

        if (jenis === 'keluar' && barang.stok === 0) {
            trxStokPreviewText.innerHTML = `⚠️ <strong>Stok Habis!</strong> Barang ini tidak dapat dikeluarkan.`;
        }
    }

    // Event listener pemilihan jenis transaksi via kartu
    if (cardTrxMasuk) {
        cardTrxMasuk.addEventListener('click', () => setJenisTransaksi('masuk'));
    }
    if (cardTrxKeluar) {
        cardTrxKeluar.addEventListener('click', () => setJenisTransaksi('keluar'));
    }

    // Event listener pilihan barang
    if (trxBarang) {
        trxBarang.addEventListener('change', updateLiveStockInfo);
    }

    // Buka Modal Transaksi
    const bukaModalTransaksi = () => {
        if (!modalTransaksi) return;
        if (formTransaksi) formTransaksi.reset();
        hideFormError('transaksi-error', formTransaksi);
        setJenisTransaksi('masuk');
        updateLiveStockInfo();
        modalTransaksi.style.display = 'flex';
        if (trxBarang) trxBarang.focus();
    };

    // Tutup Modal Transaksi
    const tutupModalTrx = () => {
        if (!modalTransaksi) return;
        modalTransaksi.style.display = 'none';
        hideFormError('transaksi-error', formTransaksi);
        if (formTransaksi) formTransaksi.reset();
    };

    if (btnTambahTransaksi) btnTambahTransaksi.addEventListener('click', bukaModalTransaksi);
    if (tutupModalTransaksi) tutupModalTransaksi.addEventListener('click', tutupModalTrx);
    if (batalTransaksi) batalTransaksi.addEventListener('click', tutupModalTrx);

    // Tutup jika klik di luar modal backdrop
    window.addEventListener('click', (e) => {
        if (e.target === modalTransaksi) {
            tutupModalTrx();
        }
    });

    // Tutup dengan keyboard Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalTransaksi && modalTransaksi.style.display === 'flex') {
            tutupModalTrx();
        }
    });

    // Reset error highlight saat user mengetik/memilih
    if (formTransaksi) {
        formTransaksi.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const errorBox = document.getElementById('transaksi-error');
                if (errorBox && errorBox.style.display !== 'none') {
                    hideFormError('transaksi-error', formTransaksi);
                }
            });
            input.addEventListener('change', () => {
                input.classList.remove('is-invalid');
                const errorBox = document.getElementById('transaksi-error');
                if (errorBox && errorBox.style.display !== 'none') {
                    hideFormError('transaksi-error', formTransaksi);
                }
            });
        });
    }

    // --- PENGIRIMAN FORM TRANSAKSI ---
    if (formTransaksi) {
        formTransaksi.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideFormError('transaksi-error', formTransaksi);

            const jenis = trxJenisHidden ? trxJenisHidden.value : 'masuk';
            const idBarang = trxBarang ? trxBarang.value.trim() : '';
            const jumlahRaw = trxJumlah ? trxJumlah.value.trim() : '';
            const keterangan = trxKeterangan ? trxKeterangan.value.trim() : '';

            // Validasi kelengkapan form
            let fieldKosong = false;
            if (!idBarang) {
                if (trxBarang) trxBarang.classList.add('is-invalid');
                fieldKosong = true;
            }
            if (!jumlahRaw) {
                if (trxJumlah) trxJumlah.classList.add('is-invalid');
                fieldKosong = true;
            }
            if (!keterangan) {
                if (trxKeterangan) trxKeterangan.classList.add('is-invalid');
                fieldKosong = true;
            }

            if (fieldKosong) {
                showFormError('transaksi-error', 'Semua kolom yang bertanda bintang (*) wajib diisi!');
                return;
            }

            const jumlah = Number(jumlahRaw);
            if (isNaN(jumlah) || jumlah <= 0) {
                if (trxJumlah) trxJumlah.classList.add('is-invalid');
                showFormError('transaksi-error', 'Jumlah barang harus berupa angka positif lebih dari 0!');
                return;
            }

            // Validasi stok jika barang keluar
            const barangTerpilih = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === idBarang);
            if (jenis === 'keluar' && barangTerpilih) {
                if (barangTerpilih.stok < jumlah) {
                    if (trxJumlah) trxJumlah.classList.add('is-invalid');
                    showFormError('transaksi-error', `Stok tidak mencukupi! Stok "${barangTerpilih.nama}" saat ini hanya tersisa ${barangTerpilih.stok} ${barangTerpilih.satuan}.`);
                    return;
                }
            }

            const trxBaru = {
                jenis,
                id_barang: idBarang,
                jumlah,
                keterangan
            };

            const hasil = await catatTransaksi(trxBaru);
            if (hasil.sukses) {
                tutupModalTrx();
                if (typeof showToast === 'function') {
                    showToast(hasil.message || 'Transaksi berhasil disimpan!', 'success');
                } else {
                    alert('Transaksi berhasil disimpan!');
                }

                // Muat ulang seluruh data inventaris dan riwayat
                if (typeof loadDanTampilkanData === 'function') {
                    loadDanTampilkanData();
                }
            } else {
                showFormError('transaksi-error', hasil.message || 'Gagal menyimpan transaksi!');
            }
        });
    }

    // --- PENCARIAN RIWAYAT TRANSAKSI ---
    if (inputPencarianRiwayat) {
        inputPencarianRiwayat.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderTabelRiwayat(globalDataRiwayat);
                return;
            }

            const hasilFilter = globalDataRiwayat.filter(trx => {
                const barangInfo = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === trx.id_barang);
                const namaBarang = barangInfo ? barangInfo.nama.toLowerCase() : '';
                const idBarang = (trx.id_barang || '').toLowerCase();
                const keterangan = (trx.keterangan || '').toLowerCase();
                const petugas = (trx.petugas || '').toLowerCase();
                const jenis = (trx.jenis || '').toLowerCase();
                const tanggal = (trx.tanggal || '').toLowerCase();

                return namaBarang.includes(query) ||
                       idBarang.includes(query) ||
                       keterangan.includes(query) ||
                       petugas.includes(query) ||
                       jenis.includes(query) ||
                       tanggal.includes(query);
            });

            renderTabelRiwayat(hasilFilter);
        });
    }
});