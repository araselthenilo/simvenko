// Variabel global untuk menyimpan data sementara
let globalDataBarang = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDanTampilkanData();

    // --- LOGIKA MODAL TAMBAH ---
    const modalTambah = document.getElementById('modal-tambah');
    document.getElementById('btn-tambah').addEventListener('click', () => modalTambah.style.display = 'block');
    document.getElementById('tutup-modal').addEventListener('click', () => modalTambah.style.display = 'none');

    document.getElementById('form-tambah-barang').addEventListener('submit', async (e) => {
        e.preventDefault();
        const barangBaru = {
            id_barang: document.getElementById('input-kode').value,
            nama: document.getElementById('input-nama').value,
            kategori: document.getElementById('input-kategori').value,
            harga: Number(document.getElementById('input-harga').value),
            satuan: document.getElementById('input-satuan').value,
            stok: Number(document.getElementById('input-stok').value),
            batas_minimum: Number(document.getElementById('input-batas').value)
        };
        if (await tambahDataBarang(barangBaru)) {
            alert('Barang berhasil ditambahkan!');
            document.getElementById('form-tambah-barang').reset();
            modalTambah.style.display = 'none';
            loadDanTampilkanData(); 
        }
    });

    // --- LOGIKA MODAL EDIT ---
    const modalEdit = document.getElementById('modal-edit');
    document.getElementById('tutup-modal-edit').addEventListener('click', () => modalEdit.style.display = 'none');

    document.getElementById('form-edit-barang').addEventListener('submit', async (e) => {
        e.preventDefault();
        const idLama = document.getElementById('edit-kode-lama').value;
        const dataUpdate = {
            id_barang: document.getElementById('edit-kode').value,
            nama: document.getElementById('edit-nama').value,
            kategori: document.getElementById('edit-kategori').value,
            harga: Number(document.getElementById('edit-harga').value),
            satuan: document.getElementById('edit-satuan').value,
            stok: Number(document.getElementById('edit-stok').value),
            batas_minimum: Number(document.getElementById('edit-batas').value)
        };

        if (await editDataBarang(idLama, dataUpdate)) {
            alert('Data barang berhasil diperbarui!');
            modalEdit.style.display = 'none';
            loadDanTampilkanData();
        }
    });

    // --- FITUR PENCARIAN (SEARCH) ---
    document.getElementById('input-pencarian').addEventListener('input', (e) => {
        const kataKunci = e.target.value.toLowerCase();
        document.querySelectorAll('#tabel-barang-body tr').forEach(baris => {
            baris.style.display = baris.innerText.toLowerCase().includes(kataKunci) ? '' : 'none'; 
        });
    });

    // --- FITUR KLIK TOMBOL EDIT DAN HAPUS ---
    document.getElementById('tabel-barang-body').addEventListener('click', async (e) => {
        const idBarang = e.target.getAttribute('data-id');
        
        // Jika tombol HAPUS diklik
        if (e.target.classList.contains('btn-hapus')) {
            if (confirm(`Yakin ingin menghapus barang dengan kode: ${idBarang}?`)) {
                if (await hapusDataBarang(idBarang)) {
                    alert('Barang terhapus!');
                    loadDanTampilkanData();
                }
            }
        }
        
        // Jika tombol EDIT diklik
        if (e.target.classList.contains('btn-edit')) {
            // Cari data barang berdasarkan ID
            const barang = globalDataBarang.find(b => b.id_barang === idBarang);
            if (barang) {
                // Isi formulir dengan data lama
                document.getElementById('edit-kode-lama').value = barang.id_barang;
                document.getElementById('edit-kode').value = barang.id_barang;
                document.getElementById('edit-nama').value = barang.nama;
                document.getElementById('edit-kategori').value = barang.kategori;
                document.getElementById('edit-harga').value = barang.harga;
                document.getElementById('edit-satuan').value = barang.satuan;
                document.getElementById('edit-stok').value = barang.stok;
                document.getElementById('edit-batas').value = barang.batas_minimum;
                
                // Munculkan popup edit
                modalEdit.style.display = 'block';
            }
        }
    });
});

// --- FUNGSI-FUNGSI PENDUKUNG ---
async function loadDanTampilkanData() {
    const data = await fetchData();
    if (data && data.barang) {
        globalDataBarang = data.barang; 
        updateDashboard(data.barang);
        renderTabelBarang(data.barang);
        
        // --- BARIS BARU UNTUK TRANSAKSI ---
        if (typeof updateDropdownBarang === 'function') {
            updateDropdownBarang(data.barang);
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
    barang.forEach(item => {
        let warnaStok = item.stok === 0 ? '#e74c3c' : (item.stok <= item.batas_minimum ? '#f39c12' : '#27ae60'); 
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.id_barang}</td>
            <td>${item.nama}</td>
            <td>${item.kategori}</td>
            <td>Rp ${item.harga.toLocaleString('id-ID')}</td>
            <td style="color: ${warnaStok}; font-weight: bold;">${item.stok} ${item.satuan}</td>
            <td>
                <!-- Tambah class 'btn-edit' dan 'data-id' di tombol Edit -->
                <button class="btn-primary btn-edit" data-id="${item.id_barang}" style="background-color: #3498db; padding: 5px 10px; font-size: 12px;">Edit</button>
                <button class="btn-primary btn-hapus" data-id="${item.id_barang}" style="background-color: #e74c3c; padding: 5px 10px; font-size: 12px;">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}