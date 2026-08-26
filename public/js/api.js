// Mengambil seluruh data dari server
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        return await response.json();
    } catch (error) {
        console.error("Gagal mengambil data:", error);
        return null;
    }
}

// Mengirim data barang baru ke server
async function tambahDataBarang(barangBaru) {
    try {
        const response = await fetch('/api/barang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(barangBaru)
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal menambah barang!' };
        }
        return { sukses: true, message: data.message || 'Barang berhasil ditambahkan!' };
    } catch (error) {
        console.error("Gagal menambah barang:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat menambah barang.' };
    }
}

// Mengirim perintah hapus ke server
async function hapusDataBarang(id) {
    try {
        const response = await fetch(`/api/barang/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal menghapus barang!' };
        }
        return { sukses: true, message: data.message || 'Barang berhasil dihapus!' };
    } catch (error) {
        console.error("Gagal menghapus barang:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat menghapus barang.' };
    }
}

// Mengirim data perubahan barang ke server
async function editDataBarang(idLama, dataUpdate) {
    try {
        const response = await fetch(`/api/barang/${idLama}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataUpdate)
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal mengedit barang!' };
        }
        return { sukses: true, message: data.message || 'Data barang berhasil diperbarui!' };
    } catch (error) {
        console.error("Gagal mengedit barang:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mengedit barang.' };
    }
}

// Mengirim data transaksi baru ke server
async function catatTransaksi(dataTrx) {
    try {
        const response = await fetch('/api/transaksi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataTrx)
        });
        
        if (!response.ok) {
            // Menangkap pesan error dari server (misal: "Stok tidak cukup")
            const errorData = await response.json();
            alert(errorData.error || "Gagal mencatat transaksi");
            return false;
        }
        return true;
    } catch (error) {
        console.error("Kesalahan jaringan:", error);
        return false;
    }
}