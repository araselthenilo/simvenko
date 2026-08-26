// Variabel global untuk menyimpan data riwayat transaksi dan status filter
let globalDataRiwayat = [];
let globalFilterJenisRiwayat = 'semua';

// Fungsi pembantu mendapatkan tanggal hari ini dalam format YYYY-MM-DD
function getHariIniString() {
    const d = new Date();
    const tahun = d.getFullYear();
    const bulan = String(d.getMonth() + 1).padStart(2, '0');
    const hari = String(d.getDate()).padStart(2, '0');
    return `${tahun}-${bulan}-${hari}`;
}

// Fungsi untuk mengisi opsi pada pilihan barang di form modal transaksi & filter riwayat
function updateDropdownBarang(barangData) {
    const dropdown = document.getElementById('trx-barang');
    if (dropdown) {
        dropdown.innerHTML = '<option value="">-- Pilih Barang --</option>'; // Reset opsi
        
        // Pastikan hanya barang aktif yang masuk ke dropdown transaksi baru
        const barangAktif = (barangData || []).filter(item => !item.is_deleted);

        barangAktif.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id_barang;
            option.textContent = `${item.id_barang} - ${item.nama} (Stok: ${item.stok} ${item.satuan})`;
            dropdown.appendChild(option);
        });
    }

    updateDropdownBarangFilterRiwayat(barangData);
}

// Fungsi untuk mengisi opsi dropdown filter barang di riwayat transaksi
function updateDropdownBarangFilterRiwayat(barangData) {
    const selectFilter = document.getElementById('filter-riwayat-barang');
    if (!selectFilter) return;

    const valSebelumnya = selectFilter.value;
    selectFilter.innerHTML = '<option value="semua">Semua Barang</option>';

    const barangList = barangData || (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []);
    
    // Gunakan Map untuk mengumpulkan barang unik dari master barang dan riwayat
    const mapBarang = new Map();
    barangList.forEach(b => {
        mapBarang.set(b.id_barang, b.nama + (b.is_deleted ? ' (Nonaktif)' : ''));
    });

    globalDataRiwayat.forEach(r => {
        if (r.id_barang && !mapBarang.has(r.id_barang)) {
            mapBarang.set(r.id_barang, r.id_barang);
        }
    });

    mapBarang.forEach((nama, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${id} - ${nama}`;
        selectFilter.appendChild(opt);
    });

    if (valSebelumnya && Array.from(selectFilter.options).some(o => o.value === valSebelumnya)) {
        selectFilter.value = valSebelumnya;
    }
}

// Fungsi untuk memperbarui badge jumlah filter aktif pada riwayat
function updateActiveFilterRiwayatBadge() {
    let count = 0;
    if (globalFilterJenisRiwayat !== 'semua') count++;

    const selectBarang = document.getElementById('filter-riwayat-barang');
    if (selectBarang && selectBarang.value !== 'semua') count++;

    const tglMulai = document.getElementById('filter-riwayat-tgl-mulai');
    if (tglMulai && tglMulai.value.trim() !== '') count++;

    const tglAkhir = document.getElementById('filter-riwayat-tgl-akhir');
    if (tglAkhir && tglAkhir.value.trim() !== '') count++;

    const jmlMin = document.getElementById('filter-riwayat-jumlah-min');
    if (jmlMin && jmlMin.value.trim() !== '') count++;

    const jmlMax = document.getElementById('filter-riwayat-jumlah-max');
    if (jmlMax && jmlMax.value.trim() !== '') count++;

    const badge = document.getElementById('badge-filter-riwayat-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Fungsi untuk mendapatkan data riwayat yang sudah disaring (filter & search)
function getFilteredDataRiwayat() {
    const allData = globalDataRiwayat || [];
    let filtered = allData;

    // 1. Filter Jenis Transaksi (semua / masuk / keluar)
    if (globalFilterJenisRiwayat === 'masuk') {
        filtered = filtered.filter(trx => trx.jenis === 'masuk');
    } else if (globalFilterJenisRiwayat === 'keluar') {
        filtered = filtered.filter(trx => trx.jenis === 'keluar');
    }

    // 2. Filter Barang
    const selectBarang = document.getElementById('filter-riwayat-barang');
    const valBarang = selectBarang ? selectBarang.value : 'semua';
    if (valBarang && valBarang !== 'semua') {
        filtered = filtered.filter(trx => trx.id_barang === valBarang);
    }

    // 3. Filter Rentang Tanggal (YYYY-MM-DD)
    const valTglMulai = document.getElementById('filter-riwayat-tgl-mulai')?.value.trim();
    const valTglAkhir = document.getElementById('filter-riwayat-tgl-akhir')?.value.trim();

    if (valTglMulai) {
        filtered = filtered.filter(trx => {
            const tgl = trx.tanggal ? String(trx.tanggal).substring(0, 10) : '';
            return tgl >= valTglMulai;
        });
    }

    if (valTglAkhir) {
        filtered = filtered.filter(trx => {
            const tgl = trx.tanggal ? String(trx.tanggal).substring(0, 10) : '';
            return tgl <= valTglAkhir;
        });
    }

    // 4. Filter Rentang Jumlah / Kuantitas
    const valJmlMin = document.getElementById('filter-riwayat-jumlah-min')?.value.trim();
    const valJmlMax = document.getElementById('filter-riwayat-jumlah-max')?.value.trim();

    if (valJmlMin !== '' && valJmlMin !== undefined) {
        const numMin = Number(valJmlMin);
        if (!isNaN(numMin)) {
            filtered = filtered.filter(trx => Number(trx.jumlah) >= numMin);
        }
    }

    if (valJmlMax !== '' && valJmlMax !== undefined) {
        const numMax = Number(valJmlMax);
        if (!isNaN(numMax)) {
            filtered = filtered.filter(trx => Number(trx.jumlah) <= numMax);
        }
    }

    // 5. Filter Pencarian Cepat (Live Search)
    const inputSearch = document.getElementById('input-pencarian-riwayat');
    const query = inputSearch ? inputSearch.value.trim().toLowerCase() : '';

    if (query) {
        filtered = filtered.filter(trx => {
            const idTransaksi = (trx.id_transaksi || '').toLowerCase();
            const idBarang = (trx.id_barang || '').toLowerCase();
            const barangInfo = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === trx.id_barang);
            const namaBarang = barangInfo ? barangInfo.nama.toLowerCase() : '';
            const asalTujuan = (trx.asal_tujuan || trx.keterangan || '').toLowerCase();
            const petugas = (trx.petugas || '').toLowerCase();
            const jenis = (trx.jenis || '').toLowerCase();
            const tanggal = (trx.tanggal ? String(trx.tanggal).substring(0, 10) : '').toLowerCase();
            const jumlah = String(trx.jumlah || '');

            return idTransaksi.includes(query) ||
                   idBarang.includes(query) ||
                   namaBarang.includes(query) ||
                   asalTujuan.includes(query) ||
                   petugas.includes(query) ||
                   jenis.includes(query) ||
                   tanggal.includes(query) ||
                   jumlah.includes(query);
        });
    }

    return filtered;
}

// Fungsi untuk menampilkan tabel riwayat transaksi
function renderTabelRiwayat(riwayatData) {
    if (riwayatData) {
        globalDataRiwayat = riwayatData;
    }
    
    // Perbarui dropdown filter barang jika riwayat baru dimuat
    updateDropdownBarangFilterRiwayat();

    // Hitung statistik untuk filter pills
    const allData = globalDataRiwayat || [];
    const countSemua = allData.length;
    const countMasuk = allData.filter(t => t.jenis === 'masuk').length;
    const countKeluar = allData.filter(t => t.jenis === 'keluar').length;

    const elCountSemua = document.getElementById('count-riwayat-semua');
    const elCountMasuk = document.getElementById('count-riwayat-masuk');
    const elCountKeluar = document.getElementById('count-riwayat-keluar');

    if (elCountSemua) elCountSemua.textContent = countSemua;
    if (elCountMasuk) elCountMasuk.textContent = countMasuk;
    if (elCountKeluar) elCountKeluar.textContent = countKeluar;

    const dataToRender = getFilteredDataRiwayat();
    const tbody = document.getElementById('tabel-riwayat-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 28px 15px;"><i class="fa-solid fa-inbox" style="font-size: 24px; color: #cbd5e1; display: block; margin-bottom: 8px;"></i>Tidak ada riwayat transaksi yang sesuai dengan kriteria filter.</td></tr>`;
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
            <td><span class="badge-trx-code">${trx.id_transaksi || '-'}</span></td>
            <td><strong>${tanggalRapi}</strong></td>
            <td>
                <span class="badge-transaksi ${badgeClass}">
                    <i class="fa-solid ${iconClass}"></i> ${labelJenis}
                </span>
            </td>
            <td>${namaBarang}</td>
            <td><strong>${trx.jumlah}</strong></td>
            <td>${trx.asal_tujuan || trx.keterangan || '-'}</td>
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
    const trxTanggal = document.getElementById('trx-tanggal');
    const trxBarang = document.getElementById('trx-barang');
    const trxJumlah = document.getElementById('trx-jumlah');
    const trxKeterangan = document.getElementById('trx-keterangan');
    const iconTrxKeterangan = document.getElementById('icon-trx-keterangan');
    const textTrxKeterangan = document.getElementById('text-trx-keterangan');
    const hintTrxKeterangan = document.getElementById('hint-trx-keterangan');
    const trxStokPreview = document.getElementById('trx-stok-preview');
    const trxStokPreviewText = document.getElementById('trx-stok-preview-text');

    // --- ELEMEN ADVANCED FILTERING RIWAYAT ---
    const btnToggleFilterRiwayat = document.getElementById('btn-toggle-filter-riwayat');
    const panelFilterRiwayat = document.getElementById('panel-advanced-filter-riwayat');
    const btnResetFilterRiwayat = document.getElementById('btn-reset-filter-riwayat');
    const filterJenisContainer = document.getElementById('filter-jenis-riwayat');
    const selectFilterBarang = document.getElementById('filter-riwayat-barang');
    const inputFilterTglMulai = document.getElementById('filter-riwayat-tgl-mulai');
    const inputFilterTglAkhir = document.getElementById('filter-riwayat-tgl-akhir');
    const inputFilterJmlMin = document.getElementById('filter-riwayat-jumlah-min');
    const inputFilterJmlMax = document.getElementById('filter-riwayat-jumlah-max');
    const inputPencarianRiwayat = document.getElementById('input-pencarian-riwayat');

    // Inisialisasi tanggal default hari ini pada input modal transaksi
    if (trxTanggal) {
        trxTanggal.value = getHariIniString();
    }

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
        if (trxTanggal) {
            trxTanggal.value = getHariIniString(); // Set default hari ini saat modal dibuka
        }
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
            const tanggalManual = trxTanggal ? trxTanggal.value.trim() : '';
            const idBarang = trxBarang ? trxBarang.value.trim() : '';
            const jumlahRaw = trxJumlah ? trxJumlah.value.trim() : '';
            const keterangan = trxKeterangan ? trxKeterangan.value.trim() : '';

            // Validasi kelengkapan form
            let fieldKosong = false;
            if (!tanggalManual) {
                if (trxTanggal) trxTanggal.classList.add('is-invalid');
                fieldKosong = true;
            }
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
                tanggal: tanggalManual,
                id_barang: idBarang,
                jumlah,
                asal_tujuan: keterangan,
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

    // --- TOGGLE ADVANCED FILTERING PANEL RIWAYAT ---
    if (btnToggleFilterRiwayat && panelFilterRiwayat) {
        btnToggleFilterRiwayat.addEventListener('click', () => {
            const isHidden = panelFilterRiwayat.style.display === 'none' || panelFilterRiwayat.style.display === '';
            panelFilterRiwayat.style.display = isHidden ? 'block' : 'none';
            btnToggleFilterRiwayat.classList.toggle('active', isHidden);
        });
    }

    // --- RESET ADVANCED FILTERING RIWAYAT ---
    if (btnResetFilterRiwayat) {
        btnResetFilterRiwayat.addEventListener('click', () => {
            // Reset pills ke jenis 'semua'
            globalFilterJenisRiwayat = 'semua';
            if (filterJenisContainer) {
                filterJenisContainer.querySelectorAll('.filter-pill').forEach(p => {
                    if (p.getAttribute('data-filter') === 'semua') {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            }

            // Reset select barang
            if (selectFilterBarang) selectFilterBarang.value = 'semua';

            // Reset rentang tanggal
            if (inputFilterTglMulai) inputFilterTglMulai.value = '';
            if (inputFilterTglAkhir) inputFilterTglAkhir.value = '';

            // Reset rentang jumlah
            if (inputFilterJmlMin) inputFilterJmlMin.value = '';
            if (inputFilterJmlMax) inputFilterJmlMax.value = '';

            updateActiveFilterRiwayatBadge();
            renderTabelRiwayat();
        });
    }

    // --- EVENT LISTENER FILTER PILLS JENIS TRANSAKSI ---
    if (filterJenisContainer) {
        filterJenisContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-pill');
            if (!btn) return;

            filterJenisContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');

            globalFilterJenisRiwayat = btn.getAttribute('data-filter') || 'semua';
            updateActiveFilterRiwayatBadge();
            renderTabelRiwayat();
        });
    }

    // --- EVENT LISTENERS FILTER CONTROLS RIWAYAT ---
    if (selectFilterBarang) {
        selectFilterBarang.addEventListener('change', () => {
            updateActiveFilterRiwayatBadge();
            renderTabelRiwayat();
        });
    }

    if (inputFilterTglMulai) {
        inputFilterTglMulai.addEventListener('input', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
        inputFilterTglMulai.addEventListener('change', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
    }

    if (inputFilterTglAkhir) {
        inputFilterTglAkhir.addEventListener('input', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
        inputFilterTglAkhir.addEventListener('change', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
    }

    if (inputFilterJmlMin) {
        inputFilterJmlMin.addEventListener('input', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
    }

    if (inputFilterJmlMax) {
        inputFilterJmlMax.addEventListener('input', () => { updateActiveFilterRiwayatBadge(); renderTabelRiwayat(); });
    }

    // --- LIVE SEARCH RIWAYAT ---
    if (inputPencarianRiwayat) {
        inputPencarianRiwayat.addEventListener('input', () => {
            renderTabelRiwayat();
        });
    }

    // --- FITUR DROPDOWN & AKSI EXPOR DATA RIWAYAT (PDF / CSV) ---
    const btnExportRiwayatDropdown = document.getElementById('btn-export-riwayat-dropdown');
    const menuExportRiwayatDropdown = document.getElementById('export-menu-riwayat-dropdown');
    const chevronExportRiwayatIcon = document.getElementById('chevron-export-riwayat-icon');
    const btnExportRiwayatPdf = document.getElementById('btn-export-riwayat-pdf');
    const btnExportRiwayatCsv = document.getElementById('btn-export-riwayat-csv');

    function tutupExportMenuRiwayat() {
        if (menuExportRiwayatDropdown) menuExportRiwayatDropdown.style.display = 'none';
        if (chevronExportRiwayatIcon) chevronExportRiwayatIcon.style.transform = 'rotate(0deg)';
    }

    if (btnExportRiwayatDropdown && menuExportRiwayatDropdown) {
        btnExportRiwayatDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menuExportRiwayatDropdown.style.display === 'none' || menuExportRiwayatDropdown.style.display === '';
            menuExportRiwayatDropdown.style.display = isHidden ? 'block' : 'none';
            if (chevronExportRiwayatIcon) {
                chevronExportRiwayatIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }

    if (btnExportRiwayatPdf) {
        btnExportRiwayatPdf.addEventListener('click', () => {
            tutupExportMenuRiwayat();
            exportDataRiwayatPDF();
        });
    }

    if (btnExportRiwayatCsv) {
        btnExportRiwayatCsv.addEventListener('click', () => {
            tutupExportMenuRiwayat();
            exportDataRiwayatCSV();
        });
    }

    // Tutup menu export saat klik di area luar
    window.addEventListener('click', (e) => {
        if (menuExportRiwayatDropdown && menuExportRiwayatDropdown.style.display === 'block') {
            if (!e.target.closest('#btn-export-riwayat-dropdown') && !e.target.closest('#export-menu-riwayat-dropdown')) {
                tutupExportMenuRiwayat();
            }
        }
    });
});

// --- FUNGSI MENDAPATKAN RINGKASAN FILTER AKTIF RIWAYAT ---
function getActiveFiltersRiwayatSummary() {
    const filters = [];

    // 1. Jenis Transaksi
    if (globalFilterJenisRiwayat === 'masuk') {
        filters.push('Jenis: Barang Masuk');
    } else if (globalFilterJenisRiwayat === 'keluar') {
        filters.push('Jenis: Barang Keluar');
    }

    // 2. Barang
    const selectBarang = document.getElementById('filter-riwayat-barang');
    const valBarang = selectBarang ? selectBarang.value : 'semua';
    if (valBarang && valBarang !== 'semua') {
        const item = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === valBarang);
        filters.push(`Barang: ${valBarang}${item ? ' (' + item.nama + ')' : ''}`);
    }

    // 3. Rentang Tanggal
    const valTglMulai = document.getElementById('filter-riwayat-tgl-mulai')?.value.trim();
    const valTglAkhir = document.getElementById('filter-riwayat-tgl-akhir')?.value.trim();
    if (valTglMulai && valTglAkhir) {
        filters.push(`Tanggal: ${valTglMulai} s/d ${valTglAkhir}`);
    } else if (valTglMulai) {
        filters.push(`Tanggal Mulai: ${valTglMulai}`);
    } else if (valTglAkhir) {
        filters.push(`Tanggal Akhir: ${valTglAkhir}`);
    }

    // 4. Rentang Jumlah
    const valJmlMin = document.getElementById('filter-riwayat-jumlah-min')?.value.trim();
    const valJmlMax = document.getElementById('filter-riwayat-jumlah-max')?.value.trim();
    if (valJmlMin !== '' && valJmlMin !== undefined && valJmlMax !== '' && valJmlMax !== undefined) {
        filters.push(`Jumlah: ${valJmlMin} s/d ${valJmlMax}`);
    } else if (valJmlMin !== '' && valJmlMin !== undefined) {
        filters.push(`Min Jumlah: ${valJmlMin}`);
    } else if (valJmlMax !== '' && valJmlMax !== undefined) {
        filters.push(`Max Jumlah: ${valJmlMax}`);
    }

    // 5. Pencarian
    const inputSearch = document.getElementById('input-pencarian-riwayat');
    const query = inputSearch ? inputSearch.value.trim() : '';
    if (query) {
        filters.push(`Pencarian: "${query}"`);
    }

    return filters;
}

// --- FUNGSI EKSPOR DATA RIWAYAT KE PDF (jsPDF + autoTable) ---
function exportDataRiwayatPDF() {
    const data = getFilteredDataRiwayat();
    if (!data || data.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Tidak ada data riwayat transaksi untuk diekspor ke PDF.', 'warning');
        } else {
            alert('Tidak ada data riwayat transaksi untuk diekspor ke PDF.');
        }
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        if (typeof showToast === 'function') {
            showToast('Library PDF belum termuat, mohon periksa koneksi internet Anda.', 'error');
        } else {
            alert('Library PDF belum termuat, mohon periksa koneksi internet Anda.');
        }
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const sekarang = new Date();
        const tglStr = sekarang.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const waktuStr = sekarang.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const adminUser = (typeof getExportAdminUser === 'function') ? getExportAdminUser() : (localStorage.getItem('simvenko_user') || 'Admin');
        const activeFilters = getActiveFiltersRiwayatSummary();
        const filterStr = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Semua Riwayat (Tanpa Filter)';

        // Header Dokumen
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('SIMVENKO - SISTEM MANAJEMEN INVENTARIS', 14, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text('Laporan Riwayat Mutasi dan Transaksi Barang', 14, 21);

        // Garis Pembatas
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 24, 196, 24);

        // Metadata Laporan
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        
        // Kolom Kiri
        doc.text(`Tanggal Cetak : ${tglStr}, ${waktuStr} WIB`, 14, 30);
        doc.text(`Total Transaksi: ${data.length} transaksi`, 14, 35);

        // Kolom Kanan
        doc.text(`Nama Admin    : ${adminUser}`, 115, 30);

        // Baris Filter Diterapkan
        const filterLabel = 'Filter Terpakai : ';
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(filterLabel, 14, 40);

        const filterLabelWidth = doc.getTextWidth(filterLabel);
        const filterStartX = 14 + filterLabelWidth;
        const availableWidth = 196 - filterStartX;
        
        doc.setFont('helvetica', activeFilters.length > 0 ? 'bold' : 'italic');
        if (activeFilters.length > 0) {
            doc.setTextColor(155, 89, 182); // Purple 600
        } else {
            doc.setTextColor(100, 116, 139);
        }

        const filterLines = doc.splitTextToSize(filterStr, availableWidth);
        doc.text(filterLines, filterStartX, 40);

        const startYTable = 42 + (filterLines.length * 4);

        // Format data tabel untuk autoTable
        const tableColumns = [
            { header: 'No', dataKey: 'no' },
            { header: 'ID Trx', dataKey: 'id' },
            { header: 'Tanggal', dataKey: 'tanggal' },
            { header: 'Jenis', dataKey: 'jenis' },
            { header: 'Nama Barang', dataKey: 'barang' },
            { header: 'Qty', dataKey: 'jumlah' },
            { header: 'Asal / Tujuan', dataKey: 'asal' },
            { header: 'Petugas', dataKey: 'petugas' }
        ];

        const tableRows = data.map((trx, index) => {
            const barangInfo = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === trx.id_barang);
            const namaBarang = barangInfo ? `${trx.id_barang} - ${barangInfo.nama}` : (trx.id_barang || '-');
            const jenisLabel = trx.jenis === 'masuk' ? 'Masuk (+)' : 'Keluar (-)';
            const tanggalRapi = trx.tanggal ? String(trx.tanggal).substring(0, 10) : '-';

            return {
                no: (index + 1).toString(),
                id: trx.id_transaksi || '-',
                tanggal: tanggalRapi,
                jenis: jenisLabel,
                barang: namaBarang,
                jumlah: `${trx.jumlah} ${barangInfo ? barangInfo.satuan : ''}`.trim(),
                asal: trx.asal_tujuan || trx.keterangan || '-',
                petugas: trx.petugas || 'Admin'
            };
        });

        doc.autoTable({
            columns: tableColumns,
            body: tableRows,
            startY: startYTable,
            theme: 'striped',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 2.5,
                valign: 'middle',
                textColor: [30, 41, 59],
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [155, 89, 182], // #9b59b6 Purple Accent
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            columnStyles: {
                no: { halign: 'center', cellWidth: 8 },
                id: { fontStyle: 'bold', cellWidth: 26 },
                tanggal: { halign: 'center', cellWidth: 20 },
                jenis: { halign: 'center', cellWidth: 20 },
                barang: { cellWidth: 42 },
                jumlah: { halign: 'right', fontStyle: 'bold', cellWidth: 16 },
                asal: { cellWidth: 32 },
                petugas: { halign: 'center', cellWidth: 18 }
            },
            didParseCell: function(dataCell) {
                if (dataCell.section === 'body' && dataCell.column.dataKey === 'jenis') {
                    if (dataCell.cell.raw.includes('Masuk')) {
                        dataCell.cell.styles.textColor = [22, 163, 74]; // Green
                        dataCell.cell.styles.fontStyle = 'bold';
                    } else {
                        dataCell.cell.styles.textColor = [220, 38, 38]; // Red
                        dataCell.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            didDrawPage: function () {
                const str = `Halaman ${doc.internal.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    str,
                    doc.internal.pageSize.width - 20,
                    doc.internal.pageSize.height - 10,
                    { align: 'right' }
                );
                doc.text(
                    `SIMVENKO - Nama Admin: ${adminUser}`,
                    14,
                    doc.internal.pageSize.height - 10
                );
            }
        });

        const padZero = (n) => String(n).padStart(2, '0');
        const fileDateStr = `${sekarang.getFullYear()}${padZero(sekarang.getMonth() + 1)}${padZero(sekarang.getDate())}_${padZero(sekarang.getHours())}${padZero(sekarang.getMinutes())}`;
        const fileName = `laporan_riwayat_transaksi_${fileDateStr}.pdf`;

        doc.save(fileName);
        if (typeof showToast === 'function') {
            showToast(`Berhasil mengekspor ${data.length} riwayat transaksi ke format PDF!`, 'success');
        }
    } catch (err) {
        console.error('Gagal mengekspor PDF Riwayat:', err);
        if (typeof showToast === 'function') {
            showToast('Terjadi kesalahan saat memproses ekspor PDF riwayat.', 'error');
        }
    }
}

// --- FUNGSI EKSPOR DATA RIWAYAT KE CSV ---
function exportDataRiwayatCSV() {
    const data = getFilteredDataRiwayat();
    if (!data || data.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Tidak ada data riwayat transaksi untuk diekspor ke CSV.', 'warning');
        } else {
            alert('Tidak ada data riwayat transaksi untuk diekspor ke CSV.');
        }
        return;
    }

    try {
        const sekarang = new Date();
        const tglStr = sekarang.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const waktuStr = sekarang.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const adminUser = (typeof getExportAdminUser === 'function') ? getExportAdminUser() : (localStorage.getItem('simvenko_user') || 'Admin');
        const activeFilters = getActiveFiltersRiwayatSummary();
        const filterStr = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Semua Riwayat (Tanpa Filter)';

        const metaRows = [
            ['"SIMVENKO - LAPORAN RIWAYAT TRANSAKSI"'],
            [`"Tanggal Ekspor"`, `"${tglStr} ${waktuStr} WIB"`],
            [`"Nama Admin"`, `"${adminUser}"`],
            [`"Filter Diterapkan"`, `"${filterStr.replace(/"/g, '""')}"`],
            [`"Total Transaksi"`, `"${data.length} transaksi"`],
            [] // Baris pemisah kosong
        ];

        const headers = [
            'No',
            'ID Transaksi',
            'Tanggal',
            'Jenis Transaksi',
            'Kode Barang',
            'Nama Barang',
            'Jumlah',
            'Asal / Tujuan',
            'Petugas'
        ];

        const rows = data.map((trx, index) => {
            const no = index + 1;
            const barangInfo = (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []).find(b => b.id_barang === trx.id_barang);
            const idTrx = `"${String(trx.id_transaksi || '').replace(/"/g, '""')}"`;
            const tanggal = `"${String(trx.tanggal ? String(trx.tanggal).substring(0, 10) : '').replace(/"/g, '""')}"`;
            const jenis = `"${trx.jenis === 'masuk' ? 'Masuk' : 'Keluar'}"`;
            const kode = `"${String(trx.id_barang || '').replace(/"/g, '""')}"`;
            const nama = `"${String(barangInfo ? barangInfo.nama : trx.id_barang || '').replace(/"/g, '""')}"`;
            const jumlah = Number(trx.jumlah || 0);
            const asal = `"${String(trx.asal_tujuan || trx.keterangan || '').replace(/"/g, '""')}"`;
            const petugas = `"${String(trx.petugas || 'Admin').replace(/"/g, '""')}"`;

            return [no, idTrx, tanggal, jenis, kode, nama, jumlah, asal, petugas].join(',');
        });

        const csvContent = '\uFEFF' + [
            ...metaRows.map(r => r.join(',')),
            headers.join(','),
            ...rows
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const padZero = (n) => String(n).padStart(2, '0');
        const fileDateStr = `${sekarang.getFullYear()}${padZero(sekarang.getMonth() + 1)}${padZero(sekarang.getDate())}_${padZero(sekarang.getHours())}${padZero(sekarang.getMinutes())}`;
        const fileName = `riwayat_transaksi_${fileDateStr}.csv`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        if (typeof showToast === 'function') {
            showToast(`Berhasil mengekspor ${data.length} riwayat transaksi ke format CSV!`, 'success');
        }
    } catch (err) {
        console.error('Gagal mengekspor CSV Riwayat:', err);
        if (typeof showToast === 'function') {
            showToast('Terjadi kesalahan saat memproses ekspor CSV riwayat.', 'error');
        }
    }
}