// =========================================================
// DASHBOARD LOGIC & VISUALIZATION - SIMVENKO
// Mengelola Grafik Chart.js, Ringkasan Penjualan, & Peringatan Stok
// =========================================================

// Variabel Global untuk Instans Chart
let chartTrenTransaksi = null;
let chartKategoriStok = null;
let chartTopBarang = null;

// Filter Tab Peringatan Stok Aktif
let filterTabStokAlert = 'semua';

// Format Rupiah Helper
function formatRupiahDash(nominal) {
    if (isNaN(nominal) || nominal === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(nominal);
}

// Format Angka Ribuan Helper
function formatAngkaDash(num) {
    if (isNaN(num) || num === null) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
}

// Format Tanggal Indonesia
function formatTanggalIndo(tglStr) {
    if (!tglStr) return '-';
    try {
        const parts = tglStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            return dateObj.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        const dateObj = new Date(tglStr);
        return dateObj.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return tglStr;
    }
}

// Inisialisasi Tanggal Hari Ini di Header Dashboard
function initDashboardHeaderDate() {
    const el = document.getElementById('dash-current-date');
    if (el) {
        const today = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        el.textContent = today.toLocaleDateString('id-ID', options);
    }
}

// Fungsi Utama Render Dashboard
function renderDashboard(barangList, riwayatList, kategoriList) {
    initDashboardHeaderDate();

    const masterBarang = barangList || (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []);
    const masterRiwayat = riwayatList || (typeof globalDataRiwayat !== 'undefined' ? globalDataRiwayat : []);
    const masterKategori = kategoriList || (typeof globalDataKategori !== 'undefined' ? globalDataKategori : []);

    // Hanya gunakan barang aktif (!is_deleted) untuk perhitungan stok & aset
    const barangAktif = masterBarang.filter(item => !item.is_deleted);

    // 1. Hitung & Tampilkan KPI Stat Cards
    renderKpiStats(barangAktif, masterRiwayat);

    // 2. Analisis & Ringkasan Performa Penjualan & Inventaris (Executive Insight)
    renderSalesExecutiveSummary(barangAktif, masterRiwayat, masterBarang);

    // 3. Render Grafik Chart.js
    renderCharts(barangAktif, masterRiwayat, masterBarang);

    // 4. Render Tabel Peringatan Stok Rendah & Habis
    renderStockAlertList(barangAktif);

    // 5. Render Aktivitas Transaksi Terkini
    renderRecentTransactions(masterRiwayat, masterBarang);
}

// Helper untuk membangun Map info barang dengan multi-key (Case & Whitespace Insensitive)
function buildBarangInfoMap(barangList) {
    const map = new Map();
    (barangList || []).forEach(b => {
        if (!b) return;
        const rawId = b.id_barang !== undefined && b.id_barang !== null ? String(b.id_barang) : '';
        const trimId = rawId.trim();
        const lowerId = trimId.toLowerCase();
        
        const rawKat = (b.kategori && String(b.kategori).trim()) ? String(b.kategori).trim() : 'Umum';
        const info = {
            id_barang: trimId,
            nama: b.nama ? String(b.nama).trim() : trimId,
            kategori: rawKat,
            harga: Number(b.harga) || 0,
            satuan: b.satuan || 'Unit',
            stok: Number(b.stok) || 0,
            batas_minimum: Number(b.batas_minimum) || 0
        };

        if (rawId) map.set(rawId, info);
        if (trimId) map.set(trimId, info);
        if (lowerId) map.set(lowerId, info);
    });
    return map;
}

// Helper untuk mengambil info barang dari Map secara aman
function getBarangInfoFromMap(mapBarang, idBarang) {
    if (idBarang === undefined || idBarang === null) return null;
    const rawId = String(idBarang);
    const trimId = rawId.trim();
    const lowerId = trimId.toLowerCase();

    if (mapBarang.has(rawId)) return mapBarang.get(rawId);
    if (mapBarang.has(trimId)) return mapBarang.get(trimId);
    if (mapBarang.has(lowerId)) return mapBarang.get(lowerId);
    return null;
}

// --- 1. KPI STAT CARDS ---
function renderKpiStats(barangAktif, riwayatList) {
    let totalNilaiAset = 0;
    let stokMenipis = 0;
    let stokHabis = 0;

    barangAktif.forEach(item => {
        const stok = Number(item.stok) || 0;
        const harga = Number(item.harga) || 0;
        const batas = Number(item.batas_minimum) || 0;

        totalNilaiAset += (stok * harga);

        if (stok === 0) {
            stokHabis++;
        } else if (stok <= batas) {
            stokMenipis++;
        }
    });

    let totalBarangKeluar = 0;
    let totalOmsetKeluar = 0;
    let totalBarangMasuk = 0;

    const mapBarang = buildBarangInfoMap(typeof globalDataBarang !== 'undefined' ? globalDataBarang : barangAktif);

    riwayatList.forEach(trx => {
        const qty = Number(trx.jumlah) || 0;
        const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
        const hargaBarang = bInfo ? bInfo.harga : 0;
        const jenisLower = (trx.jenis || '').trim().toLowerCase();

        if (jenisLower === 'keluar') {
            totalBarangKeluar += qty;
            totalOmsetKeluar += (qty * hargaBarang);
        } else if (jenisLower === 'masuk') {
            totalBarangMasuk += qty;
        }
    });

    // Update elemen DOM KPI
    const elTotal = document.getElementById('dash-kpi-total-produk');
    const elAset = document.getElementById('dash-kpi-nilai-aset');
    const elKeluar = document.getElementById('dash-kpi-total-keluar');
    const elMasuk = document.getElementById('dash-kpi-total-masuk');
    const elMenipis = document.getElementById('dash-kpi-menipis');
    const elHabis = document.getElementById('dash-kpi-habis');

    // Kompatibilitas dengan elemen id lama
    const elOldTotal = document.getElementById('dash-total');
    const elOldMenipis = document.getElementById('dash-menipis');
    const elOldHabis = document.getElementById('dash-habis');
    if (elOldTotal) elOldTotal.innerText = barangAktif.length;
    if (elOldMenipis) elOldMenipis.innerText = stokMenipis;
    if (elOldHabis) elOldHabis.innerText = stokHabis;

    if (elTotal) elTotal.innerText = formatAngkaDash(barangAktif.length);
    if (elAset) elAset.innerText = formatRupiahDash(totalNilaiAset);
    if (elKeluar) elKeluar.innerText = `${formatAngkaDash(totalBarangKeluar)} Unit`;
    if (elMasuk) elMasuk.innerText = `${formatAngkaDash(totalBarangMasuk)} Unit`;
    if (elMenipis) elMenipis.innerText = `${stokMenipis} Item`;
    if (elHabis) elHabis.innerText = `${stokHabis} Item`;

    // Subtext KPI
    const elSubKeluar = document.getElementById('dash-kpi-sub-keluar');
    if (elSubKeluar) {
        elSubKeluar.innerText = `Omset: ${formatRupiahDash(totalOmsetKeluar)}`;
    }
}

// --- 2. EXECUTIVE SUMMARY (TELL ADMIN HOW SALES ARE GOING) ---
function renderSalesExecutiveSummary(barangAktif, riwayatList, allBarang) {
    const bannerEl = document.getElementById('dash-executive-summary');
    if (!bannerEl) return;

    // Buat Map info barang yang komprehensif (termasuk barang nonaktif jika ada)
    const masterList = (allBarang && allBarang.length > 0) 
        ? allBarang 
        : (typeof globalDataBarang !== 'undefined' ? globalDataBarang : barangAktif);
    const mapBarang = buildBarangInfoMap(masterList);

    // Analisis Transaksi Keluar (Penjualan / Pengeluaran)
    let totalQtyKeluar = 0;
    let totalOmset = 0;
    const itemKeluarMap = new Map(); // id_barang -> qty
    const kategoriKeluarMap = new Map(); // kategori -> qty

    riwayatList.forEach(trx => {
        const jenisLower = (trx.jenis || '').trim().toLowerCase();
        if (jenisLower === 'keluar') {
            const qty = Number(trx.jumlah) || 0;
            totalQtyKeluar += qty;

            const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
            const harga = bInfo ? bInfo.harga : 0;
            const kat = (bInfo && bInfo.kategori) ? bInfo.kategori : 'Umum';

            totalOmset += (qty * harga);

            const keyBarang = (bInfo && bInfo.id_barang) ? bInfo.id_barang : (trx.id_barang || 'Item');
            itemKeluarMap.set(keyBarang, (itemKeluarMap.get(keyBarang) || 0) + qty);
            kategoriKeluarMap.set(kat, (kategoriKeluarMap.get(kat) || 0) + qty);
        }
    });

    // Cari Produk Terlaris
    let topBarangId = null;
    let topBarangQty = 0;
    itemKeluarMap.forEach((qty, id) => {
        if (qty > topBarangQty) {
            topBarangQty = qty;
            topBarangId = id;
        }
    });

    let topBarangNama = '-';
    let topBarangKategori = '';
    if (topBarangId) {
        const bInfo = getBarangInfoFromMap(mapBarang, topBarangId);
        if (bInfo && bInfo.nama) {
            topBarangNama = bInfo.nama;
            topBarangKategori = bInfo.kategori;
        } else {
            topBarangNama = String(topBarangId);
        }
    }

    // Cari Kategori Terlaris / Dominan dari Penjualan
    let topKategoriNama = '-';
    let topKategoriQty = 0;
    kategoriKeluarMap.forEach((qty, kat) => {
        if (qty > topKategoriQty) {
            topKategoriQty = qty;
            topKategoriNama = kat;
        }
    });

    // Sinkronisasi kategori dominan dengan produk terlaris jika kategori terlaris adalah 'Umum' atau belum terpetakan
    if ((topKategoriNama === '-' || topKategoriNama === 'Umum') && topBarangKategori && topBarangKategori !== 'Umum') {
        topKategoriNama = topBarangKategori;
    }

    // Periksa Status Stok Habis / Menipis
    let stokHabisCount = 0;
    let stokMenipisCount = 0;
    barangAktif.forEach(item => {
        if (item.stok === 0) stokHabisCount++;
        else if (item.stok <= item.batas_minimum) stokMenipisCount++;
    });

    // Susun Narasi Eksekutif
    let statusText = '';
    let badgeText = 'Performa Stabil';

    if (totalQtyKeluar > 0) {
        statusText = `Aktivitas penjualan mencatatkan pergerakan sebesar <strong>${formatAngkaDash(totalQtyKeluar)} unit</strong> dengan akumulasi nilai perputaran <strong>${formatRupiahDash(totalOmset)}</strong>. `;
        if (topBarangNama !== '-' && topBarangNama !== 'Belum ada transaksi keluar') {
            statusText += `Produk paling diminati saat ini adalah <strong>${topBarangNama}</strong> (${formatAngkaDash(topBarangQty)} unit terjual)`;
            if (topKategoriNama && topKategoriNama !== '-' && topKategoriNama !== 'Umum') {
                statusText += ` dari kategori <strong>${topKategoriNama}</strong>. `;
            } else {
                statusText += `. `;
            }
        }
    } else {
        statusText = 'Belum ada transaksi barang keluar/penjualan yang tercatat. Sistem siap mencatat transaksi baru. ';
        topBarangNama = 'Belum ada transaksi keluar';
        topKategoriNama = '-';
    }

    if (stokHabisCount > 0 || stokMenipisCount > 0) {
        statusText += `<br><span style="color: #fde68a;"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Perhatian Stok:</strong> Ditemukan <strong>${stokHabisCount} item habis</strong> dan <strong>${stokMenipisCount} item mendekati batas minimum</strong>. Disarankan untuk segera melakukan restock.</span>`;
        badgeText = stokHabisCount > 0 ? 'Perlu Restock Segera' : 'Perhatian Stok';
    } else {
        statusText += '<br><span style="color: #a7f3d0;"><i class="fa-solid fa-circle-check"></i> Seluruh kondisi persediaan inventaris berada dalam batas aman.</span>';
        badgeText = 'Kondisi Stok Sehat';
    }

    const badgeEl = document.getElementById('dash-insight-badge');
    const textEl = document.getElementById('dash-insight-text');
    const pillOmset = document.getElementById('dash-pill-omset');
    const pillTopItem = document.getElementById('dash-pill-top-item');
    const pillTopCat = document.getElementById('dash-pill-top-cat');

    if (badgeEl) badgeEl.textContent = badgeText;
    if (textEl) textEl.innerHTML = statusText;
    if (pillOmset) pillOmset.innerHTML = `<i class="fa-solid fa-coins"></i> Total Omset: <strong>${formatRupiahDash(totalOmset)}</strong>`;
    if (pillTopItem) pillTopItem.innerHTML = `<i class="fa-solid fa-crown"></i> Produk Terlaris: <strong>${topBarangNama}</strong>`;
    if (pillTopCat) pillTopCat.innerHTML = `<i class="fa-solid fa-layer-group"></i> Kategori Dominan: <strong>${topKategoriNama}</strong>`;
}

// Helper cek Dark Mode aktif
function isDashboardDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// --- 3. GRAPHICS & CHARTS (CHART.JS) ---
function renderCharts(barangAktif, riwayatList, allBarang) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js belum dimuat.');
        return;
    }

    const isDark = isDashboardDarkMode();

    // Chart.js Default Typography & Color
    Chart.defaults.font.family = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
    Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';

    // A. Chart 1: Tren Transaksi & Penjualan (Bulan / Tanggal)
    renderChartTrenTransaksi(riwayatList);

    // B. Chart 2: Komposisi Stok per Kategori (Doughnut)
    renderChartKategoriStok(barangAktif);

    // C. Chart 3: Top 5 Barang Terlaris / Paling Banyak Keluar (Bar Horizontal)
    renderChartTopBarang(riwayatList, allBarang);
}

// A. Chart Tren Transaksi Masuk vs Keluar
function renderChartTrenTransaksi(riwayatList) {
    const canvas = document.getElementById('chart-tren-transaksi');
    if (!canvas) return;

    // Hancurkan instans sebelumnya jika ada
    if (chartTrenTransaksi) {
        chartTrenTransaksi.destroy();
    }

    const isDark = isDashboardDarkMode();

    // Kelompokkan data per tanggal atau per bulan (Urutkan kronologis)
    const dateMap = new Map(); // 'YYYY-MM-DD' atau 'YYYY-MM' -> { masuk: X, keluar: Y }

    // Salin dan urutkan transaksi dari terlama ke terbaru
    const sortedRiwayat = [...riwayatList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    sortedRiwayat.forEach(trx => {
        if (!trx.tanggal) return;
        const tglStr = trx.tanggal.split('T')[0];
        if (!dateMap.has(tglStr)) {
            dateMap.set(tglStr, { masuk: 0, keluar: 0 });
        }
        const entry = dateMap.get(tglStr);
        const qty = Number(trx.jumlah) || 0;
        const jenisLower = (trx.jenis || '').trim().toLowerCase();
        if (jenisLower === 'masuk') entry.masuk += qty;
        else if (jenisLower === 'keluar') entry.keluar += qty;
    });

    // Ambil maksimal 10 titik tanggal terakhir jika terlalu banyak
    let labels = Array.from(dateMap.keys());
    if (labels.length > 10) {
        labels = labels.slice(labels.length - 10);
    }

    // Jika tidak ada data transaksi, buat dummy placeholder yang informatif
    if (labels.length === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        labels = [todayStr];
        dateMap.set(todayStr, { masuk: 0, keluar: 0 });
    }

    const formattedLabels = labels.map(l => formatTanggalIndo(l));
    const dataMasuk = labels.map(l => (dateMap.get(l) ? dateMap.get(l).masuk : 0));
    const dataKeluar = labels.map(l => (dateMap.get(l) ? dateMap.get(l).keluar : 0));

    const ctx = canvas.getContext('2d');
    chartTrenTransaksi = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [
                {
                    label: 'Barang Keluar (Penjualan)',
                    data: dataKeluar,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#38bdf8',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Barang Masuk (Restock)',
                    data: dataMasuk,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 10.5, weight: '600' },
                        color: isDark ? '#cbd5e1' : '#475569',
                        padding: 8
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#0b1120' : '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: isDark ? '#334155' : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    titleFont: { size: 11, weight: 'bold' },
                    bodyFont: { size: 10.5 },
                    padding: 6,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${context.raw} Unit`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { 
                        font: { size: 9.5 },
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9' },
                    ticks: {
                        precision: 0,
                        font: { size: 9.5 },
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                }
            }
        }
    });
}

// B. Chart Komposisi Stok per Kategori (Doughnut)
function renderChartKategoriStok(barangAktif) {
    const canvas = document.getElementById('chart-kategori-stok');
    if (!canvas) return;

    if (chartKategoriStok) {
        chartKategoriStok.destroy();
    }

    const isDark = isDashboardDarkMode();
    const catMap = new Map();
    barangAktif.forEach(item => {
        const kat = item.kategori || 'Tanpa Kategori';
        const stok = Number(item.stok) || 0;
        catMap.set(kat, (catMap.get(kat) || 0) + stok);
    });

    const labels = Array.from(catMap.keys());
    const dataValues = Array.from(catMap.values());

    // Warna Palet Harmonious Modern
    const modernColors = [
        '#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
        '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#64748b'
    ];

    const ctx = canvas.getContext('2d');

    if (labels.length === 0 || dataValues.every(v => v === 0)) {
        chartKategoriStok = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Belum Ada Stok'],
                datasets: [{
                    data: [1],
                    backgroundColor: [isDark ? '#334155' : '#e2e8f0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        return;
    }

    chartKategoriStok = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: modernColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: isDark ? '#151f32' : '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 10, weight: '500' },
                        color: isDark ? '#cbd5e1' : '#475569',
                        padding: 6
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#0b1120' : '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: isDark ? '#334155' : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    titleFont: { size: 11, weight: 'bold' },
                    bodyFont: { size: 10.5 },
                    padding: 6,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.raw;
                            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val} Unit (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// C. Chart Top 5 Barang Terlaris (Bar Horizontal)
function renderChartTopBarang(riwayatList, allBarang) {
    const canvas = document.getElementById('chart-top-barang');
    if (!canvas) return;

    if (chartTopBarang) {
        chartTopBarang.destroy();
    }

    const isDark = isDashboardDarkMode();
    const masterList = (allBarang && allBarang.length > 0) 
        ? allBarang 
        : (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []);
    const mapBarang = buildBarangInfoMap(masterList);

    const itemKeluarMap = new Map();
    riwayatList.forEach(trx => {
        const jenisLower = (trx.jenis || '').trim().toLowerCase();
        if (jenisLower === 'keluar') {
            const qty = Number(trx.jumlah) || 0;
            const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
            const keyBarang = (bInfo && bInfo.id_barang) ? bInfo.id_barang : (trx.id_barang || 'Item');
            itemKeluarMap.set(keyBarang, (itemKeluarMap.get(keyBarang) || 0) + qty);
        }
    });

    // Urutkan top 5
    const sortedItems = Array.from(itemKeluarMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    let labels = [];
    let dataValues = [];

    if (sortedItems.length > 0) {
        labels = sortedItems.map(([id]) => {
            const bInfo = getBarangInfoFromMap(mapBarang, id);
            return (bInfo && bInfo.nama) ? bInfo.nama : id;
        });
        dataValues = sortedItems.map(([, qty]) => qty);
    } else {
        labels = ['Belum ada penjualan'];
        dataValues = [0];
    }

    const ctx = canvas.getContext('2d');
    chartTopBarang = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Unit Terjual / Keluar',
                data: dataValues,
                backgroundColor: isDark ? '#38bdf8' : '#3b82f6',
                borderRadius: 4,
                barPercentage: 0.55
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#0b1120' : '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: isDark ? '#334155' : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                    titleFont: { size: 11, weight: 'bold' },
                    bodyFont: { size: 10.5 },
                    padding: 6,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return ` Total Keluar: ${context.raw} Unit`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: isDark ? 'rgba(51, 65, 85, 0.4)' : '#f1f5f9' },
                    ticks: { 
                        precision: 0, 
                        font: { size: 9.5 },
                        color: isDark ? '#94a3b8' : '#64748b'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        color: isDark ? '#cbd5e1' : '#475569'
                    }
                }
            }
        }
    });
}

// --- 4. EXPLICIT STOCK ALERTS TABLE & PANEL ---
function renderStockAlertList(barangAktif) {
    const tbody = document.getElementById('tbody-stock-alerts');
    const badgeCount = document.getElementById('dash-alert-count-badge');
    const emptyState = document.getElementById('stock-alert-empty-state');
    const tableWrapper = document.getElementById('stock-alert-table-wrapper');

    if (!tbody) return;

    // Filter barang yang bermasalah stok
    const alertItems = barangAktif.filter(item => {
        const stok = Number(item.stok) || 0;
        const batas = Number(item.batas_minimum) || 0;
        return (stok === 0 || stok <= batas);
    });

    // Update Badge Count
    if (badgeCount) {
        badgeCount.innerText = `${alertItems.length} Perlu Tindakan`;
        badgeCount.style.display = alertItems.length > 0 ? 'inline-block' : 'none';
    }

    // Filter berdasarkan Tab Aktif ('semua', 'habis', 'menipis')
    let displayItems = alertItems;
    if (filterTabStokAlert === 'habis') {
        displayItems = alertItems.filter(i => (Number(i.stok) || 0) === 0);
    } else if (filterTabStokAlert === 'menipis') {
        displayItems = alertItems.filter(i => {
            const s = Number(i.stok) || 0;
            const b = Number(i.batas_minimum) || 0;
            return s > 0 && s <= b;
        });
    }

    if (displayItems.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (tableWrapper) tableWrapper.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';

    tbody.innerHTML = '';
    displayItems.forEach(item => {
        const stok = Number(item.stok) || 0;
        const batas = Number(item.batas_minimum) || 0;
        const isHabis = (stok === 0);
        const statusClass = isHabis ? 'habis' : 'menipis';
        const statusText = isHabis ? 'Habis (0)' : 'Menipis';
        const statusIcon = isHabis ? 'fa-circle-xmark' : 'fa-triangle-exclamation';

        // Hitung estimasi % kapasitas terhadap batas aman
        const pct = batas > 0 ? Math.min(100, Math.round((stok / batas) * 100)) : 0;
        const restockSaran = Math.max(batas * 2 - stok, 10);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.id_barang}</strong></td>
            <td>
                <div style="font-weight: 600; color: #1e293b;">${item.nama}</div>
                <small style="color: #64748b; font-size: 11.5px;">${formatRupiahDash(item.harga)} / ${item.satuan}</small>
            </td>
            <td><span class="badge-kategori-tbl" style="background:#f1f5f9; padding:3px 8px; border-radius:4px; font-size:12px;">${item.kategori || '-'}</span></td>
            <td>
                <div class="stock-bar-wrapper">
                    <span style="font-weight: 700; font-size: 13px; color: ${isHabis ? '#dc2626' : '#d97706'};">
                        ${stok}
                    </span>
                    <span style="color: #94a3b8; font-size: 11.5px;">/ min. ${batas}</span>
                    <div class="stock-progress-bg" title="${pct}% batas stok">
                        <div class="stock-progress-fill ${statusClass}" style="width: ${isHabis ? '100%' : pct + '%'};"></div>
                    </div>
                </div>
            </td>
            <td>
                <span class="stock-status-pill ${statusClass}">
                    <i class="fa-solid ${statusIcon}"></i> ${statusText}
                </span>
            </td>
            <td>
                <button type="button" class="btn-quick-restock" data-id="${item.id_barang}" data-nama="${item.nama}" title="Buka form restock untuk ${item.nama}">
                    <i class="fa-solid fa-plus-circle"></i> Restock (+${restockSaran})
                </button>
            </td>
        `;

        // Event listener tombol Restock Cepat
        const btnRestock = tr.querySelector('.btn-quick-restock');
        if (btnRestock) {
            btnRestock.addEventListener('click', () => {
                bukaModalRestockCepat(item.id_barang, restockSaran);
            });
        }

        tbody.appendChild(tr);
    });
}

// Buka Modal Transaksi Masuk untuk Restock Cepat
function bukaModalRestockCepat(idBarang, saranQty) {
    // 1. Pindah ke halaman transaksi
    const navTransaksi = document.getElementById('nav-transaksi');
    if (navTransaksi) {
        navTransaksi.click();
    }

    // 2. Buka modal transaksi
    const btnTambahTransaksi = document.getElementById('btn-tambah-transaksi');
    if (btnTambahTransaksi) {
        btnTambahTransaksi.click();
    } else {
        const modalTrx = document.getElementById('modal-transaksi');
        if (modalTrx) modalTrx.style.display = 'flex';
    }

    // 3. Pilih tipe 'masuk'
    const cardTrxMasuk = document.getElementById('card-trx-masuk');
    if (cardTrxMasuk) {
        cardTrxMasuk.click();
    }

    // 4. Isi field barang, jumlah saran, dan keterangan supplier
    const selectBarang = document.getElementById('trx-barang');
    const inputJumlah = document.getElementById('trx-jumlah');
    const inputKet = document.getElementById('trx-keterangan');

    if (selectBarang) {
        selectBarang.value = idBarang;
        selectBarang.dispatchEvent(new Event('change'));
    }

    if (inputJumlah) {
        inputJumlah.value = saranQty || 10;
        inputJumlah.dispatchEvent(new Event('input'));
    }

    if (inputKet) {
        inputKet.value = 'Supplier Restock';
    }
}

// Inisialisasi Event Listener Tab Filter Peringatan Stok
function initStockAlertTabs() {
    const tabs = document.querySelectorAll('.stock-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterTabStokAlert = tab.getAttribute('data-tab') || 'semua';
            
            const masterBarang = (typeof globalDataBarang !== 'undefined') ? globalDataBarang : [];
            const barangAktif = masterBarang.filter(item => !item.is_deleted);
            renderStockAlertList(barangAktif);
        });
    });
}

// --- 5. RECENT TRANSACTIONS PREVIEW ---
function renderRecentTransactions(riwayatList, allBarang) {
    const tbody = document.getElementById('tbody-dash-recent-trx');
    if (!tbody) return;

    const masterList = (allBarang && allBarang.length > 0) 
        ? allBarang 
        : (typeof globalDataBarang !== 'undefined' ? globalDataBarang : []);
    const mapBarang = buildBarangInfoMap(masterList);

    const recent5 = (riwayatList || []).slice(0, 5);

    if (recent5.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 24px; color: #94a3b8;">
                    <i class="fa-solid fa-receipt" style="font-size:24px; margin-bottom:6px; display:block;"></i>
                    Belum ada riwayat transaksi yang tercatat.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    recent5.forEach(trx => {
        const isMasuk = (trx.jenis || '').trim().toLowerCase() === 'masuk';
        const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
        const namaBarang = bInfo ? bInfo.nama : (trx.id_barang || '-');
        const jenisBadge = isMasuk
            ? `<span class="badge-trx-type masuk"><i class="fa-solid fa-arrow-down"></i> Masuk</span>`
            : `<span class="badge-trx-type keluar"><i class="fa-solid fa-arrow-up"></i> Keluar</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${trx.id_transaksi}</strong></td>
            <td>${formatTanggalIndo(trx.tanggal)}</td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${namaBarang}</div>
                <small style="color:var(--text-muted); font-size:11px;">ID: ${trx.id_barang}</small>
            </td>
            <td>${jenisBadge}</td>
            <td><strong>${formatAngkaDash(trx.jumlah)}</strong> Unit</td>
            <td>${trx.asal_tujuan || trx.keterangan || '-'}</td>
            <td><span class="badge-admin-tag"><i class="fa-solid fa-user-shield"></i> ${trx.petugas || trx.admin || 'admin'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 6. FUNGSI EKSPOR LAPORAN DASHBOARD KE PDF (jsPDF + autoTable) ---
function exportDashboardPDF() {
    const masterBarang = typeof globalDataBarang !== 'undefined' ? globalDataBarang : [];
    const masterRiwayat = typeof globalDataRiwayat !== 'undefined' ? globalDataRiwayat : [];
    const masterKategori = typeof globalDataKategori !== 'undefined' ? globalDataKategori : [];
    const barangAktif = masterBarang.filter(item => !item.is_deleted);

    if (barangAktif.length === 0 && masterRiwayat.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Tidak ada data dashboard untuk diekspor ke PDF.', 'warning');
        } else {
            alert('Tidak ada data dashboard untuk diekspor ke PDF.');
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
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const waktuStr = sekarang.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const adminUser = (typeof getExportAdminUser === 'function') 
            ? getExportAdminUser() 
            : (() => {
                const nama = localStorage.getItem('simvenko_user') || 'Administrator';
                const uname = localStorage.getItem('simvenko_uname') || 'admin';
                return uname ? `${nama} (@${uname})` : nama;
            })();

        const mapBarang = buildBarangInfoMap(masterBarang);

        // Perhitungan KPI
        let totalStokFisik = 0;
        let totalNilaiAset = 0;
        let stokHabisList = [];
        let stokMenipisList = [];

        barangAktif.forEach(item => {
            const stok = Number(item.stok) || 0;
            const harga = Number(item.harga) || 0;
            const batas = Number(item.batas_minimum) || 0;

            totalStokFisik += stok;
            totalNilaiAset += (stok * harga);

            if (stok === 0) {
                stokHabisList.push(item);
            } else if (stok <= batas) {
                stokMenipisList.push(item);
            }
        });

        const stokAmanCount = barangAktif.length - stokHabisList.length - stokMenipisList.length;

        // Perhitungan Transaksi & Omset
        let totalBarangKeluar = 0;
        let totalOmsetKeluar = 0;
        let totalBarangMasuk = 0;
        const itemKeluarMap = new Map();
        const kategoriStatsMap = new Map();

        // Inisialisasi kategori dari master barang
        barangAktif.forEach(b => {
            const kat = (b.kategori && String(b.kategori).trim()) ? String(b.kategori).trim() : 'Umum';
            if (!kategoriStatsMap.has(kat)) {
                kategoriStatsMap.set(kat, {
                    kategori: kat,
                    skuCount: 0,
                    totalStok: 0,
                    qtyKeluar: 0,
                    omsetKeluar: 0,
                    nilaiAset: 0
                });
            }
            const s = kategoriStatsMap.get(kat);
            s.skuCount += 1;
            s.totalStok += Number(b.stok) || 0;
            s.nilaiAset += (Number(b.stok) || 0) * (Number(b.harga) || 0);
        });

        masterRiwayat.forEach(trx => {
            const qty = Number(trx.jumlah) || 0;
            const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
            const harga = bInfo ? bInfo.harga : 0;
            const kat = (bInfo && bInfo.kategori) ? bInfo.kategori : 'Umum';
            const jenisLower = (trx.jenis || '').trim().toLowerCase();

            if (jenisLower === 'keluar') {
                totalBarangKeluar += qty;
                const omsetTrx = (qty * harga);
                totalOmsetKeluar += omsetTrx;

                const keyId = (bInfo && bInfo.id_barang) ? bInfo.id_barang : (trx.id_barang || 'Item');
                if (!itemKeluarMap.has(keyId)) {
                    itemKeluarMap.set(keyId, {
                        id_barang: keyId,
                        nama: bInfo ? bInfo.nama : (trx.id_barang || keyId),
                        kategori: kat,
                        harga: harga,
                        satuan: bInfo ? bInfo.satuan : 'Unit',
                        qtyKeluar: 0,
                        omsetKeluar: 0
                    });
                }
                const itm = itemKeluarMap.get(keyId);
                itm.qtyKeluar += qty;
                itm.omsetKeluar += omsetTrx;

                if (!kategoriStatsMap.has(kat)) {
                    kategoriStatsMap.set(kat, {
                        kategori: kat,
                        skuCount: 0,
                        totalStok: 0,
                        qtyKeluar: 0,
                        omsetKeluar: 0,
                        nilaiAset: 0
                    });
                }
                const statKat = kategoriStatsMap.get(kat);
                statKat.qtyKeluar += qty;
                statKat.omsetKeluar += omsetTrx;
            } else if (jenisLower === 'masuk') {
                totalBarangMasuk += qty;
            }
        });

        // Urutkan Produk Terlaris (Top Selling Items)
        const topSellingItems = Array.from(itemKeluarMap.values())
            .sort((a, b) => b.qtyKeluar - a.qtyKeluar)
            .slice(0, 5);

        // Urutkan Data Kategori
        const kategoriListSorted = Array.from(kategoriStatsMap.values())
            .sort((a, b) => b.nilaiAset - a.nilaiAset);

        // --- DRAW HEADER ---
        // Header Background Banner
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(14, 12, 182, 22, 'F');

        // Brand Accent Line
        doc.setFillColor(59, 130, 246); // Blue 500
        doc.rect(14, 12, 4, 22, 'F');

        // Header Title Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('SIMVENKO - SISTEM MANAJEMEN INVENTARIS', 22, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(203, 213, 225); // Slate 300
        doc.text('LAPORAN RINGKASAN EKSEKUTIF & ANALISIS DATA DASHBOARD', 22, 28);

        // Metadata Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 37, 182, 16, 2, 2, 'FD');

        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // Slate 600

        // Kolom Metadata Kiri
        doc.text(`Waktu Laporan : ${tglStr}, ${waktuStr} WIB`, 18, 43);
        doc.text(`Administrator   : ${adminUser}`, 18, 49);

        // Kolom Metadata Kanan
        doc.text(`Total SKU Aktif : ${barangAktif.length} Jenis Produk (${formatAngkaDash(totalStokFisik)} Unit)`, 110, 43);
        doc.text(`Status Analisis  : Data Real-Time Operasional Persediaan`, 110, 49);

        let currentY = 57;

        // --- SECTION 1: RINGKASAN INDIKATOR KUNCI (KPI OVERVIEW) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Ringkasan Indikator Kunci Persediaan & Penjualan (KPI)', 14, currentY);

        const kpiTableData = [
            [
                { content: 'Total Nilai Aset Inventaris', styles: { fontStyle: 'bold' } },
                { content: formatRupiahDash(totalNilaiAset), styles: { fontStyle: 'bold', textColor: [5, 150, 105] } },
                { content: 'Total Barang Masuk (Pengadaan)', styles: { fontStyle: 'bold' } },
                { content: `${formatAngkaDash(totalBarangMasuk)} Unit`, styles: { fontStyle: 'bold' } }
            ],
            [
                { content: 'Total Penjualan (Barang Keluar)', styles: { fontStyle: 'bold' } },
                { content: `${formatAngkaDash(totalBarangKeluar)} Unit`, styles: { fontStyle: 'bold' } },
                { content: 'Kondisi Stok Habis (Kritis)', styles: { fontStyle: 'bold' } },
                { content: `${stokHabisList.length} Item`, styles: { fontStyle: 'bold', textColor: stokHabisList.length > 0 ? [220, 38, 38] : [22, 163, 74] } }
            ],
            [
                { content: 'Akumulasi Omset Penjualan', styles: { fontStyle: 'bold' } },
                { content: formatRupiahDash(totalOmsetKeluar), styles: { fontStyle: 'bold', textColor: [37, 99, 235] } },
                { content: 'Kondisi Stok Menipis (Reorder)', styles: { fontStyle: 'bold' } },
                { content: `${stokMenipisList.length} Item`, styles: { fontStyle: 'bold', textColor: stokMenipisList.length > 0 ? [217, 119, 6] : [22, 163, 74] } }
            ]
        ];

        doc.autoTable({
            body: kpiTableData,
            startY: currentY + 3,
            margin: { left: 14, right: 14 },
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 2.8,
                textColor: [30, 41, 59],
                lineColor: [226, 232, 240],
                lineWidth: 0.3
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 50, fillColor: [241, 245, 249] },
                1: { cellWidth: 41 },
                2: { cellWidth: 50, fillColor: [241, 245, 249] },
                3: { cellWidth: 41 }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // --- SECTION 2: ANALISIS KINERJA & DISTRIBUSI KATEGORI ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('2. Distribusi Persediaan & Kinerja per Kategori', 14, currentY);

        const kategoriTableCols = [
            { header: 'No', dataKey: 'no' },
            { header: 'Nama Kategori', dataKey: 'kategori' },
            { header: 'Varian SKU', dataKey: 'sku' },
            { header: 'Stok Fisik', dataKey: 'stok' },
            { header: 'Terjual (Unit)', dataKey: 'terjual' },
            { header: 'Estimasi Omset', dataKey: 'omset' },
            { header: 'Nilai Aset Persediaan', dataKey: 'aset' }
        ];

        const kategoriTableRows = kategoriListSorted.map((kat, idx) => ({
            no: (idx + 1).toString(),
            kategori: kat.kategori,
            sku: `${kat.skuCount} SKU`,
            stok: `${formatAngkaDash(kat.totalStok)} unit`,
            terjual: `${formatAngkaDash(kat.qtyKeluar)} unit`,
            omset: formatRupiahDash(kat.omsetKeluar),
            aset: formatRupiahDash(kat.nilaiAset)
        }));

        // Tambahkan baris Total
        kategoriTableRows.push({
            no: '',
            kategori: 'TOTAL KESELURUHAN',
            sku: `${barangAktif.length} SKU`,
            stok: `${formatAngkaDash(totalStokFisik)} unit`,
            terjual: `${formatAngkaDash(totalBarangKeluar)} unit`,
            omset: formatRupiahDash(totalOmsetKeluar),
            aset: formatRupiahDash(totalNilaiAset)
        });

        doc.autoTable({
            columns: kategoriTableCols,
            body: kategoriTableRows,
            startY: currentY + 3,
            margin: { left: 14, right: 14 },
            theme: 'striped',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 2.2,
                textColor: [30, 41, 59]
            },
            headStyles: {
                fillColor: [37, 99, 235], // Blue 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            columnStyles: {
                no: { halign: 'center', cellWidth: 10 },
                kategori: { fontStyle: 'bold', cellWidth: 38 },
                sku: { halign: 'center', cellWidth: 22 },
                stok: { halign: 'right', cellWidth: 24 },
                terjual: { halign: 'right', cellWidth: 24 },
                omset: { halign: 'right', cellWidth: 32 },
                aset: { halign: 'right', cellWidth: 32 }
            },
            didParseCell: function(dataCell) {
                if (dataCell.row.index === kategoriTableRows.length - 1) {
                    dataCell.cell.styles.fontStyle = 'bold';
                    dataCell.cell.styles.fillColor = [226, 232, 240];
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // Cek apakah sisa halaman mencukupi untuk section berikutnya
        if (currentY > 230) {
            doc.addPage();
            currentY = 18;
        }

        // --- SECTION 3: 5 PRODUK TERLARIS (TOP FAST MOVING) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('3. Produk Terlaris & Fast-Moving (Top Selling)', 14, currentY);

        if (topSellingItems.length > 0) {
            const topCols = [
                { header: 'Peringkat', dataKey: 'rank' },
                { header: 'Kode', dataKey: 'kode' },
                { header: 'Nama Produk', dataKey: 'nama' },
                { header: 'Kategori', dataKey: 'kategori' },
                { header: 'Harga Satuan', dataKey: 'harga' },
                { header: 'Qty Terjual', dataKey: 'terjual' },
                { header: 'Kontribusi Omset', dataKey: 'omset' }
            ];

            const topRows = topSellingItems.map((itm, idx) => ({
                rank: `#${idx + 1}`,
                kode: itm.id_barang,
                nama: itm.nama,
                kategori: itm.kategori,
                harga: formatRupiahDash(itm.harga),
                terjual: `${formatAngkaDash(itm.qtyKeluar)} ${itm.satuan}`,
                omset: formatRupiahDash(itm.omsetKeluar)
            }));

            doc.autoTable({
                columns: topCols,
                body: topRows,
                startY: currentY + 3,
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 2.2,
                    textColor: [30, 41, 59]
                },
                headStyles: {
                    fillColor: [79, 70, 229], // Indigo 600
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5
                },
                columnStyles: {
                    rank: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
                    kode: { cellWidth: 22, fontStyle: 'bold' },
                    nama: { cellWidth: 46 },
                    kategori: { cellWidth: 26 },
                    harga: { halign: 'right', cellWidth: 24 },
                    terjual: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
                    omset: { halign: 'right', cellWidth: 26, fontStyle: 'bold' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text('Belum ada data transaksi barang keluar/penjualan yang tercatat.', 14, currentY + 5);
            currentY += 12;
        }

        // Cek halaman untuk Section 4
        if (currentY > 225) {
            doc.addPage();
            currentY = 18;
        }

        // --- SECTION 4: PERINGATAN KESEHATAN STOK (STOK HABIS & MENIPIS) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('4. Peringatan Persediaan Kritis (Stok Habis & Menipis)', 14, currentY);

        const allAlerts = [
            ...stokHabisList.map(b => ({ ...b, alertType: 'Habis' })),
            ...stokMenipisList.map(b => ({ ...b, alertType: 'Menipis' }))
        ];

        if (allAlerts.length > 0) {
            const alertCols = [
                { header: 'No', dataKey: 'no' },
                { header: 'Kode', dataKey: 'kode' },
                { header: 'Nama Produk', dataKey: 'nama' },
                { header: 'Kategori', dataKey: 'kategori' },
                { header: 'Sisa Stok', dataKey: 'stok' },
                { header: 'Min. Stok', dataKey: 'min' },
                { header: 'Status', dataKey: 'status' },
                { header: 'Rekomendasi Tindakan', dataKey: 'rekomendasi' }
            ];

            const alertRows = allAlerts.map((item, idx) => {
                const isHabis = item.alertType === 'Habis';
                const saranRestock = Math.max(10, (item.batas_minimum || 5) * 2 - (item.stok || 0));
                return {
                    no: (idx + 1).toString(),
                    kode: item.id_barang,
                    nama: item.nama,
                    kategori: item.kategori || 'Umum',
                    stok: `${item.stok} ${item.satuan || 'Unit'}`,
                    min: `${item.batas_minimum || 0}`,
                    status: isHabis ? 'HABIS (0)' : 'MENIPIS',
                    rekomendasi: `Segera Restock (+${saranRestock} ${item.satuan || 'Unit'})`
                };
            });

            doc.autoTable({
                columns: alertCols,
                body: alertRows,
                startY: currentY + 3,
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 2.2,
                    textColor: [30, 41, 59]
                },
                headStyles: {
                    fillColor: [220, 38, 38], // Red 600
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5
                },
                columnStyles: {
                    no: { halign: 'center', cellWidth: 10 },
                    kode: { cellWidth: 20, fontStyle: 'bold' },
                    nama: { cellWidth: 42 },
                    kategori: { cellWidth: 24 },
                    stok: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
                    min: { halign: 'center', cellWidth: 16 },
                    status: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
                    rekomendasi: { cellWidth: 28 }
                },
                didParseCell: function(dataCell) {
                    if (dataCell.section === 'body' && dataCell.column.dataKey === 'status') {
                        if (dataCell.cell.raw.includes('HABIS')) {
                            dataCell.cell.styles.textColor = [220, 38, 38];
                        } else {
                            dataCell.cell.styles.textColor = [217, 119, 6];
                        }
                    }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(22, 163, 74); // Green 600
            doc.text('Kondisi persediaan aman: Tidak ada produk yang berada di bawah batas minimum stok saat ini.', 14, currentY + 5);
            currentY += 12;
        }

        // Cek halaman untuk Section 5
        if (currentY > 220) {
            doc.addPage();
            currentY = 18;
        }

        // --- SECTION 5: AKTIVITAS TRANSAKSI TERBARU (RECENT TRANSACTIONS) ---
        const recentTrx = masterRiwayat.slice(0, 8);
        if (recentTrx.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(30, 41, 59);
            doc.text('5. Riwayat Aktivitas Transaksi Terkini', 14, currentY);

            const trxCols = [
                { header: 'ID Transaksi', dataKey: 'id' },
                { header: 'Tanggal', dataKey: 'tgl' },
                { header: 'Jenis', dataKey: 'jenis' },
                { header: 'Nama Produk', dataKey: 'nama' },
                { header: 'Jumlah', dataKey: 'jumlah' },
                { header: 'Asal / Tujuan', dataKey: 'asal' },
                { header: 'Admin', dataKey: 'admin' }
            ];

            const trxRows = recentTrx.map(trx => {
                const isMasuk = (trx.jenis || '').trim().toLowerCase() === 'masuk';
                const bInfo = getBarangInfoFromMap(mapBarang, trx.id_barang);
                return {
                    id: trx.id_transaksi,
                    tgl: formatTanggalIndo(trx.tanggal),
                    jenis: isMasuk ? 'Masuk' : 'Keluar',
                    nama: bInfo ? bInfo.nama : (trx.id_barang || '-'),
                    jumlah: `${formatAngkaDash(trx.jumlah)} Unit`,
                    asal: trx.asal_tujuan || trx.keterangan || '-',
                    admin: trx.petugas || trx.admin || 'Admin'
                };
            });

            doc.autoTable({
                columns: trxCols,
                body: trxRows,
                startY: currentY + 3,
                margin: { left: 14, right: 14 },
                theme: 'striped',
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 2.2,
                    textColor: [30, 41, 59]
                },
                headStyles: {
                    fillColor: [15, 118, 110], // Teal 700
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5
                },
                columnStyles: {
                    id: { cellWidth: 24, fontStyle: 'bold' },
                    tgl: { cellWidth: 24 },
                    jenis: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
                    nama: { cellWidth: 40 },
                    jumlah: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
                    asal: { cellWidth: 36 },
                    admin: { halign: 'center', cellWidth: 20 }
                },
                didParseCell: function(dataCell) {
                    if (dataCell.section === 'body' && dataCell.column.dataKey === 'jenis') {
                        if (dataCell.cell.raw === 'Masuk') {
                            dataCell.cell.styles.textColor = [22, 163, 74];
                        } else {
                            dataCell.cell.styles.textColor = [37, 99, 235];
                        }
                    }
                }
            });
        }

        // --- NUMBER OF PAGES & FOOTER ON ALL PAGES ---
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Thin Footer Divider Line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(14, 285, 196, 285);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); // Slate 400
            doc.text(
                `SIMVENKO - Sistem Informasi Manajemen Inventaris | Dicetak oleh: ${adminUser}`,
                14,
                290
            );
            doc.text(
                `Halaman ${i} dari ${totalPages}`,
                196,
                290,
                { align: 'right' }
            );
        }

        const padZero = (n) => String(n).padStart(2, '0');
        const fileDateStr = `${sekarang.getFullYear()}${padZero(sekarang.getMonth() + 1)}${padZero(sekarang.getDate())}_${padZero(sekarang.getHours())}${padZero(sekarang.getMinutes())}`;
        const fileName = `laporan_dashboard_eksekutif_${fileDateStr}.pdf`;

        doc.save(fileName);

        if (typeof showToast === 'function') {
            showToast('Laporan dashboard berhasil diekspor ke format PDF!', 'success');
        }
    } catch (err) {
        console.error('Gagal mengekspor PDF Dashboard:', err);
        if (typeof showToast === 'function') {
            showToast('Terjadi kesalahan saat memproses ekspor PDF dashboard.', 'error');
        }
    }
}

// Listener Tombol Refresh Dashboard, Ekspor PDF & Navigasi
document.addEventListener('DOMContentLoaded', () => {
    initDashboardHeaderDate();
    initStockAlertTabs();

    const btnRefresh = document.getElementById('btn-refresh-dashboard');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            const icon = btnRefresh.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            if (typeof loadDanTampilkanData === 'function') {
                await loadDanTampilkanData();
            }
            setTimeout(() => {
                if (icon) icon.classList.remove('fa-spin');
            }, 600);
        });
    }

    // Event Listener Tombol Ekspor PDF Dashboard
    const btnExportDashPdf = document.getElementById('btn-export-dashboard-pdf');
    if (btnExportDashPdf) {
        btnExportDashPdf.addEventListener('click', () => {
            exportDashboardPDF();
        });
    }

    const btnViewAllTrx = document.getElementById('btn-dash-view-all-trx');
    if (btnViewAllTrx) {
        btnViewAllTrx.addEventListener('click', (e) => {
            e.preventDefault();
            const navTrx = document.getElementById('nav-transaksi');
            if (navTrx) navTrx.click();
        });
    }

    const navDashboard = document.getElementById('nav-dashboard');
    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            const masterBarang = typeof globalDataBarang !== 'undefined' ? globalDataBarang : [];
            const masterRiwayat = typeof globalDataRiwayat !== 'undefined' ? globalDataRiwayat : [];
            const masterKategori = typeof globalDataKategori !== 'undefined' ? globalDataKategori : [];
            renderDashboard(masterBarang, masterRiwayat, masterKategori);
        });
    }
});

// Listener Event Pergantian Tema untuk Visualisasi Real-Time Chart.js
window.addEventListener('simvenko-theme-change', () => {
    const masterBarang = typeof globalDataBarang !== 'undefined' ? globalDataBarang : [];
    const masterRiwayat = typeof globalDataRiwayat !== 'undefined' ? globalDataRiwayat : [];
    const masterKategori = typeof globalDataKategori !== 'undefined' ? globalDataKategori : [];
    renderDashboard(masterBarang, masterRiwayat, masterKategori);
});
