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
                // Jika sukses, simpan status login & username di browser dan buka aplikasi
                localStorage.setItem('simvenko_login', 'true');
                localStorage.setItem('simvenko_user', usernameVal || 'Admin');
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

    function updateProfilDisplay(customName) {
        const username = customName || localStorage.getItem('simvenko_user') || 'admin';
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const modalProfilUsername = document.getElementById('modal-profil-username');
        const profilInputUsername = document.getElementById('profil-input-username');

        if (sidebarUserName) sidebarUserName.textContent = username;
        if (modalProfilUsername) modalProfilUsername.textContent = username;
        if (profilInputUsername && (!customName || profilInputUsername.value !== username)) {
            profilInputUsername.value = username;
        }
    }

    function tampilkanHalamanUtama() {
        halamanLogin.style.display = 'none'; // Sembunyikan layar login
        sidebarUtama.style.display = 'flex'; // Munculkan sidebar
        kontenUtama.style.display = 'block'; // Munculkan konten utama
        updateProfilDisplay();
    }

    // Inisialisasi tampilan profil saat pertama kali dibuka
    updateProfilDisplay();

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

    // --- 3. FITUR PROFIL ADMIN & GANTI PASSWORD ---
    const btnBukaProfil = document.getElementById('btn-buka-profil');
    const modalProfil = document.getElementById('modal-profil-admin');
    const tutupModalProfil = document.getElementById('tutup-modal-profil');
    const batalProfil = document.getElementById('batal-profil');
    const formGantiPassword = document.getElementById('form-ganti-password');
    const profilError = document.getElementById('profil-error');
    const profilInputUsername = document.getElementById('profil-input-username');
    const inputPwdLama = document.getElementById('pwd-lama');
    const inputPwdBaru = document.getElementById('pwd-baru');
    const inputPwdKonfirmasi = document.getElementById('pwd-konfirmasi');
    const btnSimpanPassword = document.getElementById('btn-simpan-password');

    function showProfilError(pesan) {
        if (profilError) {
            profilError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${pesan}</span>`;
            profilError.style.display = 'flex';
            profilError.style.animation = 'none';
            profilError.offsetHeight; // trigger reflow
            profilError.style.animation = 'shakeError 0.35s ease';
        }
    }

    function hideProfilError() {
        if (profilError) {
            profilError.style.display = 'none';
            profilError.textContent = '';
        }
        if (formGantiPassword) {
            formGantiPassword.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        }
    }

    // Setup toggle password visibility untuk modal profil
    function setupPasswordToggle(toggleId, inputId) {
        const toggleBtn = document.getElementById(toggleId);
        const inputEl = document.getElementById(inputId);
        if (toggleBtn && inputEl) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = inputEl.type === 'password';
                inputEl.type = isPassword ? 'text' : 'password';
                toggleBtn.classList.toggle('fa-eye', !isPassword);
                toggleBtn.classList.toggle('fa-eye-slash', isPassword);
                toggleBtn.setAttribute('title', isPassword ? 'Sembunyikan Password' : 'Lihat Password');
            });
        }
    }

    setupPasswordToggle('toggle-pwd-lama', 'pwd-lama');
    setupPasswordToggle('toggle-pwd-baru', 'pwd-baru');
    setupPasswordToggle('toggle-pwd-konfirmasi', 'pwd-konfirmasi');

    function resetToggleIcon(toggleId, inputId) {
        const toggleBtn = document.getElementById(toggleId);
        const inputEl = document.getElementById(inputId);
        if (toggleBtn && inputEl) {
            inputEl.type = 'password';
            toggleBtn.classList.add('fa-eye');
            toggleBtn.classList.remove('fa-eye-slash');
            toggleBtn.setAttribute('title', 'Lihat Password');
        }
    }

    function bukaModalProfilHandler() {
        const currentUsername = localStorage.getItem('simvenko_user') || 'admin';
        updateProfilDisplay(currentUsername);
        hideProfilError();
        if (formGantiPassword) formGantiPassword.reset();
        if (profilInputUsername) profilInputUsername.value = currentUsername;
        resetToggleIcon('toggle-pwd-lama', 'pwd-lama');
        resetToggleIcon('toggle-pwd-baru', 'pwd-baru');
        resetToggleIcon('toggle-pwd-konfirmasi', 'pwd-konfirmasi');
        if (modalProfil) {
            modalProfil.style.display = 'flex';
            if (profilInputUsername) {
                profilInputUsername.focus();
                profilInputUsername.select();
            }
        }
    }

    function tutupModalProfilHandler() {
        if (modalProfil) modalProfil.style.display = 'none';
        hideProfilError();
        if (formGantiPassword) formGantiPassword.reset();
        updateProfilDisplay();
    }

    if (btnBukaProfil) {
        btnBukaProfil.addEventListener('click', bukaModalProfilHandler);
        btnBukaProfil.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                bukaModalProfilHandler();
            }
        });
    }

    if (tutupModalProfil) tutupModalProfil.addEventListener('click', tutupModalProfilHandler);
    if (batalProfil) batalProfil.addEventListener('click', tutupModalProfilHandler);

    // Tutup jika klik backdrop di luar dialog modal profil
    window.addEventListener('click', (e) => {
        if (e.target === modalProfil) {
            tutupModalProfilHandler();
        }
    });

    // Tutup jika tekan tombol Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalProfil && modalProfil.style.display === 'flex') {
            tutupModalProfilHandler();
        }
    });

    // Real-time update preview username saat mengetik di input
    if (profilInputUsername) {
        profilInputUsername.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const modalProfilUsername = document.getElementById('modal-profil-username');
            if (modalProfilUsername) {
                modalProfilUsername.textContent = val || 'admin';
            }
            hideProfilError();
        });
    }

    if (inputPwdLama) inputPwdLama.addEventListener('input', hideProfilError);
    if (inputPwdBaru) inputPwdBaru.addEventListener('input', hideProfilError);
    if (inputPwdKonfirmasi) inputPwdKonfirmasi.addEventListener('input', hideProfilError);

    // Form Submit Ganti Password & Update Profil
    if (formGantiPassword) {
        formGantiPassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideProfilError();

            const usernameLama = localStorage.getItem('simvenko_user') || 'admin';
            const usernameBaru = profilInputUsername ? profilInputUsername.value.trim() : usernameLama;
            const passwordLama = inputPwdLama ? inputPwdLama.value.trim() : '';
            const passwordBaru = inputPwdBaru ? inputPwdBaru.value.trim() : '';
            const konfirmasiPassword = inputPwdKonfirmasi ? inputPwdKonfirmasi.value.trim() : '';

            // Validasi username
            if (!usernameBaru) {
                if (profilInputUsername) profilInputUsername.classList.add('is-invalid');
                showProfilError('Username / nama akun tidak boleh kosong!');
                if (profilInputUsername) profilInputUsername.focus();
                return;
            }

            // Validasi password saat ini
            if (!passwordLama) {
                if (inputPwdLama) inputPwdLama.classList.add('is-invalid');
                showProfilError('Password saat ini (lama) wajib diisi untuk verifikasi!');
                if (inputPwdLama) inputPwdLama.focus();
                return;
            }

            // Jika admin mengisi password baru (ingin ganti password)
            if (passwordBaru) {
                if (passwordBaru.length < 3) {
                    if (inputPwdBaru) inputPwdBaru.classList.add('is-invalid');
                    showProfilError('Password baru minimal harus 3 karakter!');
                    if (inputPwdBaru) inputPwdBaru.focus();
                    return;
                }

                if (passwordBaru === passwordLama) {
                    if (inputPwdBaru) inputPwdBaru.classList.add('is-invalid');
                    showProfilError('Password baru tidak boleh sama dengan password saat ini!');
                    if (inputPwdBaru) inputPwdBaru.focus();
                    return;
                }

                if (!konfirmasiPassword) {
                    if (inputPwdKonfirmasi) inputPwdKonfirmasi.classList.add('is-invalid');
                    showProfilError('Konfirmasi password baru wajib diisi!');
                    if (inputPwdKonfirmasi) inputPwdKonfirmasi.focus();
                    return;
                }

                if (passwordBaru !== konfirmasiPassword) {
                    if (inputPwdKonfirmasi) inputPwdKonfirmasi.classList.add('is-invalid');
                    showProfilError('Konfirmasi password baru tidak cocok!');
                    if (inputPwdKonfirmasi) inputPwdKonfirmasi.focus();
                    return;
                }
            }

            // Tombol loading state
            const originalButtonHtml = btnSimpanPassword ? btnSimpanPassword.innerHTML : '';
            if (btnSimpanPassword) {
                btnSimpanPassword.disabled = true;
                btnSimpanPassword.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            }

            try {
                const hasil = await updateProfilAdmin({
                    usernameLama,
                    usernameBaru,
                    passwordLama,
                    passwordBaru,
                    konfirmasiPassword
                });

                if (hasil.sukses) {
                    const finalUsername = hasil.username || usernameBaru;
                    localStorage.setItem('simvenko_user', finalUsername);
                    updateProfilDisplay(finalUsername);
                    tutupModalProfilHandler();
                    if (typeof showToast === 'function') {
                        showToast(hasil.message || 'Profil berhasil diperbarui!', 'success');
                    }
                } else {
                    showProfilError(hasil.message || 'Gagal memperbarui profil!');
                    if (hasil.message && hasil.message.toLowerCase().includes('lama')) {
                        if (inputPwdLama) {
                            inputPwdLama.classList.add('is-invalid');
                            inputPwdLama.focus();
                        }
                    } else if (hasil.message && hasil.message.toLowerCase().includes('username')) {
                        if (profilInputUsername) {
                            profilInputUsername.classList.add('is-invalid');
                            profilInputUsername.focus();
                        }
                    }
                }
            } catch (err) {
                showProfilError('Terjadi kesalahan jaringan.');
            } finally {
                if (btnSimpanPassword) {
                    btnSimpanPassword.disabled = false;
                    btnSimpanPassword.innerHTML = originalButtonHtml;
                }
            }
        });
    }

    // --- 4. TOMBOL LOGOUT ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Hapus status login dari memori browser
            localStorage.removeItem('simvenko_login');
            localStorage.removeItem('simvenko_user');
            
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