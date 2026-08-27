document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. SISTEM LOGIN & SESI COOKIE ---
    const halamanLogin = document.getElementById('halaman-login');
    const sidebarUtama = document.getElementById('sidebar-utama');
    const kontenUtama = document.getElementById('konten-utama');
    const mainWrapper = document.getElementById('main-wrapper');
    const formLogin = document.getElementById('form-login');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');

    // Komponen Navigasi Mobile & Drawer
    const btnMobileToggle = document.getElementById('btn-mobile-toggle');
    const btnSidebarClose = document.getElementById('btn-sidebar-close');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const btnMobileThemeToggle = document.getElementById('btn-mobile-theme-toggle');
    const mobileThemeIcon = document.getElementById('mobile-theme-icon');
    const btnMobileUserAvatar = document.getElementById('btn-mobile-user-avatar');

    function openMobileSidebar() {
        if (sidebarUtama) sidebarUtama.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
        if (btnMobileToggle) btnMobileToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        if (sidebarUtama) sidebarUtama.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
        if (btnMobileToggle) btnMobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (btnMobileToggle) btnMobileToggle.addEventListener('click', openMobileSidebar);
    if (btnSidebarClose) btnSidebarClose.addEventListener('click', closeMobileSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            closeMobileSidebar();
        }
    });

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

    // Cek status sesi aktif dari server (HTTP-Only Cookie)
    async function verifikasiSesiLogin() {
        if (typeof checkAuthSession === 'function') {
            const auth = await checkAuthSession();
            if (auth && auth.loggedIn && auth.user) {
                localStorage.setItem('simvenko_login', 'true');
                localStorage.setItem('simvenko_user', auth.user.nama_lengkap || 'Administrator');
                localStorage.setItem('simvenko_uname', auth.user.username || 'admin');
                tampilkanHalamanUtama(auth.user);
                return true;
            }
        }
        
        // Fallback jika browser masih memiliki flag login
        if (localStorage.getItem('simvenko_login') === 'true') {
            tampilkanHalamanUtama();
        }
        return false;
    }

    // Jalankan verifikasi sesi saat pertama kali halaman dimuat
    verifikasiSesiLogin();

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
            // Kirim data ke server (password diverifikasi menggunakan Bcrypt di backend)
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameVal, password: passwordVal })
            });

            const hasil = await response.json();

            if (hasil.sukses && hasil.user) {
                // Simpan status dan profil pengguna
                localStorage.setItem('simvenko_login', 'true');
                localStorage.setItem('simvenko_user', hasil.user.nama_lengkap || 'Administrator');
                localStorage.setItem('simvenko_uname', hasil.user.username || usernameVal);
                tampilkanHalamanUtama(hasil.user);
            } else {
                showLoginError(hasil.message || 'Username atau password salah!');
            }
        } catch (error) {
            showLoginError('Terjadi kesalahan jaringan.');
        }
    });

    // --- FITUR PEEK PASSWORD DI HALAMAN LOGIN ---
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

    function updateProfilDisplay(userObj) {
        const namaLengkap = (userObj && userObj.nama_lengkap) || localStorage.getItem('simvenko_user') || 'Administrator';
        const uname = (userObj && userObj.username) || localStorage.getItem('simvenko_uname') || 'admin';

        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarUserUname = document.getElementById('sidebar-user-uname');
        const modalProfilDisplayName = document.getElementById('modal-profil-display-name');
        const modalProfilUnameBadge = document.getElementById('modal-profil-uname-badge');
        const profilInputNama = document.getElementById('profil-input-nama');
        const profilInputUsername = document.getElementById('profil-input-username');

        if (sidebarUserName) sidebarUserName.textContent = namaLengkap;
        if (sidebarUserUname) sidebarUserUname.textContent = `@${uname}`;
        if (modalProfilDisplayName) modalProfilDisplayName.textContent = namaLengkap;
        if (modalProfilUnameBadge) modalProfilUnameBadge.innerHTML = `<i class="fa-solid fa-at"></i> ${uname}`;
        if (profilInputNama) profilInputNama.value = namaLengkap;
        if (profilInputUsername) profilInputUsername.value = uname;
    }

    function tampilkanHalamanUtama(userObj) {
        halamanLogin.style.display = 'none'; // Sembunyikan layar login
        sidebarUtama.style.display = 'flex'; // Munculkan sidebar
        kontenUtama.style.display = 'block'; // Munculkan konten utama
        if (mainWrapper) mainWrapper.style.display = 'flex';
        updateProfilDisplay(userObj);
    }

    // Inisialisasi tampilan profil saat pertama kali dibuka
    updateProfilDisplay();

    // --- 2. LOGIKA NAVIGASI MENU ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const halamanSections = document.querySelectorAll('.halaman');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            halamanSections.forEach(hal => hal.classList.remove('active'));

            button.classList.add('active');
            const idTarget = button.id.replace('nav-', 'halaman-');
            const targetEl = document.getElementById(idTarget);
            if (targetEl) targetEl.classList.add('active');
            
            // Tutup sidebar otomatis di perangkat mobile saat navigasi dipilih
            closeMobileSidebar();
        });
    });

    // --- 3. FITUR PROFIL ADMIN & GANTI PASSWORD ---
    const btnBukaProfil = document.getElementById('btn-buka-profil');
    const modalProfil = document.getElementById('modal-profil-admin');
    const tutupModalProfil = document.getElementById('tutup-modal-profil');
    const batalProfil = document.getElementById('batal-profil');
    const formGantiPassword = document.getElementById('form-ganti-password');
    const profilError = document.getElementById('profil-error');
    const profilInputNama = document.getElementById('profil-input-nama');
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
        closeMobileSidebar();
        updateProfilDisplay();
        hideProfilError();
        if (formGantiPassword) formGantiPassword.reset();
        updateProfilDisplay();
        resetToggleIcon('toggle-pwd-lama', 'pwd-lama');
        resetToggleIcon('toggle-pwd-baru', 'pwd-baru');
        resetToggleIcon('toggle-pwd-konfirmasi', 'pwd-konfirmasi');
        if (modalProfil) {
            modalProfil.style.display = 'flex';
            if (profilInputNama) {
                profilInputNama.focus();
                profilInputNama.select();
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

    if (btnMobileUserAvatar) {
        btnMobileUserAvatar.addEventListener('click', bukaModalProfilHandler);
        btnMobileUserAvatar.addEventListener('keydown', (e) => {
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
        if (e.key === 'Escape') {
            if (modalProfil && modalProfil.style.display === 'flex') {
                tutupModalProfilHandler();
            }
            closeMobileSidebar();
        }
    });

    // Real-time update live preview nama lengkap saat admin mengetik
    if (profilInputNama) {
        profilInputNama.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const modalProfilDisplayName = document.getElementById('modal-profil-display-name');
            if (modalProfilDisplayName) {
                modalProfilDisplayName.textContent = val || 'Administrator';
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

            const namaLengkap = profilInputNama ? profilInputNama.value.trim() : '';
            const passwordLama = inputPwdLama ? inputPwdLama.value.trim() : '';
            const passwordBaru = inputPwdBaru ? inputPwdBaru.value.trim() : '';
            const konfirmasiPassword = inputPwdKonfirmasi ? inputPwdKonfirmasi.value.trim() : '';

            // Validasi nama lengkap
            if (!namaLengkap) {
                if (profilInputNama) profilInputNama.classList.add('is-invalid');
                showProfilError('Nama lengkap / tampilan tidak boleh kosong!');
                if (profilInputNama) profilInputNama.focus();
                return;
            }

            // Validasi password saat ini
            if (!passwordLama) {
                if (inputPwdLama) inputPwdLama.classList.add('is-invalid');
                showProfilError('Password saat ini (lama) wajib diisi untuk verifikasi keamanan!');
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
                    namaLengkap,
                    passwordLama,
                    passwordBaru,
                    konfirmasiPassword
                });

                if (hasil.sukses && hasil.user) {
                    localStorage.setItem('simvenko_user', hasil.user.nama_lengkap);
                    localStorage.setItem('simvenko_uname', hasil.user.username);
                    updateProfilDisplay(hasil.user);
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
        btnLogout.addEventListener('click', async () => {
            // Hapus sesi di server (clear cookie)
            if (typeof logoutUser === 'function') {
                await logoutUser();
            }

            // Hapus status login dari memori browser
            localStorage.removeItem('simvenko_login');
            localStorage.removeItem('simvenko_user');
            localStorage.removeItem('simvenko_uname');
            
            // Sembunyikan halaman utama dan tampilkan kembali halaman login
            sidebarUtama.style.display = 'none';
            kontenUtama.style.display = 'none';
            if (mainWrapper) mainWrapper.style.display = 'none';
            closeMobileSidebar();
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

    // --- 5. FITUR SIMPLE THEME TOGGLE BUTTON (DARK / LIGHT MODE) ---
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeModeIcon = document.getElementById('theme-mode-icon');

    function applyTheme(themeName, showNotification = false) {
        const isDark = themeName === 'dark';
        
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeModeIcon) {
                themeModeIcon.className = 'fa-solid fa-sun';
            }
            if (mobileThemeIcon) {
                mobileThemeIcon.className = 'fa-solid fa-sun';
            }
            if (btnThemeToggle) {
                btnThemeToggle.setAttribute('title', 'Beralih ke Mode Terang');
                btnThemeToggle.setAttribute('aria-label', 'Beralih ke Mode Terang');
            }
            if (btnMobileThemeToggle) {
                btnMobileThemeToggle.setAttribute('title', 'Beralih ke Mode Terang');
                btnMobileThemeToggle.setAttribute('aria-label', 'Beralih ke Mode Terang');
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeModeIcon) {
                themeModeIcon.className = 'fa-solid fa-moon';
            }
            if (mobileThemeIcon) {
                mobileThemeIcon.className = 'fa-solid fa-moon';
            }
            if (btnThemeToggle) {
                btnThemeToggle.setAttribute('title', 'Beralih ke Mode Gelap');
                btnThemeToggle.setAttribute('aria-label', 'Beralih ke Mode Gelap');
            }
            if (btnMobileThemeToggle) {
                btnMobileThemeToggle.setAttribute('title', 'Beralih ke Mode Gelap');
                btnMobileThemeToggle.setAttribute('aria-label', 'Beralih ke Mode Gelap');
            }
        }

        // Broadcast event agar chart / komponen lain dapat sinkronisasi secara real-time
        window.dispatchEvent(new CustomEvent('simvenko-theme-change', { detail: { theme: isDark ? 'dark' : 'light' } }));

        if (showNotification && typeof showToast === 'function') {
            showToast(`Tema beralih ke ${isDark ? 'Mode Gelap' : 'Mode Terang'}!`, 'info');
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('simvenko_theme');
        if (savedTheme) {
            applyTheme(savedTheme, false);
        } else {
            // Deteksi preferensi sistem pengguna jika belum pernah diset manual
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light', false);
        }
    }

    function toggleThemeHandler() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('simvenko_theme', nextTheme);
        applyTheme(nextTheme, true);
    }

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', toggleThemeHandler);
    }

    if (btnMobileThemeToggle) {
        btnMobileThemeToggle.addEventListener('click', toggleThemeHandler);
    }

    // Inisialisasi tema saat aplikasi dimuat
    initTheme();
});