document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SISTEM LOGIN ---
    const halamanLogin = document.getElementById('halaman-login');
    const sidebarUtama = document.getElementById('sidebar-utama');
    const kontenUtama = document.getElementById('konten-utama');
    const formLogin = document.getElementById('form-login');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    function showLoginError(pesan) {
        if (loginError) {
            loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${pesan}`;
            loginError.style.display = 'flex';
            loginError.style.animation = 'none';
            loginError.offsetHeight; // trigger reflow
            loginError.style.animation = 'shakeError 0.35s ease';
        }
    }

    function hideLoginError() {
        if (loginError) {
            loginError.style.display = 'none';
            loginError.textContent = '';
        }
    }

    if (usernameInput) usernameInput.addEventListener('input', hideLoginError);
    if (passwordInput) passwordInput.addEventListener('input', hideLoginError);

    // Cek apakah admin sudah login sebelumnya (pakai localStorage browser)
    if (localStorage.getItem('simvenko_login') === 'true') {
        tampilkanHalamanUtama();
    }

    // Menangani klik tombol login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideLoginError();

        const usernameVal = usernameInput ? usernameInput.value.trim() : '';
        const passwordVal = passwordInput ? passwordInput.value.trim() : '';

        // Validasi jika field kosong
        if (!usernameVal || !passwordVal) {
            showLoginError('Username atau password tidak boleh kosong!');
            return;
        }

        try {
            // Kirim data ke server untuk dicek
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameVal, password: passwordVal })
            });

            const hasil = await response.json();

            if (hasil.sukses) {
                // Jika sukses, simpan status login di browser dan buka aplikasi
                localStorage.setItem('simvenko_login', 'true');
                tampilkanHalamanUtama();
            } else {
                showLoginError(hasil.message || 'Username atau password salah!');
            }
        } catch (error) {
            showLoginError('Terjadi kesalahan jaringan.');
        }
    });

    // --- FITUR PEEK PASSWORD ---
    const togglePassword = document.getElementById('toggle-password');
    const loginPassword = document.getElementById('login-password');

    if (togglePassword && loginPassword) {
        togglePassword.addEventListener('click', () => {
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';
            
            // Ubah icon secara dinamis
            togglePassword.classList.toggle('fa-eye', !isPassword);
            togglePassword.classList.toggle('fa-eye-slash', isPassword);
            togglePassword.setAttribute('title', isPassword ? 'Sembunyikan Password' : 'Lihat Password');
        });
    }

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
            
            // Bersihkan form login dan reset toggle password serta pesan error
            formLogin.reset();
            hideLoginError();
            if (loginPassword && togglePassword) {
                loginPassword.type = 'password';
                togglePassword.classList.add('fa-eye');
                togglePassword.classList.remove('fa-eye-slash');
                togglePassword.setAttribute('title', 'Lihat Password');
            }
        });
    }
});