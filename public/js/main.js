document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SISTEM LOGIN ---
    const halamanLogin = document.getElementById('halaman-login');
    const sidebarUtama = document.getElementById('sidebar-utama');
    const kontenUtama = document.getElementById('konten-utama');
    const formLogin = document.getElementById('form-login');

    // Cek apakah admin sudah login sebelumnya (pakai localStorage browser)
    if (localStorage.getItem('simvenko_login') === 'true') {
        tampilkanHalamanUtama();
    }

    // Menangani klik tombol login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value;
        const passwordInput = document.getElementById('login-password').value;

        try {
            // Kirim data ke server untuk dicek
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            const hasil = await response.json();

            if (hasil.sukses) {
                // Jika sukses, simpan status login di browser dan buka aplikasi
                localStorage.setItem('simvenko_login', 'true');
                tampilkanHalamanUtama();
            } else {
                alert(hasil.message); // Tampilkan pesan error (password salah)
            }
        } catch (error) {
            alert('Terjadi kesalahan jaringan.');
        }
    });

    function tampilkanHalamanUtama() {
        halamanLogin.style.display = 'none'; // Sembunyikan layar login
        sidebarUtama.style.display = 'flex'; // Munculkan sidebar
        kontenUtama.style.display = 'block'; // Munculkan konten utama
    }

    // --- 2. LOGIKA NAVIGASI MENU (KODE LAMA) ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const halamanSections = document.querySelectorAll('.halaman');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            halamanSections.forEach(hal => hal.classList.remove('active'));

            button.classList.add('active');
            const idTarget = button.id.replace('nav-', 'halaman-');
            document.getElementById(idTarget).classList.add('active');
        });
    });

    // --- TOMBOL LOGOUT ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Hapus status login dari memori browser
            localStorage.removeItem('simvenko_login');
            
            // Sembunyikan halaman utama dan tampilkan kembali halaman login
            sidebarUtama.style.display = 'none';
            kontenUtama.style.display = 'none';
            halamanLogin.style.display = 'flex';
            
            // Bersihkan form login
            formLogin.reset();
        });
    }
});