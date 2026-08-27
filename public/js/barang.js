// Variabel global untuk menyimpan data sementara
let globalDataBarang = [];
let globalDataKategori = [];
let globalFilterBarang = 'semua';

// Fungsi untuk menampilkan notifikasi toast modern
function showToast(pesan, tipe = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipe}`;
    
    let iconClass = 'fa-circle-check';
    let iconColor = '#27ae60';
    if (tipe === 'error') {
        iconClass = 'fa-circle-exclamation';
        iconColor = '#e74c3c';
    } else if (tipe === 'warning') {
        iconClass = 'fa-triangle-exclamation';
        iconColor = '#f39c12';
    }

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 16px;"></i>
        <span>${pesan}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Fungsi pembantu menampilkan pesan error pada form (gaya konsisten dengan login)
function showFormError(elementId, pesan) {
    const errorBox = document.getElementById(elementId);
    if (errorBox) {
        errorBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${pesan}</span>`;
        errorBox.style.display = 'flex';
        errorBox.style.animation = 'none';
        errorBox.offsetHeight; // Trigger reflow untuk reset animasi
        errorBox.style.animation = 'shakeError 0.35s ease';
    }
}

// Fungsi pembantu menyembunyikan pesan error pada form
function hideFormError(elementId, formElement) {
    const errorBox = document.getElementById(elementId);
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }
    if (formElement) {
        formElement.querySelectorAll('.is-invalid').forEach(input => {
            input.classList.remove('is-invalid');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDanTampilkanData();

    // --- INISIALISASI MODAL ---
    const modalTambah = document.getElementById('modal-tambah');
    const modalEdit = document.getElementById('modal-edit');
    const modalKonfirmasiEdit = document.getElementById('modal-konfirmasi-edit');
    const modalHapus = document.getElementById('modal-hapus');
    const modalKategori = document.getElementById('modal-kategori');
    const modalEditKategori = document.getElementById('modal-edit-kategori');
    const modalPindahKategori = document.getElementById('modal-pindah-kategori');

    const formTambah = document.getElementById('form-tambah-barang');
    const formEdit = document.getElementById('form-edit-barang');
    const formHapus = document.getElementById('form-hapus-barang');
    const formKategori = document.getElementById('form-tambah-kategori');
    const formEditKategoriModal = document.getElementById('form-edit-kategori-modal');
    const formPindahKategori = document.getElementById('form-pindah-kategori');

    const inputKonfirmasiKode = document.getElementById('input-konfirmasi-kode');
    const inputNamaKategori = document.getElementById('input-nama-kategori');
    const btnKonfirmasiHapus = document.getElementById('btn-konfirmasi-hapus');
    const btnYaSimpanEdit = document.getElementById('btn-ya-simpan-edit');

    let barangAkanDihapus = null;
    let barangSedangDiedit = null;
    let dataUpdatePending = null;

    const bukaModalTambah = () => {
        formTambah.reset();
        hideFormError('tambah-error', formTambah);
        modalTambah.style.display = 'flex';
        document.getElementById('input-kode').focus();
    };

    const tutupModalTambah = () => {
        modalTambah.style.display = 'none';
        hideFormError('tambah-error', formTambah);
    };

    const tutupModalEdit = () => {
        modalEdit.style.display = 'none';
        barangSedangDiedit = null;
        dataUpdatePending = null;
        hideFormError('edit-error', formEdit);
    };

    const bukaModalKategori = () => {
        if (formKategori) formKategori.reset();
        hideFormError('kategori-error', formKategori);
        renderCategoryTable();
        if (modalKategori) {
            modalKategori.style.display = 'flex';
            if (inputNamaKategori) inputNamaKategori.focus();
        }
    };

    const tutupModalKategoriHandler = () => {
        if (modalKategori) modalKategori.style.display = 'none';
        hideFormError('kategori-error', formKategori);
    };

    const bukaModalEditKategori = (id, namaLama, count) => {
        document.getElementById('edit-cat-id').value = id;
        document.getElementById('edit-cat-nama-lama').value = namaLama;
        const inputNama = document.getElementById('edit-cat-input-nama');
        inputNama.value = namaLama;
        document.getElementById('edit-cat-hint').textContent = `Mengubah nama kategori akan otomatis memperbarui ${count || 0} barang yang terkait.`;
        hideFormError('edit-cat-error', formEditKategoriModal);
        if (modalEditKategori) {
            modalEditKategori.style.display = 'flex';
            inputNama.focus();
            inputNama.select();
        }
    };

    const tutupModalEditKategori = () => {
        if (modalEditKategori) modalEditKategori.style.display = 'none';
        hideFormError('edit-cat-error', formEditKategoriModal);
    };

    const bukaModalPindahKategori = (namaAsal, count) => {
        document.getElementById('pindah-cat-asal').value = namaAsal;
        document.getElementById('pindah-label-asal').textContent = namaAsal;
        document.getElementById('pindah-label-count').textContent = `${count || 0} barang`;

        const selectTujuan = document.getElementById('pindah-select-tujuan');
        selectTujuan.innerHTML = '<option value="">-- Pilih Kategori Tujuan --</option>';

        // Opsi tujuan hanya kategori aktif dan bukan kategori asal itu sendiri
        const kategoriTujuanList = globalDataKategori.filter(k => !k.is_deleted && k.nama_kategori !== namaAsal);
        kategoriTujuanList.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k.nama_kategori;
            opt.textContent = `${k.nama_kategori} (${k.jumlah_barang || 0} barang)`;
            selectTujuan.appendChild(opt);
        });

        hideFormError('pindah-cat-error', formPindahKategori);
        if (modalPindahKategori) {
            modalPindahKategori.style.display = 'flex';
            selectTujuan.focus();
        }
    };

    const tutupModalPindahKategori = () => {
        if (modalPindahKategori) modalPindahKategori.style.display = 'none';
        hideFormError('pindah-cat-error', formPindahKategori);
    };

    const bukaModalKonfirmasiEdit = (idLama, dataUpdate, barangAsli) => {
        dataUpdatePending = { idLama, dataUpdate };
        document.getElementById('konfirm-label-kode').textContent = dataUpdate.id_barang;
        document.getElementById('konfirm-label-nama').textContent = dataUpdate.nama;

        const diffContainer = document.getElementById('konfirm-diff-container');
        diffContainer.innerHTML = '';

        const hargaBerubah = Number(barangAsli.harga) !== Number(dataUpdate.harga);
        const stokBerubah = Number(barangAsli.stok) !== Number(dataUpdate.stok);

        if (hargaBerubah) {
            const diffHarga = document.createElement('div');
            diffHarga.className = 'diff-card';
            diffHarga.innerHTML = `
                <div class="diff-header"><i class="fa-solid fa-money-bill-wave"></i> Perubahan Harga Satuan</div>
                <div class="diff-body">
                    <div class="diff-col old-val">
                        <span class="diff-tag">Harga Semula</span>
                        <span class="diff-val">Rp ${Number(barangAsli.harga).toLocaleString('id-ID')}</span>
                    </div>
                    <div class="diff-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                    <div class="diff-col new-val">
                        <span class="diff-tag">Harga Baru</span>
                        <span class="diff-val">Rp ${Number(dataUpdate.harga).toLocaleString('id-ID')}</span>
                    </div>
                </div>
            `;
            diffContainer.appendChild(diffHarga);
        }

        if (stokBerubah) {
            const diffStok = document.createElement('div');
            diffStok.className = 'diff-card';
            diffStok.innerHTML = `
                <div class="diff-header"><i class="fa-solid fa-layer-group"></i> Perubahan Jumlah Stok</div>
                <div class="diff-body">
                    <div class="diff-col old-val">
                        <span class="diff-tag">Stok Semula</span>
                        <span class="diff-val">${barangAsli.stok} ${barangAsli.satuan || ''}</span>
                    </div>
                    <div class="diff-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                    <div class="diff-col new-val">
                        <span class="diff-tag">Stok Baru</span>
                        <span class="diff-val">${dataUpdate.stok} ${dataUpdate.satuan || ''}</span>
                    </div>
                </div>
            `;
            diffContainer.appendChild(diffStok);
        }

        modalKonfirmasiEdit.style.display = 'flex';
    };

    const tutupModalKonfirmasiEdit = () => {
        if (modalKonfirmasiEdit) modalKonfirmasiEdit.style.display = 'none';
        dataUpdatePending = null;
    };

    const bukaModalHapus = (barang) => {
        barangAkanDihapus = barang;
        document.getElementById('hapus-kode-target').value = barang.id_barang;
        document.getElementById('hapus-label-kode').textContent = barang.id_barang;
        document.getElementById('hapus-label-nama').textContent = barang.nama;
        document.getElementById('hapus-instruksi-kode').textContent = barang.id_barang;
        inputKonfirmasiKode.value = '';
        btnKonfirmasiHapus.disabled = true;
        hideFormError('hapus-error', formHapus);
        modalHapus.style.display = 'flex';
        inputKonfirmasiKode.focus();
    };

    const tutupModalHapus = () => {
        modalHapus.style.display = 'none';
        barangAkanDihapus = null;
        inputKonfirmasiKode.value = '';
        btnKonfirmasiHapus.disabled = true;
        hideFormError('hapus-error', formHapus);
    };

    // Tombol Buka & Tutup Modal Tambah Barang
    document.getElementById('btn-tambah').addEventListener('click', bukaModalTambah);
    document.getElementById('tutup-modal').addEventListener('click', tutupModalTambah);
    document.getElementById('batal-tambah').addEventListener('click', tutupModalTambah);

    // Tombol Buka & Tutup Modal Kelola Kategori
    const btnTambahKategori = document.getElementById('btn-tambah-kategori');
    if (btnTambahKategori) btnTambahKategori.addEventListener('click', bukaModalKategori);
    const tutupModalKat = document.getElementById('tutup-modal-kategori');
    if (tutupModalKat) tutupModalKat.addEventListener('click', tutupModalKategoriHandler);
    const batalKat = document.getElementById('batal-kategori');
    if (batalKat) batalKat.addEventListener('click', tutupModalKategoriHandler);

    // Tombol Tutup Modal Edit Kategori
    const tutupModalEditKat = document.getElementById('tutup-modal-edit-kategori');
    if (tutupModalEditKat) tutupModalEditKat.addEventListener('click', tutupModalEditKategori);
    const batalEditKat = document.getElementById('batal-edit-kategori');
    if (batalEditKat) batalEditKat.addEventListener('click', tutupModalEditKategori);

    // Tombol Tutup Modal Pindah Kategori
    const tutupModalPindahKat = document.getElementById('tutup-modal-pindah-kategori');
    if (tutupModalPindahKat) tutupModalPindahKat.addEventListener('click', tutupModalPindahKategori);
    const batalPindahKat = document.getElementById('batal-pindah-kategori');
    if (batalPindahKat) batalPindahKat.addEventListener('click', tutupModalPindahKategori);

    // Tombol Tutup Modal Edit Barang
    document.getElementById('tutup-modal-edit').addEventListener('click', tutupModalEdit);
    document.getElementById('batal-edit').addEventListener('click', tutupModalEdit);

    // Tombol Tutup & Konfirmasi Modal Konfirmasi Edit Barang
    if (document.getElementById('tutup-modal-konfirmasi-edit')) {
        document.getElementById('tutup-modal-konfirmasi-edit').addEventListener('click', tutupModalKonfirmasiEdit);
    }
    if (document.getElementById('batal-konfirmasi-edit')) {
        document.getElementById('batal-konfirmasi-edit').addEventListener('click', tutupModalKonfirmasiEdit);
    }
    if (btnYaSimpanEdit) {
        btnYaSimpanEdit.addEventListener('click', async () => {
            if (!dataUpdatePending) return;
            const { idLama, dataUpdate } = dataUpdatePending;
            btnYaSimpanEdit.disabled = true;

            const hasil = await editDataBarang(idLama, dataUpdate);
            btnYaSimpanEdit.disabled = false;

            if (hasil.sukses) {
                showToast(hasil.message || 'Data barang berhasil diperbarui!', 'success');
                tutupModalKonfirmasiEdit();
                tutupModalEdit();
                loadDanTampilkanData();
            } else {
                tutupModalKonfirmasiEdit();
                showFormError('edit-error', hasil.message || 'Gagal memperbarui data barang.');
            }
        });
    }

    // Tombol Tutup Modal Hapus
    document.getElementById('tutup-modal-hapus').addEventListener('click', tutupModalHapus);
    document.getElementById('batal-hapus').addEventListener('click', tutupModalHapus);

    // Tutup modal jika klik di luar area konten (backdrop)
    window.addEventListener('click', (e) => {
        if (e.target === modalEditKategori) tutupModalEditKategori();
        if (e.target === modalPindahKategori) tutupModalPindahKategori();
        if (e.target === modalKonfirmasiEdit) tutupModalKonfirmasiEdit();
        if (e.target === modalTambah) tutupModalTambah();
        if (e.target === modalEdit) tutupModalEdit();
        if (e.target === modalHapus) tutupModalHapus();
        if (e.target === modalKategori) tutupModalKategoriHandler();

        // Tutup menu dropdown expor jika klik di luar dropdown wrapper
        if (!e.target.closest('.export-dropdown-wrapper')) {
            tutupExportMenu();
        }
    });

    // Tutup modal dengan tombol keyboard Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            tutupExportMenu();
            if (modalEditKategori && modalEditKategori.style.display === 'flex') {
                tutupModalEditKategori();
                return;
            }
            if (modalPindahKategori && modalPindahKategori.style.display === 'flex') {
                tutupModalPindahKategori();
                return;
            }
            if (modalKonfirmasiEdit && modalKonfirmasiEdit.style.display === 'flex') {
                tutupModalKonfirmasiEdit();
                return;
            }
            if (modalKategori && modalKategori.style.display === 'flex') {
                tutupModalKategoriHandler();
                return;
            }
            if (modalTambah.style.display === 'flex') tutupModalTambah();
            if (modalEdit.style.display === 'flex') tutupModalEdit();
            if (modalHapus.style.display === 'flex') tutupModalHapus();
        }
    });

    // Bersihkan pesan error saat user mengetik atau memilih opsi pada form
    formTambah.querySelectorAll('input, select').forEach(input => {
        const eventType = input.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
            input.classList.remove('is-invalid');
            const errorBox = document.getElementById('tambah-error');
            if (errorBox && errorBox.style.display !== 'none') {
                hideFormError('tambah-error', formTambah);
            }
        });
    });

    formEdit.querySelectorAll('input, select').forEach(input => {
        const eventType = input.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
            input.classList.remove('is-invalid');
            const errorBox = document.getElementById('edit-error');
            if (errorBox && errorBox.style.display !== 'none') {
                hideFormError('edit-error', formEdit);
            }
        });
    });

    if (inputNamaKategori) {
        inputNamaKategori.addEventListener('input', () => {
            inputNamaKategori.classList.remove('is-invalid');
            const errorBox = document.getElementById('kategori-error');
            if (errorBox && errorBox.style.display !== 'none') {
                hideFormError('kategori-error', formKategori);
            }
        });
    }

    const editCatInputNama = document.getElementById('edit-cat-input-nama');
    if (editCatInputNama) {
        editCatInputNama.addEventListener('input', () => {
            editCatInputNama.classList.remove('is-invalid');
            hideFormError('edit-cat-error', formEditKategoriModal);
        });
    }

    const selectPindahTujuan = document.getElementById('pindah-select-tujuan');
    if (selectPindahTujuan) {
        selectPindahTujuan.addEventListener('change', () => {
            selectPindahTujuan.classList.remove('is-invalid');
            hideFormError('pindah-cat-error', formPindahKategori);
        });
    }

    // Validasi real-time input kode barang pada modal konfirmasi hapus
    inputKonfirmasiKode.addEventListener('input', () => {
        inputKonfirmasiKode.classList.remove('is-invalid');
        const errorBox = document.getElementById('hapus-error');
        if (errorBox && errorBox.style.display !== 'none') {
            hideFormError('hapus-error', formHapus);
        }

        const kodeYangDimasukkan = inputKonfirmasiKode.value.trim();
        const isMatch = barangAkanDihapus && (kodeYangDimasukkan === barangAkanDihapus.id_barang);
        btnKonfirmasiHapus.disabled = !isMatch;
    });

    // --- PROSES SUBMIT TAMBAH KATEGORI ---
    if (formKategori) {
        formKategori.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideFormError('kategori-error', formKategori);

            const namaKategori = inputNamaKategori ? inputNamaKategori.value.trim() : '';

            if (!namaKategori) {
                if (inputNamaKategori) inputNamaKategori.classList.add('is-invalid');
                showFormError('kategori-error', 'Nama kategori tidak boleh kosong!');
                return;
            }

            const hasil = await tambahDataKategori(namaKategori);
            if (hasil.sukses) {
                showToast(hasil.message || 'Kategori berhasil ditambahkan!', 'success');
                formKategori.reset();
                await loadDanTampilkanData();
                renderCategoryTable();
                
                // Jika modal tambah barang sedang terbuka, set dropdown langsung ke kategori yang baru dibuat
                const selectTambah = document.getElementById('input-kategori');
                if (selectTambah) selectTambah.value = namaKategori;
            } else {
                if (inputNamaKategori) inputNamaKategori.classList.add('is-invalid');
                showFormError('kategori-error', hasil.message || 'Gagal menambahkan kategori.');
            }
        });
    }

    // --- PROSES SUBMIT EDIT NAMA KATEGORI ---
    if (formEditKategoriModal) {
        formEditKategoriModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideFormError('edit-cat-error', formEditKategoriModal);

            const id = document.getElementById('edit-cat-id').value;
            const namaLama = document.getElementById('edit-cat-nama-lama').value;
            const inputNama = document.getElementById('edit-cat-input-nama');
            const namaBaru = inputNama ? inputNama.value.trim() : '';

            if (!namaBaru) {
                if (inputNama) inputNama.classList.add('is-invalid');
                showFormError('edit-cat-error', 'Nama kategori baru tidak boleh kosong!');
                return;
            }

            if (namaBaru.toLowerCase() === namaLama.toLowerCase()) {
                tutupModalEditKategori();
                return;
            }

            const hasil = await editDataKategori(id, namaBaru);
            if (hasil.sukses) {
                showToast(hasil.message || 'Kategori berhasil diperbarui!', 'success');
                tutupModalEditKategori();
                await loadDanTampilkanData();
                renderCategoryTable();
            } else {
                if (inputNama) inputNama.classList.add('is-invalid');
                showFormError('edit-cat-error', hasil.message || 'Gagal mengubah kategori.');
            }
        });
    }

    // --- PROSES SUBMIT PEMINDAHAN KATEGORI ---
    if (formPindahKategori) {
        formPindahKategori.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideFormError('pindah-cat-error', formPindahKategori);

            const asal = document.getElementById('pindah-cat-asal').value;
            const selectTujuan = document.getElementById('pindah-select-tujuan');
            const tujuan = selectTujuan ? selectTujuan.value : '';
            const nonaktifkanAsal = document.getElementById('pindah-check-nonaktif').checked;

            if (!tujuan) {
                if (selectTujuan) selectTujuan.classList.add('is-invalid');
                showFormError('pindah-cat-error', 'Harap pilih kategori tujuan pemindahan!');
                return;
            }

            const hasil = await pindahkanDataKategori(asal, tujuan, nonaktifkanAsal);
            if (hasil.sukses) {
                showToast(hasil.message || 'Barang berhasil dipindahkan ke kategori baru!', 'success');
                tutupModalPindahKategori();
                await loadDanTampilkanData();
                renderCategoryTable();
            } else {
                showFormError('pindah-cat-error', hasil.message || 'Gagal memindahkan kategori.');
            }
        });
    }

    // --- FITUR KLIK AKSI PADA TABEL KELOLA KATEGORI ---
    const tabelKategoriBody = document.getElementById('tabel-kategori-body');
    if (tabelKategoriBody) {
        tabelKategoriBody.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const nama = btn.getAttribute('data-nama');
            const count = Number(btn.getAttribute('data-count') || 0);

            // Edit Nama Kategori
            if (btn.classList.contains('btn-edit-cat')) {
                bukaModalEditKategori(id, nama, count);
            }

            // Pindahkan Kategori
            if (btn.classList.contains('btn-pindah-cat')) {
                bukaModalPindahKategori(nama, count);
            }

            // Nonaktifkan Kategori (Soft Delete)
            if (btn.classList.contains('btn-delete-cat')) {
                let pesanKonfirmasi = `Apakah Anda yakin ingin menonaktifkan kategori "${nama}"?`;
                if (count > 0) {
                    pesanKonfirmasi = `Kategori "${nama}" memiliki ${count} barang aktif. Kategori ini akan dinonaktifkan dari pilihan barang baru. Lanjutkan?`;
                }
                if (confirm(pesanKonfirmasi)) {
                    const hasil = await hapusDataKategori(id);
                    if (hasil.sukses) {
                        showToast(hasil.message || 'Kategori berhasil dinonaktifkan!', 'success');
                        await loadDanTampilkanData();
                        renderCategoryTable();
                    } else {
                        showToast(hasil.message || 'Gagal menonaktifkan kategori.', 'error');
                    }
                }
            }

            // Aktifkan Kembali Kategori
            if (btn.classList.contains('btn-restore-cat')) {
                const hasil = await aktifkanDataKategori(id);
                if (hasil.sukses) {
                    showToast(hasil.message || 'Kategori berhasil diaktifkan kembali!', 'success');
                    await loadDanTampilkanData();
                    renderCategoryTable();
                } else {
                    showToast(hasil.message || 'Gagal mengaktifkan kategori.', 'error');
                }
            }
        });
    }

    // --- PROSES SUBMIT TAMBAH BARANG ---
    formTambah.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormError('tambah-error', formTambah);

        const kode = document.getElementById('input-kode').value.trim();
        const nama = document.getElementById('input-nama').value.trim();
        const kategori = document.getElementById('input-kategori').value.trim();
        const hargaRaw = document.getElementById('input-harga').value.trim();
        const satuan = document.getElementById('input-satuan').value.trim();
        const stokRaw = document.getElementById('input-stok').value.trim();
        const batasRaw = document.getElementById('input-batas').value.trim();

        // Validasi Field Kosong
        let fieldKosong = false;
        const requiredInputs = [
            { el: document.getElementById('input-kode'), val: kode },
            { el: document.getElementById('input-nama'), val: nama },
            { el: document.getElementById('input-kategori'), val: kategori },
            { el: document.getElementById('input-harga'), val: hargaRaw },
            { el: document.getElementById('input-satuan'), val: satuan },
            { el: document.getElementById('input-stok'), val: stokRaw },
            { el: document.getElementById('input-batas'), val: batasRaw }
        ];

        requiredInputs.forEach(item => {
            if (!item.val) {
                item.el.classList.add('is-invalid');
                fieldKosong = true;
            }
        });

        if (fieldKosong) {
            showFormError('tambah-error', 'Harap isi semua kolom formulir yang wajib diisi!');
            return;
        }

        const harga = Number(hargaRaw);
        const stok = Number(stokRaw);
        const batas = Number(batasRaw);

        // Validasi Angka Negatif
        if (harga < 0 || stok < 0 || batas < 0) {
            if (harga < 0) document.getElementById('input-harga').classList.add('is-invalid');
            if (stok < 0) document.getElementById('input-stok').classList.add('is-invalid');
            if (batas < 0) document.getElementById('input-batas').classList.add('is-invalid');
            showFormError('tambah-error', 'Harga, stok, dan batas minimum tidak boleh bernilai negatif!');
            return;
        }

        // Validasi Keunikan Nama Barang
        const namaSudahAda = (globalDataBarang || []).some(b => !b.is_deleted && b.nama.trim().toLowerCase() === nama.toLowerCase() && b.id_barang !== kode);
        if (namaSudahAda) {
            document.getElementById('input-nama').classList.add('is-invalid');
            showFormError('tambah-error', `Nama Barang "${nama}" sudah terdaftar! Nama barang wajib unik.`);
            return;
        }

        const barangBaru = {
            id_barang: kode,
            nama: nama,
            kategori: kategori,
            harga: harga,
            satuan: satuan,
            stok: stok,
            batas_minimum: batas
        };

        const hasil = await tambahDataBarang(barangBaru);
        if (hasil.sukses) {
            showToast(hasil.message || 'Barang berhasil ditambahkan!', 'success');
            tutupModalTambah();
            loadDanTampilkanData();
        } else {
            showFormError('tambah-error', hasil.message || 'Gagal menambahkan data barang.');
        }
    });

    // --- PROSES SUBMIT EDIT BARANG ---
    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormError('edit-error', formEdit);

        const idLama = document.getElementById('edit-kode-lama').value;
        const kode = document.getElementById('edit-kode').value.trim();
        const nama = document.getElementById('edit-nama').value.trim();
        const kategori = document.getElementById('edit-kategori').value.trim();
        const hargaRaw = document.getElementById('edit-harga').value.trim();
        const satuan = document.getElementById('edit-satuan').value.trim();
        const stokRaw = document.getElementById('edit-stok').value.trim();
        const batasRaw = document.getElementById('edit-batas').value.trim();

        // Validasi Field Kosong
        let fieldKosong = false;
        const requiredInputs = [
            { el: document.getElementById('edit-kode'), val: kode },
            { el: document.getElementById('edit-nama'), val: nama },
            { el: document.getElementById('edit-kategori'), val: kategori },
            { el: document.getElementById('edit-harga'), val: hargaRaw },
            { el: document.getElementById('edit-satuan'), val: satuan },
            { el: document.getElementById('edit-stok'), val: stokRaw },
            { el: document.getElementById('edit-batas'), val: batasRaw }
        ];

        requiredInputs.forEach(item => {
            if (!item.val) {
                item.el.classList.add('is-invalid');
                fieldKosong = true;
            }
        });

        if (fieldKosong) {
            showFormError('edit-error', 'Harap isi semua kolom formulir yang wajib diisi!');
            return;
        }

        const harga = Number(hargaRaw);
        const stok = Number(stokRaw);
        const batas = Number(batasRaw);

        // Validasi Angka Negatif
        if (harga < 0 || stok < 0 || batas < 0) {
            if (harga < 0) document.getElementById('edit-harga').classList.add('is-invalid');
            if (stok < 0) document.getElementById('edit-stok').classList.add('is-invalid');
            if (batas < 0) document.getElementById('edit-batas').classList.add('is-invalid');
            showFormError('edit-error', 'Harga, stok, dan batas minimum tidak boleh bernilai negatif!');
            return;
        }

        // Validasi Keunikan Nama Barang pada Barang Lain
        const namaSudahAda = (globalDataBarang || []).some(b => !b.is_deleted && b.id_barang !== idLama && b.id_barang !== kode && b.nama.trim().toLowerCase() === nama.toLowerCase());
        if (namaSudahAda) {
            document.getElementById('edit-nama').classList.add('is-invalid');
            showFormError('edit-error', `Nama Barang "${nama}" sudah terdaftar pada barang lain! Nama barang wajib unik.`);
            return;
        }

        const dataUpdate = {
            id_barang: kode,
            nama: nama,
            kategori: kategori,
            harga: harga,
            satuan: satuan,
            stok: stok,
            batas_minimum: batas
        };

        // Cek apakah harga atau stok mengalami perubahan dibanding data asli
        const hargaBerubah = barangSedangDiedit && Number(barangSedangDiedit.harga) !== harga;
        const stokBerubah = barangSedangDiedit && Number(barangSedangDiedit.stok) !== stok;

        if (hargaBerubah || stokBerubah) {
            bukaModalKonfirmasiEdit(idLama, dataUpdate, barangSedangDiedit);
            return;
        }

        // Jika harga dan stok tidak berubah, langsung simpan perubahan
        const hasil = await editDataBarang(idLama, dataUpdate);
        if (hasil.sukses) {
            showToast(hasil.message || 'Data barang berhasil diperbarui!', 'success');
            tutupModalEdit();
            loadDanTampilkanData();
        } else {
            showFormError('edit-error', hasil.message || 'Gagal memperbarui data barang.');
        }
    });

    // --- PROSES SUBMIT HAPUS BARANG (KONFIRMASI KODE) ---
    formHapus.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormError('hapus-error', formHapus);

        if (!barangAkanDihapus) return;

        const kodeDimasukkan = inputKonfirmasiKode.value.trim();
        if (kodeDimasukkan !== barangAkanDihapus.id_barang) {
            inputKonfirmasiKode.classList.add('is-invalid');
            showFormError('hapus-error', `Kode barang tidak cocok. Harap ketik "${barangAkanDihapus.id_barang}" dengan benar.`);
            return;
        }

        btnKonfirmasiHapus.disabled = true;
        const hasil = await hapusDataBarang(barangAkanDihapus.id_barang);
        if (hasil.sukses) {
            showToast(hasil.message || 'Barang berhasil dihapus!', 'success');
            tutupModalHapus();
            loadDanTampilkanData();
        } else {
            showFormError('hapus-error', hasil.message || 'Gagal menonaktifkan data barang.');
            btnKonfirmasiHapus.disabled = false;
        }
    });

    // --- FITUR ADVANCED FILTERING TOGGLE & RESET ---
    const btnToggleFilter = document.getElementById('btn-toggle-advanced-filter');
    const panelFilter = document.getElementById('panel-advanced-filter');
    const btnResetFilter = document.getElementById('btn-reset-filter');

    if (btnToggleFilter && panelFilter) {
        btnToggleFilter.addEventListener('click', () => {
            const isHidden = panelFilter.style.display === 'none' || panelFilter.style.display === '';
            panelFilter.style.display = isHidden ? 'block' : 'none';
            btnToggleFilter.classList.toggle('active', isHidden);
        });
    }

    if (btnResetFilter) {
        btnResetFilter.addEventListener('click', () => {
            // Reset pills ke status 'semua'
            globalFilterBarang = 'semua';
            const filterContainer = document.getElementById('filter-status-barang');
            if (filterContainer) {
                filterContainer.querySelectorAll('.filter-pill').forEach(p => {
                    if (p.getAttribute('data-filter') === 'semua') {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            }

            // Reset select kategori & kondisi stok
            const selectKategori = document.getElementById('filter-kategori-barang');
            if (selectKategori) selectKategori.value = 'semua';

            const selectKondisi = document.getElementById('filter-kondisi-stok');
            if (selectKondisi) selectKondisi.value = 'semua';

            // Reset input rentang stok
            const stokMin = document.getElementById('filter-stok-min');
            if (stokMin) stokMin.value = '';
            const stokMax = document.getElementById('filter-stok-max');
            if (stokMax) stokMax.value = '';

            // Reset input rentang harga
            const hargaMin = document.getElementById('filter-harga-min');
            if (hargaMin) hargaMin.value = '';
            const hargaMax = document.getElementById('filter-harga-max');
            if (hargaMax) hargaMax.value = '';

            // Reset search box jika perlu (opsional, render ulang)
            updateActiveFilterBadge();
            renderTabelBarang();
        });
    }

    // --- FITUR FILTER STATUS BARANG (SEMUA / AKTIF / NONAKTIF) ---
    const filterContainer = document.getElementById('filter-status-barang');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-pill');
            if (!btn) return;

            filterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');

            globalFilterBarang = btn.getAttribute('data-filter') || 'semua';
            updateActiveFilterBadge();
            renderTabelBarang();
        });
    }

    // Event listeners untuk filter kategori, kondisi stok, rentang stok & harga
    const selectFilterKategori = document.getElementById('filter-kategori-barang');
    if (selectFilterKategori) {
        selectFilterKategori.addEventListener('change', () => {
            updateActiveFilterBadge();
            renderTabelBarang();
        });
    }

    const selectFilterKondisi = document.getElementById('filter-kondisi-stok');
    if (selectFilterKondisi) {
        selectFilterKondisi.addEventListener('change', () => {
            updateActiveFilterBadge();
            renderTabelBarang();
        });
    }

    const inputStokMin = document.getElementById('filter-stok-min');
    const inputStokMax = document.getElementById('filter-stok-max');
    if (inputStokMin) inputStokMin.addEventListener('input', () => { updateActiveFilterBadge(); renderTabelBarang(); });
    if (inputStokMax) inputStokMax.addEventListener('input', () => { updateActiveFilterBadge(); renderTabelBarang(); });

    const inputHargaMin = document.getElementById('filter-harga-min');
    const inputHargaMax = document.getElementById('filter-harga-max');
    if (inputHargaMin) inputHargaMin.addEventListener('input', () => { updateActiveFilterBadge(); renderTabelBarang(); });
    if (inputHargaMax) inputHargaMax.addEventListener('input', () => { updateActiveFilterBadge(); renderTabelBarang(); });

    // --- FITUR PENCARIAN (SEARCH) ---
    document.getElementById('input-pencarian').addEventListener('input', () => {
        renderTabelBarang();
    });

    // --- FITUR DROPDOWN & AKSI EXPOR DATA BARANG (PDF / CSV) ---
    const btnExportDropdown = document.getElementById('btn-export-dropdown');
    const menuExportDropdown = document.getElementById('export-menu-dropdown');
    const chevronExportIcon = document.getElementById('chevron-export-icon');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportCsv = document.getElementById('btn-export-csv');

    function tutupExportMenu() {
        if (menuExportDropdown) menuExportDropdown.style.display = 'none';
        if (chevronExportIcon) chevronExportIcon.style.transform = 'rotate(0deg)';
    }

    if (btnExportDropdown && menuExportDropdown) {
        btnExportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menuExportDropdown.style.display === 'none' || menuExportDropdown.style.display === '';
            menuExportDropdown.style.display = isHidden ? 'block' : 'none';
            if (chevronExportIcon) {
                chevronExportIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }

    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            tutupExportMenu();
            exportDataBarangPDF();
        });
    }

    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            tutupExportMenu();
            exportDataBarangCSV();
        });
    }

    // --- FITUR KLIK TOMBOL EDIT, NONAKTIFKAN, DAN AKTIFKAN PADA TABEL BARANG ---
    document.getElementById('tabel-barang-body').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const idBarang = btn.getAttribute('data-id');
        const barang = globalDataBarang.find(b => b.id_barang === idBarang);
        if (!barang) return;

        // Jika tombol NONAKTIFKAN (HAPUS) diklik
        if (btn.classList.contains('btn-hapus')) {
            bukaModalHapus(barang);
        }

        // Jika tombol AKTIFKAN KEMBALI diklik
        if (btn.classList.contains('btn-restore-barang')) {
            const hasil = await aktifkanDataBarang(idBarang);
            if (hasil.sukses) {
                showToast(hasil.message || 'Barang berhasil diaktifkan kembali!', 'success');
                loadDanTampilkanData();
            } else {
                showToast(hasil.message || 'Gagal mengaktifkan barang.', 'error');
            }
        }

        // Jika tombol EDIT diklik
        if (btn.classList.contains('btn-edit')) {
            hideFormError('edit-error', formEdit);
            barangSedangDiedit = { ...barang };

            // Isi formulir dengan data barang yang dipilih
            document.getElementById('edit-kode-lama').value = barang.id_barang;
            document.getElementById('edit-kode').value = barang.id_barang;
            document.getElementById('edit-nama').value = barang.nama;

            // Set kategori di dropdown edit
            const selectEdit = document.getElementById('edit-kategori');
            if (selectEdit) {
                let found = false;
                for (let i = 0; i < selectEdit.options.length; i++) {
                    if (selectEdit.options[i].value === barang.kategori) {
                        found = true;
                        break;
                    }
                }
                if (!found && barang.kategori) {
                    const opt = document.createElement('option');
                    opt.value = barang.kategori;
                    opt.textContent = barang.kategori;
                    selectEdit.appendChild(opt);
                }
                selectEdit.value = barang.kategori;
            }

            document.getElementById('edit-harga').value = barang.harga;
            document.getElementById('edit-satuan').value = barang.satuan;
            document.getElementById('edit-stok').value = barang.stok;
            document.getElementById('edit-batas').value = barang.batas_minimum;

            modalEdit.style.display = 'flex';
            document.getElementById('edit-nama').focus();
        }
    });
});

// --- FUNGSI-FUNGSI PENDUKUNG ---
async function loadDanTampilkanData() {
    const data = await fetchData();
    if (data) {
        // Simpan & perbarui kategori
        if (data.kategori) {
            globalDataKategori = data.kategori;
            updateDropdownKategori(globalDataKategori);
        }

        // Simpan & render barang
        if (data.barang) {
            globalDataBarang = data.barang;
            
            // Hitung data barang yang aktif untuk dashboard & transaksi
            const barangAktif = data.barang.filter(item => !item.is_deleted);

            renderTabelBarang();

            // Update dropdown pada halaman transaksi hanya untuk barang aktif
            if (typeof updateDropdownBarang === 'function') {
                updateDropdownBarang(barangAktif);
            }
        }

        if (typeof renderTabelRiwayat === 'function' && data.riwayat) {
            renderTabelRiwayat(data.riwayat);
        }

        // Render Dashboard Visual & Analytics
        if (typeof renderDashboard === 'function') {
            renderDashboard(data.barang || [], data.riwayat || [], data.kategori || []);
        } else if (data.barang) {
            const barangAktif = data.barang.filter(item => !item.is_deleted);
            updateDashboard(barangAktif);
        }
    }
}

function updateDropdownKategori(kategoriList) {
    const selectTambah = document.getElementById('input-kategori');
    const selectEdit = document.getElementById('edit-kategori');
    const selectFilter = document.getElementById('filter-kategori-barang');
    const list = kategoriList || globalDataKategori || [];

    // Opsi untuk tambah & edit barang: hanya kategori yang aktif (!is_deleted)
    const activeList = list.filter(k => !k.is_deleted);

    const valTambah = selectTambah ? selectTambah.value : '';
    const valEdit = selectEdit ? selectEdit.value : '';
    const valFilter = selectFilter ? selectFilter.value : 'semua';

    if (selectTambah) {
        selectTambah.innerHTML = '<option value="">-- Pilih Kategori --</option>';
        activeList.forEach(kat => {
            const opt = document.createElement('option');
            opt.value = kat.nama_kategori;
            opt.textContent = kat.nama_kategori;
            selectTambah.appendChild(opt);
        });
        if (valTambah) selectTambah.value = valTambah;
    }

    if (selectEdit) {
        selectEdit.innerHTML = '<option value="">-- Pilih Kategori --</option>';
        activeList.forEach(kat => {
            const opt = document.createElement('option');
            opt.value = kat.nama_kategori;
            opt.textContent = kat.nama_kategori;
            selectEdit.appendChild(opt);
        });
        if (valEdit) selectEdit.value = valEdit;
    }

    if (selectFilter) {
        selectFilter.innerHTML = '<option value="semua">Semua Kategori</option>';
        // Dapatkan semua daftar nama kategori unik dari master kategori & barang yang ada
        const namaKategoriSet = new Set();
        list.forEach(k => namaKategoriSet.add(k.nama_kategori));
        (globalDataBarang || []).forEach(b => {
            if (b.kategori) namaKategoriSet.add(b.kategori);
        });

        namaKategoriSet.forEach(namaKat => {
            const opt = document.createElement('option');
            opt.value = namaKat;
            opt.textContent = namaKat;
            selectFilter.appendChild(opt);
        });

        if (valFilter && Array.from(selectFilter.options).some(o => o.value === valFilter)) {
            selectFilter.value = valFilter;
        }
    }

    renderCategoryTable();
}

function updateActiveFilterBadge() {
    let count = 0;
    if (globalFilterBarang !== 'semua') count++;

    const selectKategori = document.getElementById('filter-kategori-barang');
    if (selectKategori && selectKategori.value !== 'semua') count++;

    const selectKondisi = document.getElementById('filter-kondisi-stok');
    if (selectKondisi && selectKondisi.value !== 'semua') count++;

    const stokMin = document.getElementById('filter-stok-min');
    const stokMax = document.getElementById('filter-stok-max');
    if (stokMin && stokMin.value.trim() !== '') count++;
    if (stokMax && stokMax.value.trim() !== '') count++;

    const hargaMin = document.getElementById('filter-harga-min');
    const hargaMax = document.getElementById('filter-harga-max');
    if (hargaMin && hargaMin.value.trim() !== '') count++;
    if (hargaMax && hargaMax.value.trim() !== '') count++;

    const badge = document.getElementById('badge-filter-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderCategoryTable() {
    const tbody = document.getElementById('tabel-kategori-body');
    const countBadge = document.getElementById('total-kategori-count');
    if (!tbody) return;

    tbody.innerHTML = '';
    const list = globalDataKategori || [];

    if (countBadge) {
        const totalAktif = list.filter(k => !k.is_deleted).length;
        countBadge.textContent = `${totalAktif} Aktif / ${list.length} Total`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">Belum ada kategori yang terdaftar.</td></tr>`;
        return;
    }

    list.forEach(kat => {
        const isDeleted = Boolean(kat.is_deleted);
        const count = Number(kat.jumlah_barang || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="category-name-cell ${isDeleted ? 'deleted' : ''}">
                    <i class="fa-solid fa-tag" style="color: ${isDeleted ? '#94a3b8' : '#e67e22'}; font-size: 11px;"></i>
                    <span>${kat.nama_kategori}</span>
                </div>
            </td>
            <td>
                <span class="badge-item-count ${count === 0 ? 'zero' : ''}">${count} item</span>
            </td>
            <td>
                ${isDeleted 
                    ? '<span class="badge-status-inactive"><i class="fa-solid fa-circle-xmark"></i> Nonaktif</span>'
                    : '<span class="badge-status-active"><i class="fa-solid fa-circle-check"></i> Aktif</span>'
                }
            </td>
            <td style="text-align: right;">
                <div class="category-actions-group">
                    <button class="btn-action-cat btn-edit-cat" data-id="${kat.id}" data-nama="${kat.nama_kategori}" data-count="${count}" title="Edit Nama Kategori">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-action-cat btn-pindah-cat" data-id="${kat.id}" data-nama="${kat.nama_kategori}" data-count="${count}" title="Pindahkan Seluruh Barang ke Kategori Lain">
                        <i class="fa-solid fa-arrow-right-arrow-left"></i>
                    </button>
                    ${isDeleted
                        ? `<button class="btn-action-cat btn-restore-cat" data-id="${kat.id}" data-nama="${kat.nama_kategori}" title="Aktifkan Kembali Kategori">
                            <i class="fa-solid fa-rotate-left"></i>
                           </button>`
                        : `<button class="btn-action-cat btn-delete-cat" data-id="${kat.id}" data-nama="${kat.nama_kategori}" data-count="${count}" title="Nonaktifkan Kategori (Soft Delete)">
                            <i class="fa-solid fa-ban"></i>
                           </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDashboard(barang) {
    if (typeof renderDashboard === 'function') {
        const riwayat = typeof globalDataRiwayat !== 'undefined' ? globalDataRiwayat : [];
        const kategori = typeof globalDataKategori !== 'undefined' ? globalDataKategori : [];
        renderDashboard(globalDataBarang || barang || [], riwayat, kategori);
        return;
    }
    let stokMenipis = 0, stokHabis = 0;
    (barang || []).forEach(item => {
        if (item.stok === 0) stokHabis++;
        else if (item.stok <= item.batas_minimum) stokMenipis++;
    });
    const elT = document.getElementById('dash-total');
    const elM = document.getElementById('dash-menipis');
    const elH = document.getElementById('dash-habis');
    if (elT) elT.innerText = (barang || []).length;
    if (elM) elM.innerText = stokMenipis;
    if (elH) elH.innerText = stokHabis;
}

// Fungsi untuk mengambil data barang yang sudah tersaring oleh pencarian & advanced filtering
function getFilteredDataBarang() {
    const allItems = globalDataBarang || [];

    // 1. Filter status keaktifan (semua / aktif / nonaktif)
    let filteredList = allItems;
    if (globalFilterBarang === 'aktif') {
        filteredList = allItems.filter(i => !i.is_deleted);
    } else if (globalFilterBarang === 'nonaktif') {
        filteredList = allItems.filter(i => i.is_deleted);
    }

    // 2. Filter Kategori
    const selectKategori = document.getElementById('filter-kategori-barang');
    const valKategori = selectKategori ? selectKategori.value : 'semua';
    if (valKategori && valKategori !== 'semua') {
        filteredList = filteredList.filter(i => (i.kategori || '') === valKategori);
    }

    // 3. Filter Kondisi / Status Stok
    const selectKondisi = document.getElementById('filter-kondisi-stok');
    const valKondisi = selectKondisi ? selectKondisi.value : 'semua';
    if (valKondisi === 'aman') {
        filteredList = filteredList.filter(i => Number(i.stok) > Number(i.batas_minimum));
    } else if (valKondisi === 'menipis') {
        filteredList = filteredList.filter(i => Number(i.stok) <= Number(i.batas_minimum) && Number(i.stok) > 0);
    } else if (valKondisi === 'habis') {
        filteredList = filteredList.filter(i => Number(i.stok) === 0);
    }

    // 4. Filter Rentang Stok
    const valStokMin = document.getElementById('filter-stok-min')?.value.trim();
    const valStokMax = document.getElementById('filter-stok-max')?.value.trim();
    if (valStokMin !== '' && valStokMin !== undefined) {
        const numMin = Number(valStokMin);
        if (!isNaN(numMin)) {
            filteredList = filteredList.filter(i => Number(i.stok) >= numMin);
        }
    }
    if (valStokMax !== '' && valStokMax !== undefined) {
        const numMax = Number(valStokMax);
        if (!isNaN(numMax)) {
            filteredList = filteredList.filter(i => Number(i.stok) <= numMax);
        }
    }

    // 5. Filter Rentang Harga
    const valHargaMin = document.getElementById('filter-harga-min')?.value.trim();
    const valHargaMax = document.getElementById('filter-harga-max')?.value.trim();
    if (valHargaMin !== '' && valHargaMin !== undefined) {
        const numMin = Number(valHargaMin);
        if (!isNaN(numMin)) {
            filteredList = filteredList.filter(i => Number(i.harga) >= numMin);
        }
    }
    if (valHargaMax !== '' && valHargaMax !== undefined) {
        const numMax = Number(valHargaMax);
        if (!isNaN(numMax)) {
            filteredList = filteredList.filter(i => Number(i.harga) <= numMax);
        }
    }

    // 6. Filter kata kunci pencarian
    const inputSearch = document.getElementById('input-pencarian');
    const kataKunci = inputSearch ? inputSearch.value.trim().toLowerCase() : '';
    if (kataKunci) {
        filteredList = filteredList.filter(item => {
            const str = `${item.id_barang} ${item.nama} ${item.kategori}`.toLowerCase();
            return str.includes(kataKunci);
        });
    }

    return filteredList;
}

function renderTabelBarang() {
    const tbody = document.getElementById('tabel-barang-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const allItems = globalDataBarang || [];

    // Hitung statistik untuk filter pills
    const totalAll = allItems.length;
    const totalAktif = allItems.filter(i => !i.is_deleted).length;
    const totalNonaktif = allItems.filter(i => i.is_deleted).length;

    const countSemua = document.getElementById('count-barang-semua');
    const countAktif = document.getElementById('count-barang-aktif');
    const countNonaktif = document.getElementById('count-barang-nonaktif');

    if (countSemua) countSemua.textContent = totalAll;
    if (countAktif) countAktif.textContent = totalAktif;
    if (countNonaktif) countNonaktif.textContent = totalNonaktif;

    updateActiveFilterBadge();

    if (allItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888; padding: 20px;">Belum ada data barang. Silakan tambahkan barang baru.</td></tr>`;
        return;
    }

    const filteredList = getFilteredDataBarang();

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888; padding: 20px;">Tidak ditemukan data barang yang sesuai dengan filter/pencarian.</td></tr>`;
        return;
    }

    filteredList.forEach(item => {
        const isDeleted = Boolean(item.is_deleted);
        const isHabis = item.stok === 0;
        const isMenipis = item.stok <= item.batas_minimum && item.stok > 0;

        let warnaStok = '#27ae60';
        if (isHabis) warnaStok = '#e74c3c';
        else if (isMenipis) warnaStok = '#d97706';
        if (isDeleted) warnaStok = '#94a3b8';

        const tr = document.createElement('tr');
        if (isDeleted) {
            tr.className = 'tr-item-inactive';
        } else if (isHabis) {
            tr.className = 'tr-stok-habis';
        } else if (isMenipis) {
            tr.className = 'tr-stok-menipis';
        }

        tr.innerHTML = `
            <td><strong>${item.id_barang}</strong></td>
            <td>
                <span class="${isDeleted ? 'item-name-text' : ''}">${item.nama}</span>
            </td>
            <td>${item.kategori}</td>
            <td>Rp ${Number(item.harga).toLocaleString('id-ID')}</td>
            <td style="color: ${warnaStok}; font-weight: bold;">
                ${item.stok} ${item.satuan}
                ${!isDeleted && isHabis ? '<span style="font-size: 11px; margin-left: 4px; color: #ef4444; font-weight: 600;">(Habis)</span>' : ''}
                ${!isDeleted && isMenipis ? '<span style="font-size: 11px; margin-left: 4px; color: #d97706; font-weight: 600;">(Menipis)</span>' : ''}
            </td>
            <td>
                ${isDeleted
                    ? '<span class="badge-status-inactive"><i class="fa-solid fa-circle-xmark"></i> Nonaktif</span>'
                    : '<span class="badge-status-active"><i class="fa-solid fa-circle-check"></i> Aktif</span>'
                }
            </td>
            <td>
                ${isDeleted
                    ? `
                    <button class="btn-primary btn-restore-barang" data-id="${item.id_barang}" style="padding: 4px 8px; font-size: 11px; height: 26px; margin-right: 4px;" title="Aktifkan Kembali Barang">
                        <i class="fa-solid fa-rotate-left"></i> Aktifkan
                    </button>
                    <button class="btn-primary btn-edit" data-id="${item.id_barang}" style="background-color: #3498db; padding: 4px 8px; font-size: 11px; height: 26px;">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    `
                    : `
                    <button class="btn-primary btn-edit" data-id="${item.id_barang}" style="background-color: #3498db; padding: 4px 8px; font-size: 11px; height: 26px; margin-right: 4px;">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn-primary btn-hapus" data-id="${item.id_barang}" style="background-color: #e74c3c; padding: 4px 8px; font-size: 11px; height: 26px;" title="Nonaktifkan Barang">
                        <i class="fa-solid fa-ban"></i> Nonaktifkan
                    </button>
                    `
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- FUNGSI MENDAPATKAN USER LOGIN & RINGKASAN FILTER AKTIF ---
function getExportAdminUser() {
    const namaLengkap = localStorage.getItem('simvenko_user') || 'Administrator';
    const uname = localStorage.getItem('simvenko_uname') || 'admin';
    if (uname) {
        return `${namaLengkap} (@${uname})`;
    }
    return namaLengkap;
}

function getActiveFiltersSummary() {
    const filters = [];

    // 1. Status Keaktifan
    if (globalFilterBarang === 'aktif') {
        filters.push('Status: Aktif');
    } else if (globalFilterBarang === 'nonaktif') {
        filters.push('Status: Nonaktif');
    }

    // 2. Kategori
    const selectKategori = document.getElementById('filter-kategori-barang');
    const valKategori = selectKategori ? selectKategori.value : 'semua';
    if (valKategori && valKategori !== 'semua') {
        filters.push(`Kategori: ${valKategori}`);
    }

    // 3. Kondisi Stok
    const selectKondisi = document.getElementById('filter-kondisi-stok');
    const valKondisi = selectKondisi ? selectKondisi.value : 'semua';
    if (valKondisi === 'aman') {
        filters.push('Kondisi: Stok Aman');
    } else if (valKondisi === 'menipis') {
        filters.push('Kondisi: Stok Menipis');
    } else if (valKondisi === 'habis') {
        filters.push('Kondisi: Stok Habis');
    }

    // 4. Rentang Stok
    const valStokMin = document.getElementById('filter-stok-min')?.value.trim();
    const valStokMax = document.getElementById('filter-stok-max')?.value.trim();
    if (valStokMin !== '' && valStokMin !== undefined && valStokMax !== '' && valStokMax !== undefined) {
        filters.push(`Stok: ${valStokMin} s/d ${valStokMax}`);
    } else if (valStokMin !== '' && valStokMin !== undefined) {
        filters.push(`Stok Min: ${valStokMin}`);
    } else if (valStokMax !== '' && valStokMax !== undefined) {
        filters.push(`Stok Max: ${valStokMax}`);
    }

    // 5. Rentang Harga
    const valHargaMin = document.getElementById('filter-harga-min')?.value.trim();
    const valHargaMax = document.getElementById('filter-harga-max')?.value.trim();
    if (valHargaMin !== '' && valHargaMin !== undefined && valHargaMax !== '' && valHargaMax !== undefined) {
        filters.push(`Harga: Rp ${Number(valHargaMin).toLocaleString('id-ID')} s/d Rp ${Number(valHargaMax).toLocaleString('id-ID')}`);
    } else if (valHargaMin !== '' && valHargaMin !== undefined) {
        filters.push(`Harga Min: Rp ${Number(valHargaMin).toLocaleString('id-ID')}`);
    } else if (valHargaMax !== '' && valHargaMax !== undefined) {
        filters.push(`Harga Max: Rp ${Number(valHargaMax).toLocaleString('id-ID')}`);
    }

    // 6. Pencarian
    const inputSearch = document.getElementById('input-pencarian');
    const kataKunci = inputSearch ? inputSearch.value.trim() : '';
    if (kataKunci) {
        filters.push(`Pencarian: "${kataKunci}"`);
    }

    return filters;
}

// --- FUNGSI EKSPOR DATA KE PDF (jsPDF + autoTable) ---
function exportDataBarangPDF() {
    const data = getFilteredDataBarang();
    if (!data || data.length === 0) {
        showToast('Tidak ada data barang untuk diekspor ke PDF.', 'warning');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('Library PDF belum termuat, mohon periksa koneksi internet Anda.', 'error');
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

        const adminUser = getExportAdminUser();
        const activeFilters = getActiveFiltersSummary();
        const filterStr = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Semua Data (Tanpa Filter)';

        // Header Dokumen
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('SIMVENKO - SISTEM MANAJEMEN INVENTARIS', 14, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text('Laporan Ringkasan dan Status Data Barang', 14, 21);

        // Garis Pembatas
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 24, 196, 24);

        // Metadata Laporan dalam 2 Kolom
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        
        // Kolom Kiri
        doc.text(`Tanggal Cetak : ${tglStr}, ${waktuStr} WIB`, 14, 30);
        doc.text(`Total Data       : ${data.length} barang`, 14, 35);

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
            doc.setTextColor(37, 99, 235); // Blue 600
        } else {
            doc.setTextColor(100, 116, 139);
        }

        const filterLines = doc.splitTextToSize(filterStr, availableWidth);
        doc.text(filterLines, filterStartX, 40);

        const startYTable = 42 + (filterLines.length * 4);

        // Format data tabel untuk autoTable
        const tableColumns = [
            { header: 'No', dataKey: 'no' },
            { header: 'Kode', dataKey: 'kode' },
            { header: 'Nama Barang', dataKey: 'nama' },
            { header: 'Kategori', dataKey: 'kategori' },
            { header: 'Harga Satuan', dataKey: 'harga' },
            { header: 'Stok', dataKey: 'stok' },
            { header: 'Min', dataKey: 'batas' },
            { header: 'Status', dataKey: 'status' }
        ];

        const tableRows = data.map((item, index) => {
            const isDeleted = Boolean(item.is_deleted);
            let statusText = isDeleted ? 'Nonaktif' : 'Aktif';
            if (!isDeleted && item.stok === 0) statusText = 'Habis';
            else if (!isDeleted && item.stok <= item.batas_minimum) statusText = 'Menipis';

            return {
                no: (index + 1).toString(),
                kode: item.id_barang || '-',
                nama: item.nama || '-',
                kategori: item.kategori || '-',
                harga: `Rp ${Number(item.harga || 0).toLocaleString('id-ID')}`,
                stok: `${item.stok} ${item.satuan || ''}`,
                batas: `${item.batas_minimum || 0}`,
                status: statusText
            };
        });

        doc.autoTable({
            columns: tableColumns,
            body: tableRows,
            startY: startYTable,
            theme: 'striped',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 2.5,
                valign: 'middle',
                textColor: [30, 41, 59],
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [39, 174, 96], // #27ae60 SIMVENKO Green
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            columnStyles: {
                no: { halign: 'center', cellWidth: 10 },
                kode: { fontStyle: 'bold', cellWidth: 22 },
                nama: { cellWidth: 48 },
                kategori: { cellWidth: 26 },
                harga: { halign: 'right', cellWidth: 28 },
                stok: { halign: 'right', cellWidth: 20 },
                batas: { halign: 'center', cellWidth: 12 },
                status: { halign: 'center', cellWidth: 16 }
            },
            didParseCell: function(dataCell) {
                if (dataCell.section === 'body' && dataCell.column.dataKey === 'status') {
                    if (dataCell.cell.raw === 'Nonaktif') {
                        dataCell.cell.styles.textColor = [148, 163, 184];
                    } else if (dataCell.cell.raw === 'Habis') {
                        dataCell.cell.styles.textColor = [220, 38, 38];
                        dataCell.cell.styles.fontStyle = 'bold';
                    } else if (dataCell.cell.raw === 'Menipis') {
                        dataCell.cell.styles.textColor = [217, 119, 6];
                        dataCell.cell.styles.fontStyle = 'bold';
                    } else {
                        dataCell.cell.styles.textColor = [22, 163, 74];
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
        const fileName = `laporan_data_barang_${fileDateStr}.pdf`;

        doc.save(fileName);
        showToast(`Berhasil mengekspor ${data.length} barang ke format PDF!`, 'success');
    } catch (err) {
        console.error('Gagal mengekspor PDF:', err);
        showToast('Terjadi kesalahan saat memproses ekspor PDF.', 'error');
    }
}

// --- FUNGSI EKSPOR DATA KE CSV ---
function exportDataBarangCSV() {
    const data = getFilteredDataBarang();
    if (!data || data.length === 0) {
        showToast('Tidak ada data barang untuk diekspor ke CSV.', 'warning');
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

        const adminUser = getExportAdminUser();
        const activeFilters = getActiveFiltersSummary();
        const filterStr = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Semua Data (Tanpa Filter)';

        const metaRows = [
            ['"SIMVENKO - LAPORAN DATA BARANG"'],
            [`"Tanggal Ekspor"`, `"${tglStr} ${waktuStr} WIB"`],
            [`"Nama Admin"`, `"${adminUser}"`],
            [`"Filter Diterapkan"`, `"${filterStr.replace(/"/g, '""')}"`],
            [`"Total Data"`, `"${data.length} barang"`],
            [] // Baris pemisah kosong
        ];

        const headers = [
            'No',
            'Kode Barang',
            'Nama Barang',
            'Kategori',
            'Harga Satuan (Rp)',
            'Stok',
            'Satuan',
            'Batas Minimum',
            'Status Keaktifan'
        ];

        const rows = data.map((item, index) => {
            const no = index + 1;
            const kode = `"${String(item.id_barang || '').replace(/"/g, '""')}"`;
            const nama = `"${String(item.nama || '').replace(/"/g, '""')}"`;
            const kategori = `"${String(item.kategori || '').replace(/"/g, '""')}"`;
            const harga = Number(item.harga || 0);
            const stok = Number(item.stok || 0);
            const satuan = `"${String(item.satuan || '').replace(/"/g, '""')}"`;
            const batas = Number(item.batas_minimum || 0);
            const status = item.is_deleted ? 'Nonaktif' : 'Aktif';

            return [no, kode, nama, kategori, harga, stok, satuan, batas, status].join(',');
        });

        const csvContent = '\uFEFF' + [
            ...metaRows.map(r => r.join(',')),
            headers.join(','),
            ...rows
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const padZero = (n) => String(n).padStart(2, '0');
        const fileDateStr = `${sekarang.getFullYear()}${padZero(sekarang.getMonth() + 1)}${padZero(sekarang.getDate())}_${padZero(sekarang.getHours())}${padZero(sekarang.getMinutes())}`;
        const fileName = `data_barang_${fileDateStr}.csv`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Berhasil mengekspor ${data.length} barang ke format CSV!`, 'success');
    } catch (err) {
        console.error('Gagal mengekspor CSV:', err);
        showToast('Terjadi kesalahan saat memproses ekspor CSV.', 'error');
    }
}