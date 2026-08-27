// Mengambil seluruh data dari server
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("Gagal mengambil data dari server:", response.status, errData.error || response.statusText);
            return null;
        }
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

// Mengirim perintah nonaktifkan (hapus) ke server
async function hapusDataBarang(id) {
    try {
        const response = await fetch(`/api/barang/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal menonaktifkan barang!' };
        }
        return { sukses: true, message: data.message || 'Barang berhasil dinonaktifkan!' };
    } catch (error) {
        console.error("Gagal menonaktifkan barang:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat menonaktifkan barang.' };
    }
}

// Mengirim perintah aktifkan kembali ke server
async function aktifkanDataBarang(id) {
    try {
        const response = await fetch(`/api/barang/${id}/aktifkan`, { method: 'PUT' });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal mengaktifkan barang!' };
        }
        return { sukses: true, message: data.message || 'Barang berhasil diaktifkan kembali!' };
    } catch (error) {
        console.error("Gagal mengaktifkan barang:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mengaktifkan barang.' };
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
        
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal mencatat transaksi!' };
        }
        return { sukses: true, message: data.message || 'Transaksi berhasil disimpan!' };
    } catch (error) {
        console.error("Kesalahan jaringan:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mencatat transaksi.' };
    }
}

// Mengambil seluruh data kategori dari server
async function fetchKategori() {
    try {
        const response = await fetch('/api/kategori');
        return await response.json();
    } catch (error) {
        console.error("Gagal mengambil data kategori:", error);
        return [];
    }
}

// Mengirim data kategori baru ke server
async function tambahDataKategori(namaKategori) {
    try {
        const response = await fetch('/api/kategori', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama_kategori: namaKategori })
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal menambah kategori!' };
        }
        return { sukses: true, message: data.message || 'Kategori berhasil ditambahkan!' };
    } catch (error) {
        console.error("Gagal menambah kategori:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat menambah kategori.' };
    }
}

// Mengedit nama kategori di server
async function editDataKategori(id, namaBaru) {
    try {
        const response = await fetch(`/api/kategori/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama_kategori: namaBaru })
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal mengubah kategori!' };
        }
        return { sukses: true, message: data.message || 'Kategori berhasil diperbarui!' };
    } catch (error) {
        console.error("Gagal mengedit kategori:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mengedit kategori.' };
    }
}

// Memindahkan seluruh barang dari kategori asal ke kategori tujuan
async function pindahkanDataKategori(kategoriAsal, kategoriTujuan, nonaktifkanAsal = false) {
    try {
        const response = await fetch('/api/kategori/pindahkan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kategori_asal: kategoriAsal,
                kategori_tujuan: kategoriTujuan,
                nonaktifkan_asal: nonaktifkanAsal
            })
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal memindahkan barang ke kategori baru!' };
        }
        return { sukses: true, message: data.message || 'Barang berhasil dipindahkan!' };
    } catch (error) {
        console.error("Gagal memindahkan kategori:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat memindahkan kategori.' };
    }
}

// Menonaktifkan kategori (soft delete)
async function hapusDataKategori(id) {
    try {
        const response = await fetch(`/api/kategori/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal menonaktifkan kategori!' };
        }
        return { sukses: true, message: data.message || 'Kategori berhasil dinonaktifkan!' };
    } catch (error) {
        console.error("Gagal menonaktifkan kategori:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat menonaktifkan kategori.' };
    }
}

// Mengaktifkan kembali kategori
async function aktifkanDataKategori(id) {
    try {
        const response = await fetch(`/api/kategori/${id}/aktifkan`, { method: 'PUT' });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.error || 'Gagal mengaktifkan kategori!' };
        }
        return { sukses: true, message: data.message || 'Kategori berhasil diaktifkan kembali!' };
    } catch (error) {
        console.error("Gagal mengaktifkan kategori:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mengaktifkan kategori.' };
    }
}

// Memeriksa status sesi login via HTTP-Only cookie
async function checkAuthSession() {
    try {
        const response = await fetch('/api/auth/me');
        return await response.json();
    } catch (error) {
        console.error("Gagal memeriksa sesi auth:", error);
        return { loggedIn: false };
    }
}

// Melakukan logout dan menghapus cookie sesi di server
async function logoutUser() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        return await response.json();
    } catch (error) {
        console.error("Gagal logout:", error);
        return { sukses: false };
    }
}

// Mengirim permintaan update profil (nama lengkap) & ganti password admin ke server
async function updateProfilAdmin(dataUpdateProfil) {
    try {
        const response = await fetch('/api/admin/update-profil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataUpdateProfil)
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.message || 'Gagal memperbarui profil!' };
        }
        return { sukses: true, message: data.message || 'Profil berhasil diperbarui!', user: data.user };
    } catch (error) {
        console.error("Gagal memperbarui profil admin:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat memperbarui profil.' };
    }
}

// Mengirim permintaan ganti password admin ke server (kompatibilitas)
async function gantiPasswordAdmin(dataGantiPassword) {
    try {
        const response = await fetch('/api/admin/ganti-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataGantiPassword)
        });
        const data = await response.json();
        if (!response.ok) {
            return { sukses: false, message: data.message || 'Gagal mengganti password!' };
        }
        return { sukses: true, message: data.message || 'Password berhasil diperbarui!', user: data.user };
    } catch (error) {
        console.error("Gagal mengganti password admin:", error);
        return { sukses: false, message: 'Terjadi kesalahan jaringan saat mengganti password.' };
    }
}
