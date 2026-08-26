// Variabel global untuk menyimpan data sementara
let globalDataBarang = [];

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
    const modalHapus = document.getElementById('modal-hapus');
    const formTambah = document.getElementById('form-tambah-barang');
    const formEdit = document.getElementById('form-edit-barang');
    const formHapus = document.getElementById('form-hapus-barang');
    const inputKonfirmasiKode = document.getElementById('input-konfirmasi-kode');
    const btnKonfirmasiHapus = document.getElementById('btn-konfirmasi-hapus');

    let barangAkanDihapus = null;

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
        hideFormError('edit-error', formEdit);
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

    // Tombol Buka & Tutup Modal Tambah
    document.getElementById('btn-tambah').addEventListener('click', bukaModalTambah);
    document.getElementById('tutup-modal').addEventListener('click', tutupModalTambah);
    document.getElementById('batal-tambah').addEventListener('click', tutupModalTambah);

    // Tombol Tutup Modal Edit
    document.getElementById('tutup-modal-edit').addEventListener('click', tutupModalEdit);
    document.getElementById('batal-edit').addEventListener('click', tutupModalEdit);

    // Tombol Tutup Modal Hapus
    document.getElementById('tutup-modal-hapus').addEventListener('click', tutupModalHapus);
    document.getElementById('batal-hapus').addEventListener('click', tutupModalHapus);

    // Tutup modal jika klik di luar area konten (backdrop)
    window.addEventListener('click', (e) => {
        if (e.target === modalTambah) tutupModalTambah();
        if (e.target === modalEdit) tutupModalEdit();
        if (e.target === modalHapus) tutupModalHapus();
    });

    // Tutup modal dengan tombol keyboard Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalTambah.style.display === 'flex') tutupModalTambah();
            if (modalEdit.style.display === 'flex') tutupModalEdit();
            if (modalHapus.style.display === 'flex') tutupModalHapus();
        }
    });

    // Bersihkan pesan error saat user mengetik pada form tambah/edit
    formTambah.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const errorBox = document.getElementById('tambah-error');
            if (errorBox && errorBox.style.display !== 'none') {
                hideFormError('tambah-error', formTambah);
            }
        });
    });

    formEdit.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const errorBox = document.getElementById('edit-error');
            if (errorBox && errorBox.style.display !== 'none') {
                hideFormError('edit-error', formEdit);
            }
        });
    });

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

        const dataUpdate = {
            id_barang: kode,
            nama: nama,
            kategori: kategori,
            harga: harga,
            satuan: satuan,
            stok: stok,
            batas_minimum: batas
        };

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
            showFormError('hapus-error', hasil.message || 'Gagal menghapus data barang.');
            btnKonfirmasiHapus.disabled = false;
        }
    });

    // --- FITUR PENCARIAN (SEARCH) ---
    document.getElementById('input-pencarian').addEventListener('input', (e) => {
        const kataKunci = e.target.value.toLowerCase();
        document.querySelectorAll('#tabel-barang-body tr').forEach(baris => {
            baris.style.display = baris.innerText.toLowerCase().includes(kataKunci) ? '' : 'none';
        });
    });

    // --- FITUR KLIK TOMBOL EDIT DAN HAPUS PADA TABEL ---
    document.getElementById('tabel-barang-body').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const idBarang = btn.getAttribute('data-id');
        const barang = globalDataBarang.find(b => b.id_barang === idBarang);
        if (!barang) return;

        // Jika tombol HAPUS diklik
        if (btn.classList.contains('btn-hapus')) {
            bukaModalHapus(barang);
        }

        // Jika tombol EDIT diklik
        if (btn.classList.contains('btn-edit')) {
            hideFormError('edit-error', formEdit);

            // Isi formulir dengan data barang yang dipilih
            document.getElementById('edit-kode-lama').value = barang.id_barang;
            document.getElementById('edit-kode').value = barang.id_barang;
            document.getElementById('edit-nama').value = barang.nama;
            document.getElementById('edit-kategori').value = barang.kategori;
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
    if (data && data.barang) {
        globalDataBarang = data.barang;
        
        // Filter hanya data barang yang aktif (tidak di-soft delete)
        const barangAktif = data.barang.filter(item => !item.is_deleted);

        updateDashboard(barangAktif);
        renderTabelBarang(barangAktif);

        // Update dropdown pada halaman transaksi hanya untuk barang aktif
        if (typeof updateDropdownBarang === 'function') {
            updateDropdownBarang(barangAktif);
        }
        if (typeof renderTabelRiwayat === 'function' && data.riwayat) {
            renderTabelRiwayat(data.riwayat);
        }
    }
}

function updateDashboard(barang) {
    let stokMenipis = 0, stokHabis = 0;
    barang.forEach(item => {
        if (item.stok === 0) stokHabis++;
        else if (item.stok <= item.batas_minimum) stokMenipis++;
    });
    document.getElementById('dash-total').innerText = barang.length;
    document.getElementById('dash-menipis').innerText = stokMenipis;
    document.getElementById('dash-habis').innerText = stokHabis;
}

function renderTabelBarang(barang) {
    const tbody = document.getElementById('tabel-barang-body');
    tbody.innerHTML = '';

    if (!barang || barang.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">Belum ada data barang aktif. Silakan tambahkan barang baru.</td></tr>`;
        return;
    }

    barang.forEach(item => {
        let warnaStok = item.stok === 0 ? '#e74c3c' : (item.stok <= item.batas_minimum ? '#f39c12' : '#27ae60');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.id_barang}</strong></td>
            <td>${item.nama}</td>
            <td>${item.kategori}</td>
            <td>Rp ${Number(item.harga).toLocaleString('id-ID')}</td>
            <td style="color: ${warnaStok}; font-weight: bold;">${item.stok} ${item.satuan}</td>
            <td>
                <button class="btn-primary btn-edit" data-id="${item.id_barang}" style="background-color: #3498db; padding: 6px 12px; font-size: 12px; margin-right: 4px;">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button class="btn-primary btn-hapus" data-id="${item.id_barang}" style="background-color: #e74c3c; padding: 6px 12px; font-size: 12px;">
                    <i class="fa-solid fa-trash"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}