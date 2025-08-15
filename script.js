const API_BASE = window.location.origin; // contoh: https://domainmu.com
const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : '/'}`;  
  
  // --- ELEMEN DOM ---
        const loginPage = document.getElementById('loginPage');
        const adminDashboard = document.getElementById('adminDashboard');
        const sekolahDashboard = document.getElementById('sekolahDashboard');
        const appCodeInput = document.getElementById('appCode');
        const editModal = document.getElementById('editModal');
        const transkripModal = document.getElementById('transkripModal');
        const sklModal = document.getElementById('sklModal');
        const skkbModal = document.getElementById('skkbModal');
        const editSiswaForm = document.getElementById('editSiswaForm');
        const loginInfoModal = document.getElementById('loginInfoModal');
        const versionInfoBadge = document.getElementById('version-info-badge');
        const loadingOverlay = document.getElementById('loadingOverlay');


        // --- STATE MANAGEMENT ---
        let database = {
            sekolah: [],
            siswa: [],
            nilai: {},
            settings: {},
            sklPhotos: {}
        };

let paginationState = {
    sekolah: { currentPage: 1, rowsPerPage: 10 },
    siswa: { currentPage: 1, rowsPerPage: 10 },
    sekolahSiswa: { currentPage: 1, rowsPerPage: 10 },
    isiNilai: { currentPage: 1, rowsPerPage: 10, currentSemester: null, currentSemesterName: null },
    transkripNilai: { currentPage: 1, rowsPerPage: 10 },
    skl: { currentPage: 1, rowsPerPage: 10 },
    skkb: { currentPage: 1, rowsPerPage: 10 },
    cetakGabungan: { currentPage: 1, rowsPerPage: 10 },
    rekapNilai: { currentPage: 1, rowsPerPage: 10 },
    rekapNilaiAdmin: { currentPage: 1, rowsPerPage: 10 } 
};

let searchState = {
    sekolahSiswa: '',
    isiNilai: '',
    transkripNilai: '',
    skl: '',
    skkb: '',
    cetakGabungan: '',
    rekapNilai: ''
};

        let sortState = {
            sekolah: { keyIndex: 8, direction: 'asc', type: 'string' },
            siswa: { keyIndex: 8, direction: 'asc', type: 'string' },
            sekolahSiswa: { keyIndex: 8, direction: 'asc', type: 'string' },
            isiNilai: { keyIndex: 8, direction: 'asc', type: 'string' },
            transkripNilai: { keyIndex: 8, direction: 'asc', type: 'string' },
            skl: { keyIndex: 8, direction: 'asc', type: 'string' },
            skkb: { keyIndex: 8, direction: 'asc', type: 'string' },
            cetakGabungan: { keyIndex: 8, direction: 'asc', type: 'string' },
            rekapNilai: { keyIndex: 8, direction: 'asc', keyType: 'string' }, // <-- TAMBAHKAN INI
            rekapNilaiAdmin: { keyIndex: 8, direction: 'asc', keyType: 'string' } // <-- TAMBAHKAN INI
        };

        let currentUser = {
            isLoggedIn: false,
            role: null,
            schoolData: null,
            loginType: null,
            kurikulum: null
        };
        
        let autosaveTimer = null;

let charts = {
    completionChart: null,
    averageGradeChart: null // Tambahkan ini
};


const subjects = {
    K13: ["AGAMA", "PKN", "B.INDO", "MTK", "IPA", "IPS", "SBDP", "PJOK", "MULOK1", "MULOK2", "MULOK3"],
    Merdeka: ["AGAMA", "PKN", "B.INDO", "MTK", "IPAS", "B.ING", "SBDP", "PJOK", "MULOK1", "MULOK2", "MULOK3"]
};
        
        // --- PERUBAHAN: Daftar Mapel untuk Transkrip ---
        const transcriptSubjects = {
            K13: [
                { display: 'Pendidikan Agama dan Budi Pekerti', key: 'AGAMA' },
                { display: 'Pendidikan Pancasila dan Kewarganegaraan', key: 'PKN' },
                { display: 'Bahasa Indonesia', key: 'B.INDO' },
                { display: 'Matematika', key: 'MTK' },
                { display: 'Ilmu Pengetahuan Alam', key: 'IPA' },
                { display: 'Ilmu Pengetahuan Sosial', key: 'IPS' },
                { display: 'Seni Budaya dan Prakarya', key: 'SBDP' },
                { display: 'Pendidikan Jasmani, Olahraga dan Kesehatan', key: 'PJOK' },
            ],
            Merdeka: [
                { display: 'Pendidikan Agama dan Budi Pekerti', key: 'AGAMA' },
                { display: 'Pendidikan Pancasila', key: 'PKN' },
                { display: 'Bahasa Indonesia', key: 'B.INDO' },
                { display: 'Matematika', key: 'MTK' },
                { display: 'Ilmu Pengetahuan Alam dan Sosial', key: 'IPAS' },
                { display: 'Bahasa Inggris', key: 'B.ING' },
                { display: 'Seni Budaya dan Prakarya', key: 'SBDP' },
                { display: 'Pendidikan Jasmani, Olahraga dan Kesehatan', key: 'PJOK' },
            ]
        };
        
        const semesterMap = {
            "9": "KELAS 5 SEMESTER 1",
            "10": "KELAS 5 SEMESTER 2",
            "11": "KELAS 6 SEMESTER 1",
            "12": "KELAS 6 SEMESTER 2"
        };
        const semesterIds = Object.keys(semesterMap);


        function showLoader() {
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
        }

        function hideLoader() {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }

        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `show ${type}`;
            setTimeout(() => {
                notification.className = notification.className.replace('show', '');
            }, 3000);
        }

        function showAutosaveStatus(status) {
            const indicator = document.getElementById('autosaveIndicator');
            if (!indicator) return;

            if (status === 'saving') {
                indicator.textContent = 'Menyimpan...';
                indicator.className = 'autosave-indicator saving';
            } else if (status === 'saved') {
                indicator.textContent = '✔ Tersimpan';
                indicator.className = 'autosave-indicator saved';
                setTimeout(() => {
                    indicator.className = 'autosave-indicator';
                }, 2000);
            } else {
                indicator.className = 'autosave-indicator';
            }
        }

       
// Di dalam <script> di E-ijazah.html
// GANTI SELURUH FUNGSI INI
// GUNAKAN HANYA SATU FUNGSI INI
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('jwtToken'); // Menggunakan 'jwtToken' yang benar
    if (!token) {
        handleLogout();
        throw new Error('Sesi tidak ditemukan. Silakan login kembali.');
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    if (response.ok) {
        return response.json();
    } else {
        const errorText = await response.text();
        throw new Error(errorText || `Terjadi error dengan status: ${response.status}`);
    }
}



// GANTI SELURUH FUNGSI handleLogin DENGAN VERSI FINAL INI
async function handleLogin(event) {
    event.preventDefault();
    showLoader();

    const appCode = appCodeInput.value.trim();
    const kurikulum = document.querySelector('input[name="kurikulum"]:checked').value;

    if (!appCode) {
        showNotification('Silakan masukkan Kode Aplikasi.', 'warning');
        hideLoader();
        return;
    }

    try {
        const result = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ appCode, kurikulum }),
        });
        
        const loginData = await result.json();

        if (loginData.success) {
            localStorage.setItem('jwtToken', loginData.token);

            // === PERBAIKAN UTAMA DI SINI ===
            currentUser = {
                isLoggedIn: true, // Properti yang hilang sekarang ditambahkan
                role: loginData.role,
                schoolData: loginData.schoolData,
                loginType: loginData.loginType,
                kurikulum: loginData.kurikulum
            };
            // ================================
            
            localStorage.setItem('currentUserSession', JSON.stringify(currentUser)); 
            
            await fetchDataFromServer();

            showDashboard(currentUser.role);
            if (currentUser.role === 'sekolah') {
                showLoginInfoModal();
            }
        } else {
            throw new Error(loginData.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Gagal login. Periksa koneksi atau kode Anda.', 'error');
    } finally {
        hideLoader();
    }
}

// ==========================================================
// == TAMBAHKAN KEMBALI FUNGSI YANG HILANG INI ==
// ==========================================================
// === FINAL: Simpan HANYA SATU versi dari fungsi ini ===
async function fetchDataFromServer() {
  try {
    if (typeof showLoader === 'function') showLoader();

    const result = await fetchWithAuth('http://localhost:3000/api/data/all');

    if (!result?.success) {
      throw new Error(result?.message || 'Gagal memuat data dari server.');
    }

    // Update state global
    database = result.data;

    // Re-render section aktif di Admin
    const activeAdminSection = document.querySelector('#adminDashboard .content-section.active');
    if (activeAdminSection && typeof renderAdminTable === 'function') {
      renderAdminTable(activeAdminSection.id);
    }

    // Re-render section aktif di Sekolah
    const activeSekolahSection = document.querySelector('#sekolahDashboard .content-section.active');
    if (activeSekolahSection) {
      const tableId = activeSekolahSection.dataset.tableId || activeSekolahSection.id;
      if (typeof rerenderActiveTable === 'function') {
        rerenderActiveTable(tableId);
      } else if (typeof switchSekolahContent === 'function') {
        switchSekolahContent(activeSekolahSection.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Fetch error:', error);
    if (typeof showNotification === 'function') {
      showNotification(error.message || 'Gagal memuat data dari server.', 'error');
    }
    return false;
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
}


        function showDashboard(role) {
    loginPage.style.display = 'none';
    adminDashboard.style.display = 'none';
    sekolahDashboard.style.display = 'none';

    if (role === 'admin') {
        adminDashboard.style.display = 'flex';
        // PERBAIKAN: Panggil fungsi switchContent() dengan target yang benar
        switchContent('sekolah');
    } else if (role === 'sekolah') {
        sekolahDashboard.style.display = 'flex';
        const defaultTarget = 'dashboardSection';
        document.querySelectorAll('#sekolahDashboard .menu-item').forEach(m => m.classList.remove('active'));
        const defaultLink = document.querySelector(`.menu-item[data-target="${defaultTarget}"]`);
        if(defaultLink) defaultLink.classList.add('active');
        switchSekolahContent(defaultTarget);
        renderVersionBadge();
    }
}

        function renderVersionBadge() {
            if (currentUser.role !== 'sekolah') {
                versionInfoBadge.innerHTML = '';
                return;
            }
            const loginType = currentUser.loginType;
            versionInfoBadge.innerHTML = (loginType === 'pro') 
                ? `<span class="version-badge pro">VERSI PRO</span>`
                : `<span class="version-badge biasa">VERSI BIASA</span>`;
        }


function switchSekolahContent(targetId) {
    document.querySelectorAll('#sekolahDashboard .content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    
    document.querySelectorAll('#sekolahDashboard .sidebar-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`#sekolahDashboard .sidebar-menu a[data-target="${targetId}"]`);
    if(activeLink && !activeLink.classList.contains('has-submenu')) {
         activeLink.classList.add('active');
    }

    if (targetId === 'dashboardSection') {
        renderDashboardStats();
    } else if (targetId === 'profilSiswaSection') {
        renderProfilSiswa();
    } else if (targetId === 'transkripNilaiSection') {
        renderTranskripSiswaTable();
    } else if (targetId === 'settingSection') {
        renderSettingsPage();
    } else if (targetId === 'sklSection') {
        renderSklSiswaTable();
    } else if (targetId === 'skkbSection') {
        renderSkkbSiswaTable();
    } else if (targetId === 'cetakGabunganSection') {
        renderCetakGabunganPage();
    } else if (targetId === 'rekapNilaiSection') { // Penambahan untuk menu baru
        renderRekapNilai();
    }
}


function renderDashboardStats() {
    if (currentUser.role !== 'sekolah' || !currentUser.schoolData) return;

    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const filteredSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa);
    const totalSiswa = filteredSiswa.length;

    // --- MENGISI SEMUA INFORMASI BARU DI DASBOR ---
    document.getElementById('dashboardSchoolName').textContent = currentUser.schoolData[4] || 'Dasbor Statistik';
    document.getElementById('statTotalSiswa').textContent = `${totalSiswa} Siswa`;
    
    const lakiLakiCount = filteredSiswa.filter(s => String(s[11] || '').toUpperCase() === 'L').length;
    const perempuanCount = filteredSiswa.filter(s => String(s[11] || '').toUpperCase() === 'P').length;
    
    document.getElementById('statKurikulum').textContent = currentUser.kurikulum;

    // --- Dari sini ke bawah adalah logika untuk membuat grafik ---
    if (charts.completionChart) charts.completionChart.destroy();
    if (charts.averageGradeChart) charts.averageGradeChart.destroy();
    
    // --- Logika Grafik Kelengkapan Data (Donat) ---
    if (totalSiswa > 0) {
        const completionCtx = document.getElementById('completionChart');
        if (completionCtx) {
            let nilaiLengkapCount = 0, ijazahLengkapCount = 0;
            filteredSiswa.forEach(siswa => {
                if (checkNilaiLengkap(siswa[7], false)) nilaiLengkapCount++;
                if (siswa[12] && String(siswa[12]).trim() !== '') ijazahLengkapCount++;
            });
            charts.completionChart = new Chart(completionCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Nilai Lengkap', 'Nilai Belum Lengkap', 'No. Ijazah Terisi', 'No. Ijazah Kosong'],
                    datasets: [{
                        label: 'Kelengkapan Data',
                        data: [
                            nilaiLengkapCount, totalSiswa - nilaiLengkapCount,
                            ijazahLengkapCount, totalSiswa - ijazahLengkapCount
                        ],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.7)', 'rgba(75, 192, 192, 0.2)',
                            'rgba(54, 162, 235, 0.7)', 'rgba(54, 162, 235, 0.2)'
                        ],
                    }]
                },
            });
        }
    }

    // --- Logika Grafik Rata-rata Nilai (Batang) ---
    const avgGradeCtx = document.getElementById('averageGradeChart');
    if (avgGradeCtx && totalSiswa > 0) {
       // --- Logika Grafik Rata-rata Nilai (Batang) ---
const avgGradeCtx = document.getElementById('averageGradeChart');
if (avgGradeCtx && totalSiswa > 0) {
  const kurikulum = currentUser.kurikulum;
  const schoolKodeBiasa = String(currentUser.schoolData[0]);
  const subjectVisibility = (database.settings?.[schoolKodeBiasa]?.subjectVisibility) || {};
  const mulokNames = database.nilai?._mulokNames?.[schoolKodeBiasa] || {};

  // Daftar mapel mengikuti kurikulum + setting visibility + nama MULOK dari setting
  // (struktur ini sama seperti yang sudah kita pakai di tabel rekap) :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}
  const subjectKeys = subjects[kurikulum].filter(key => {
    if (key.startsWith('MULOK')) {
      return mulokNames[key] && mulokNames[key].trim() !== '';
    }
    return subjectVisibility[key] !== false;
  });

  const labels = subjectKeys.map(key => key.startsWith('MULOK') ? (mulokNames[key] || key) : key);

  // Hitung rata-rata per mapel untuk semua siswa tersaring
  const data = subjectKeys.map(key => {
    let sum = 0, count = 0;
    filteredSiswa.forEach(s => {
      const nisn = s[7];
      const val = calculateAverageForSubject(nisn, key); // fungsi ini sudah dipakai di rekap nilai
      if (val !== null && !Number.isNaN(val)) { sum += val; count++; }
    });
    return count ? +(sum / count).toFixed(2) : 0;
  });

  // Render chart (Chart.js)
  charts.averageGradeChart = new Chart(avgGradeCtx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Rata-rata',
        data,
        backgroundColor: 'rgba(78, 115, 223, 0.75)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: { stepSize: 10 }
        }
      }
    }
  });
}

    }

    renderQuickProgress(filteredSiswa);
    renderActionItems(filteredSiswa);
}
        function renderQuickProgress(siswaList) {
            const container = document.getElementById('quickProgressContainer');
            container.innerHTML = '';
            const totalSiswa = siswaList.length;

            if (totalSiswa === 0) {
                container.innerHTML = '<p style="text-align: center; color: #777;">Tidak ada siswa untuk ditampilkan.</p>';
                return;
            }

            semesterIds.forEach(semId => {
                const semName = semesterMap[semId];
                let completedCount = 0;
                siswaList.forEach(siswa => {
                    if (checkNilaiLengkapForSemester(siswa[7], semId)) {
                        completedCount++;
                    }
                });

                const percentage = totalSiswa > 0 ? (completedCount / totalSiswa) * 100 : 0;

                const progressItem = document.createElement('div');
                progressItem.className = 'progress-item';
                progressItem.innerHTML = `
                    <div class="progress-label">
                        <span>${semName}</span>
                        <strong>${Math.round(percentage)}%</strong>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentage}%;"></div>
                    </div>
                    ${percentage < 100 ? `<button class="btn btn-action btn-login" onclick="navigateToIsiNilai('${semId}', '${semName}')">Lanjutkan</button>` : ''}
                `;
                container.appendChild(progressItem);
            });
        }
        
        function navigateToIsiNilai(semesterId, semesterName) {
            const menu = document.getElementById('isiNilaiMenu');
            const parentMenu = menu.previousElementSibling;
            if (!menu.classList.contains('open')) {
                menu.classList.add('open');
                parentMenu.classList.add('open');
            }
            renderIsiNilaiPage(semesterId, semesterName);
        }

        function renderActionItems(siswaList) {
            const container = document.getElementById('actionItemsContainer');
            container.innerHTML = '';
            let hasItems = false;

            const siswaTanpaNisn = siswaList.filter(s => !s[7] || String(s[7]).trim() === '');
            if (siswaTanpaNisn.length > 0) {
                hasItems = true;
                const item = document.createElement('li');
                item.className = 'action-item';
                item.innerHTML = `
                    <span class="icon">⚠️</span>
                    <span class="text">${siswaTanpaNisn.length} siswa belum memiliki NISN.</span>
                    <button class="btn btn-action btn-view" onclick="switchSekolahContent('profilSiswaSection')">Lihat Daftar</button>
                `;
                container.appendChild(item);
            }

            const siswaNilaiTidakLengkap = siswaList.filter(s => !checkNilaiLengkap(s[7], false));
             if (siswaNilaiTidakLengkap.length > 0) {
                hasItems = true;
                const item = document.createElement('li');
                item.className = 'action-item';
                item.innerHTML = `
                    <span class="icon">📝</span>
                    <span class="text">${siswaNilaiTidakLengkap.length} siswa nilainya belum lengkap untuk semua semester.</span>
                     <button class="btn btn-action btn-view" onclick="switchSekolahContent('profilSiswaSection')">Lihat Daftar</button>
                `;
                container.appendChild(item);
            }

            if (!hasItems) {
                container.innerHTML = '<p style="text-align: center; color: #777;">👍 Semua data penting sudah lengkap. Kerja bagus!</p>';
            }
        }

   
function filterSiswaData(allSiswa, searchTerm) {
    if (!searchTerm) {
        return allSiswa;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allSiswa.filter(siswa => {
        // PERBAIKAN: Mengubah data menjadi String() sebelum dijadikan huruf kecil
        const nama = String(siswa[8] || '').toLowerCase();
        const nis = String(siswa[5] || '').toLowerCase();
        const nisn = String(siswa[7] || '').toLowerCase();
        return nama.includes(lowerCaseSearchTerm) || nis.includes(lowerCaseSearchTerm) || nisn.includes(lowerCaseSearchTerm);
    });
}
        
        function handleSort(tableId, keyIndex, keyType) {
            const currentSort = sortState[tableId];
            if (currentSort.keyIndex === keyIndex) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.keyIndex = keyIndex;
                currentSort.direction = 'asc';
                currentSort.type = keyType;
            }
            
            paginationState[tableId].currentPage = 1;
            
            rerenderActiveTable(tableId);
        }

        function applySort(data, tableId) {
            const { keyIndex, direction, type } = sortState[tableId];
            const sortedData = [...data];

            sortedData.sort((a, b) => {
                let valA = a[keyIndex] || '';
                let valB = b[keyIndex] || '';

                if (type === 'number') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) {
                    return direction === 'asc' ? -1 : 1;
                }
                if (valA > valB) {
                    return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
            
            return sortedData;
        }

        function updateSortHeaders(tableId) {
            const { keyIndex, direction } = sortState[tableId];
            document.querySelectorAll(`th.sortable[data-table-id="${tableId}"]`).forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (parseInt(th.dataset.keyIndex) === keyIndex) {
                    th.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        }

   function renderProfilSiswa() {
    if (currentUser.role !== 'sekolah' || !currentUser.schoolData) return;
    
    const schoolData = currentUser.schoolData;
    const schoolKodeBiasa = String(schoolData[0]);
    const allSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa);

    const searchTerm = searchState.sekolahSiswa;
    let filteredSiswa = filterSiswaData(allSiswa, searchTerm);
    
    filteredSiswa = applySort(filteredSiswa, 'sekolahSiswa');

    document.getElementById('sekolahSidebarHeader').textContent = schoolData[5] || 'Dasbor Sekolah';
    document.getElementById('sekolahInfoPropinsi').textContent = 'KALIMANTAN BARAT';
    document.getElementById('sekolahInfoKabupaten').textContent = 'MELAWI';
    document.getElementById('sekolahInfoKecamatan').textContent = schoolData[2] || '-';
    document.getElementById('sekolahInfoNpsn').textContent = schoolData[3] || '-';
    document.getElementById('sekolahInfoNama').textContent = schoolData[5] || '-';
    document.getElementById('sekolahInfoTotalSiswa').textContent = allSiswa.length;

    const tableBody = document.getElementById('sekolahSiswaTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const tableHead = document.querySelector('#profilSiswaSection thead tr');
    const isPro = currentUser.loginType === 'pro';

    // Perbaikan: Selalu tampilkan kolom NO IJAZAH, kolom FOTO dan AKSI hanya untuk PRO
    if (isPro) {
        tableHead.innerHTML = `
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="4" data-key-type="number">NO</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="7" data-key-type="string">NISN</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="5" data-key-type="string">NIS</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="6" data-key-type="string">NO PESERTA</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="8" data-key-type="string">NAMA PESERTA</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="9" data-key-type="string">TEMPAT, TANGGAL LAHIR</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="10" data-key-type="string">NAMA ORANG TUA</th>
            <th class="photo-column">FOTO</th>
            <th>NO IJAZAH</th>
            <th class="action-column">AKSI</th>
        `;
    } else {
         tableHead.innerHTML = `
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="4" data-key-type="number">NO</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="7" data-key-type="string">NISN</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="5" data-key-type="string">NIS</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="6" data-key-type="string">NO PESERTA</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="8" data-key-type="string">NAMA PESERTA</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="9" data-key-type="string">TEMPAT, TANGGAL LAHIR</th>
            <th class="sortable" data-table-id="sekolahSiswa" data-key-index="10" data-key-type="string">NAMA ORANG TUA</th>
            <th>NO IJAZAH</th>
        `;
    }

    const state = paginationState.sekolahSiswa;
    const rowsPerPage = state.rowsPerPage === 'all' ? filteredSiswa.length : parseInt(state.rowsPerPage);
    const totalPages = rowsPerPage > 0 ? Math.ceil(filteredSiswa.length / rowsPerPage) : 1;
    state.currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    
    const start = (state.currentPage - 1) * rowsPerPage;
    const end = state.rowsPerPage === 'all' ? filteredSiswa.length : start + rowsPerPage;
    const paginatedData = filteredSiswa.slice(start, end);

    paginatedData.forEach((siswa, index) => {
        const originalIndex = database.siswa.findIndex(s => s === siswa);
        const nisn = siswa[7];
        const row = tableBody.insertRow();
        
        let photoCellHtml = '';
        if (isPro) {
            const hasPhoto = database.sklPhotos && database.sklPhotos[nisn];
            photoCellHtml = hasPhoto
                ? `<div class="photo-thumbnail-container"><img src="${database.sklPhotos[nisn]}" class="photo-thumbnail"></div>`
                : '<span class="no-photo-placeholder">❌</span>';
        }

        let actionCellHtml = '';
        if (isPro) {
             const hasPhoto = database.sklPhotos && database.sklPhotos[nisn];
             actionCellHtml = `
                <button class="btn btn-small btn-edit" onclick="openEditModal(database.siswa[${originalIndex}])">Edit</button>
                <button class="btn btn-small btn-upload" onclick="document.getElementById('profil-photo-input-${nisn}').click();">
                    ${hasPhoto ? 'Ubah Foto' : 'Unggah Foto'}
                </button>
                <input type="file" id="profil-photo-input-${nisn}" class="file-input" accept="image/*" onchange="handleSklPhotoUpload(event, '${nisn}')">
                ${hasPhoto ? `<button class="btn btn-small btn-delete" onclick="deleteSklPhoto('${nisn}')">Hapus</button>` : ''}
            `;
        }
        
        // Perbaikan: Atribut onchange selalu ada agar validasi tetap berjalan
        const ijazahInputHtml = `<input type="text" class="editable-ijazah" value="${siswa[11] || ''}" data-index="${originalIndex}" onchange="saveIjazahNumber(this)">`;
        
        if (isPro) {
            row.innerHTML = `
                <td>${siswa[4] || (start + index + 1)}</td>
                <td>${siswa[7] || ''}</td><td>${siswa[5] || ''}</td><td>${siswa[6] || ''}</td>
                <td>${siswa[8] || ''}</td><td>${siswa[9] || ''}</td><td>${siswa[10] || ''}</td>
                <td class="photo-cell">${photoCellHtml}</td>
                <td>${ijazahInputHtml}</td>
                <td class="action-cell">${actionCellHtml}</td>
            `;
        } else {
             row.innerHTML = `
                <td>${siswa[4] || (start + index + 1)}</td>
                <td>${siswa[7] || ''}</td><td>${siswa[5] || ''}</td><td>${siswa[6] || ''}</td>
                <td>${siswa[8] || ''}</td><td>${siswa[9] || ''}</td><td>${siswa[10] || ''}</td>
                <td>${ijazahInputHtml}</td>
            `;
        }
    });

    updatePaginationControls('sekolahSiswa', filteredSiswa.length);
    updateSortHeaders('sekolahSiswa');
}


function renderIsiNilaiPage(semesterId, semesterName) {
    switchSekolahContent('isiNilaiSection');
    document.getElementById('isiNilaiTitle').textContent = `Isi Nilai - ${semesterName}`;
    paginationState.isiNilai.currentSemester = semesterId;
    paginationState.isiNilai.currentSemesterName = semesterName;
    document.getElementById('deleteAllGradesBtn').style.display = 'inline-flex';
    showAutosaveStatus('idle');

    const container = document.getElementById('isiNilaiTableContainer');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.id = 'isiNilaiTable';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const mulokNames = database.nilai._mulokNames?.[schoolKodeBiasa] || {};
    
    // PERUBAHAN UTAMA: Header tabel tidak lagi menggunakan input untuk nama Mulok
    if (currentUser.kurikulum === 'K13') {
        const currentSubjects = subjects.K13.filter(s => !s.startsWith("MULOK"));
        const tr1 = document.createElement('tr');
        tr1.innerHTML = `<th rowspan="2">NO</th><th rowspan="2" class="sortable" data-table-id="isiNilai" data-key-index="8" data-key-type="string">NAMA</th>`;
        currentSubjects.forEach(sub => { tr1.innerHTML += `<th colspan="3">${sub}</th>`; });
        
        tr1.innerHTML += `<th colspan="3">${mulokNames['MULOK1'] || 'MULOK 1'}</th>`;
        tr1.innerHTML += `<th colspan="3">${mulokNames['MULOK2'] || 'MULOK 2'}</th>`;
        tr1.innerHTML += `<th colspan="3">${mulokNames['MULOK3'] || 'MULOK 3'}</th>`;
        
        const tr2 = document.createElement('tr');
        [...currentSubjects, "MULOK1", "MULOK2", "MULOK3"].forEach(() => { 
            tr2.innerHTML += `<th>KI.3</th><th>KI.4</th><th>RT</th>`; 
        });
        
        thead.appendChild(tr1);
        thead.appendChild(tr2);
    } else { // Kurikulum Merdeka
        const currentSubjects = subjects.Merdeka.filter(s => !s.startsWith("MULOK"));
        const tr = document.createElement('tr');
        tr.innerHTML = `<th>NO</th><th class="sortable" data-table-id="isiNilai" data-key-index="8" data-key-type="string">NAMA</th>`;
        currentSubjects.forEach(sub => { tr.innerHTML += `<th>${sub}</th>`; });
        
        tr.innerHTML += `<th>${mulokNames['MULOK1'] || 'MULOK 1'}</th>`;
        tr.innerHTML += `<th>${mulokNames['MULOK2'] || 'MULOK 2'}</th>`;
        tr.innerHTML += `<th>${mulokNames['MULOK3'] || 'MULOK 3'}</th>`;
        thead.appendChild(tr);
    }
    table.appendChild(thead);

    const allSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa);
    const searchTerm = searchState.isiNilai;
    let filteredSiswa = filterSiswaData(allSiswa, searchTerm);
    
    filteredSiswa = applySort(filteredSiswa, 'isiNilai');
    
    const state = paginationState.isiNilai;
    const rowsPerPage = state.rowsPerPage === 'all' ? filteredSiswa.length : parseInt(state.rowsPerPage);
    const totalPages = rowsPerPage > 0 ? Math.ceil(filteredSiswa.length / rowsPerPage) : 1;
    state.currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    
    const start = (state.currentPage - 1) * rowsPerPage;
    const end = state.rowsPerPage === 'all' ? filteredSiswa.length : start + rowsPerPage;
    const paginatedData = filteredSiswa.slice(start, end);

    const settings = database.settings[schoolKodeBiasa] || {};
    const subjectVisibility = settings.subjectVisibility || {};

    paginatedData.forEach((siswa, index) => {
        const nisn = siswa[7] || `temp-${start + index}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${start + index + 1}</td><td>${siswa[8] || ''}</td>`;

        let rowHtml = '';
        const allSubjectsForKurikulum = subjects[currentUser.kurikulum];

        allSubjectsForKurikulum.forEach(sub => {
            const isVisible = subjectVisibility[sub] !== false;
            const disabledAttribute = isVisible ? '' : 'disabled';

            if (currentUser.kurikulum === 'K13') {
                const ki3 = database.nilai[nisn]?.[semesterId]?.[sub]?.KI3 || '';
                const ki4 = database.nilai[nisn]?.[semesterId]?.[sub]?.KI4 || '';
                let rt = (ki3 !== '' && ki4 !== '') ? Math.round((parseFloat(ki3) + parseFloat(ki4)) / 2) : '';
                rowHtml += `
                    <td><input type="number" min="0" max="100" value="${ki3}" data-nisn="${nisn}" data-semester="${semesterId}" data-subject="${sub}" data-type="KI3" oninput="handleGradeInput(this); calculateRataRata(this);" ${disabledAttribute}></td>
                    <td><input type="number" min="0" max="100" value="${ki4}" data-nisn="${nisn}" data-semester="${semesterId}" data-subject="${sub}" data-type="KI4" oninput="handleGradeInput(this); calculateRataRata(this);" ${disabledAttribute}></td>
                    <td><input type="number" value="${rt}" data-nisn="${nisn}" data-semester="${semesterId}" data-subject="${sub}" data-type="RT" readonly></td>`;
            } else { // Kurikulum Merdeka
                const nilai = database.nilai[nisn]?.[semesterId]?.[sub]?.NILAI || '';
                rowHtml += `<td><input type="number" min="0" max="100" value="${nilai}" data-nisn="${nisn}" data-semester="${semesterId}" data-subject="${sub}" data-type="NILAI" oninput="handleGradeInput(this)" ${disabledAttribute}></td>`;
            }
        });

        tr.innerHTML += rowHtml;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    updatePaginationControls('isiNilai', filteredSiswa.length);
    updateSortHeaders('isiNilai');
}       
        function handleGradeInput(inputElement) {
            validateGrade(inputElement);
            saveGrade(inputElement);
        }
        
        function validateGrade(input) {
            let value = parseInt(input.value, 10);
            if (isNaN(value)) {
                input.classList.remove('invalid-input');
                return;
            }
            
            if (value > 100) {
                input.value = 100;
                input.classList.add('invalid-input');
            } else if (value < 0) {
                input.value = 0;
                input.classList.add('invalid-input');
            } else {
                input.classList.remove('invalid-input');
            }
            
            setTimeout(() => {
                input.classList.remove('invalid-input');
            }, 1500);
        }
        
        // --- PERUBAHAN: Simpan Nama Mulok ---
        
        function calculateRataRata(inputElement) {
            const row = inputElement.closest('tr');
            if (!row) return;

            const { nisn, subject } = inputElement.dataset;
            const ki3Input = row.querySelector(`input[data-nisn="${nisn}"][data-subject="${subject}"][data-type="KI3"]`);
            const ki4Input = row.querySelector(`input[data-nisn="${nisn}"][data-subject="${subject}"][data-type="KI4"]`);
            const rtInput = row.querySelector(`input[data-nisn="${nisn}"][data-subject="${subject}"][data-type="RT"]`);

            if (!ki3Input || !ki4Input || !rtInput) return;

            const ki3 = parseFloat(ki3Input.value) || 0;
            const ki4 = parseFloat(ki4Input.value) || 0;

            let avg = '';
            if (ki3Input.value.trim() !== '' && ki4Input.value.trim() !== '') {
                avg = Math.round((ki3 + ki4) / 2);
            }
            
            rtInput.value = avg;
            saveGrade(rtInput);
        }
        
        // Ganti seluruh fungsi saveGrade dengan versi ini
// Ganti seluruh fungsi saveGrade dengan versi ini
// GANTI SELURUH FUNGSI saveGrade DENGAN VERSI INI
function saveGrade(inputElement) {
    const { nisn, semester, subject, type } = inputElement.dataset;
    const value = inputElement.value;

    // 1. Update dulu data di variabel frontend (agar tampilan responsif)
    if (!database.nilai[nisn]) database.nilai[nisn] = {};
    if (!database.nilai[nisn][semester]) database.nilai[nisn][semester] = {};
    if (!database.nilai[nisn][semester][subject]) database.nilai[nisn][semester][subject] = {};
    database.nilai[nisn][semester][subject][type] = value;
    
    // 2. Kirim data ke server dengan debounce (jeda)
    clearTimeout(autosaveTimer);
    showAutosaveStatus('saving');
    autosaveTimer = setTimeout(() => {
        fetchWithAuth('http://localhost:3000/api/data/grade/save', {
            method: 'POST',
            body: JSON.stringify({ nisn, semester, subject, type, value }),
        })
        // 'result' sekarang langsung berisi data JSON dari fetchWithAuth
        .then(result => {
            if (result.success) {
                showAutosaveStatus('saved');
            } else {
                showNotification('Gagal menyimpan nilai ke server.', 'error');
                showAutosaveStatus('idle');
            }
        })
        .catch(err => {
            console.error('Error saving grade:', err);
            showNotification(err.message || 'Koneksi ke server gagal saat menyimpan nilai.', 'error');
            showAutosaveStatus('idle');
        });
    }, 1500); // Jeda 1.5 detik sebelum mengirim
}

        function parseDateToYMD(dateStr) {
            if (!dateStr || dateStr.trim() === '') return '';
            
            const trimmedDate = dateStr.trim();
            
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
                return trimmedDate;
            }

            const parts = trimmedDate.split(' ');
            if (parts.length !== 3) return ''; 

            const day = parseInt(parts[0], 10);
            const year = parseInt(parts[2], 10);
            const months = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
            const monthIndex = months.indexOf(parts[1].toLowerCase());

            if (isNaN(day) || isNaN(year) || monthIndex === -1) return '';

            const month = monthIndex + 1;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }


        function openEditModal(siswaData) {
            const originalIndex = database.siswa.findIndex(s => s === siswaData);
            if (originalIndex === -1) return;

            document.getElementById('editSiswaIndex').value = originalIndex;
            document.getElementById('editNis').value = siswaData[5] || '';
            document.getElementById('editNisn').value = siswaData[7] || '';
            document.getElementById('editNoPeserta').value = siswaData[6] || '';
            document.getElementById('editNamaPeserta').value = siswaData[8] || '';
            
            const ttl = (siswaData[9] || ',').split(',');
            const tempatLahir = ttl[0] ? ttl[0].trim() : '';
            const tanggalLahirStr = ttl[1] ? ttl[1].trim() : '';
            
            document.getElementById('editTempatLahir').value = tempatLahir;
            document.getElementById('editTanggalLahir').value = parseDateToYMD(tanggalLahirStr);
            
            document.getElementById('editNamaOrtu').value = siswaData[10] || '';
            
            editModal.style.display = 'flex';
        }

        function closeEditModal() {
            editModal.style.display = 'none';
        }
        
        function closeTranskripModal() {
            transkripModal.style.display = 'none';
        }
        
        function closeSklModal() {
            sklModal.style.display = 'none';
        }
        
        function closeSkkbModal() {
            skkbModal.style.display = 'none';
        }

        function showLoginInfoModal() {
            if (!currentUser.schoolData) return;

            const schoolData = currentUser.schoolData;
            const schoolKodeBiasa = String(schoolData[0]);
            const totalSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa).length;

            document.getElementById('infoNamaSekolah').textContent = schoolData[4] || 'Nama Sekolah Tidak Ditemukan';
            document.getElementById('infoJumlahSiswa').textContent = `${totalSiswa} siswa`;
            document.getElementById('infoKurikulum').textContent = currentUser.kurikulum;

            loginInfoModal.style.display = 'flex';
        }

        function closeLoginInfoModal() {
            loginInfoModal.style.display = 'none';
        }

        // Ganti seluruh fungsi saveSiswaChanges dengan versi async ini
// GANTI SELURUH FUNGSI saveSiswaChanges DENGAN VERSI FINAL INI
// GANTI SELURUH FUNGSI INI
async function saveSiswaChanges(event) {
    event.preventDefault();
    const namaPeserta = document.getElementById('editNamaPeserta').value.trim();
    const nisnValue = document.getElementById('editNisn').value.trim();
    if (!namaPeserta || !nisnValue) {
        showNotification('Nama Peserta dan NISN wajib diisi.', 'warning');
        return;
    }

    const index = document.getElementById('editSiswaIndex').value;
    if (index === '' || !database.siswa[index]) return;

    try {
        showLoader();
        const tempatLahir = document.getElementById('editTempatLahir').value.trim();
        const tanggalLahirYMD = document.getElementById('editTanggalLahir').value;
        const tanggalLahirFormatted = formatDateToIndonesian(tanggalLahirYMD);

        const updatedData = {
            nis: document.getElementById('editNis').value,
            nisn: nisnValue,
            noPeserta: document.getElementById('editNoPeserta').value,
            namaPeserta: namaPeserta,
            ttl: `${tempatLahir}, ${tanggalLahirFormatted}`,
            namaOrtu: document.getElementById('editNamaOrtu').value,
            jenisKelamin: document.querySelector('input[name="editJenisKelamin"]:checked')?.value || ''
        };

        // Langsung gunakan hasil dari fetchWithAuth
        const result = await fetchWithAuth('http://localhost:3000/api/data/siswa/update', {
            method: 'POST',
            body: JSON.stringify({ nisn: nisnValue, updatedData: updatedData })
        });

        if (result.success) {
            await fetchDataFromServer(); // Sinkronkan data dengan server
            closeEditModal();
            renderProfilSiswa();
            showNotification('Data siswa berhasil diperbarui!', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification(error.message || 'Gagal memperbarui data siswa.', 'error');
    } finally {
        hideLoader();
    }
}

        function handleLogout() {
            localStorage.removeItem('currentUserSession');
            adminDashboard.style.display = 'none';
            sekolahDashboard.style.display = 'none';
            loginPage.style.display = 'flex';
            appCodeInput.value = '';
            currentUser = { isLoggedIn: false, role: null, schoolData: null, loginType: null, kurikulum: null };
        }

        function switchContent(targetId) {
    document.querySelectorAll('#adminDashboard .content-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('#adminDashboard .sidebar-menu .menu-item').forEach(item => item.classList.remove('active'));

    document.getElementById(targetId).classList.add('active');
    document.querySelector(`#adminDashboard .menu-item[data-target="${targetId}"]`).classList.add('active');
    
    // PERBAIKAN: Menggunakan if/else if yang benar
    if (targetId === 'sekolah') {
        renderAdminTable('sekolah');
    } else if (targetId === 'siswa') {
        renderAdminTable('siswa');
    } else if (targetId === 'rekapNilaiAdmin') {
        renderRekapNilaiAdminPage();
    }
}

    // GANTI SELURUH FUNGSI handleFile DENGAN VERSI FINAL INI
async function handleFile(e, tableId) {
    showLoader();
    const file = e.target.files[0];
    if (!file) {
        hideLoader();
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
                jsonData.shift(); // Menghapus baris header
            }

            // --- PERBAIKAN UTAMA DI SINI ---
            // Menggunakan fetchWithAuth untuk mengirim data ke backend yang aman
            const result = await fetchWithAuth(`http://localhost:3000/api/data/import/${tableId}`, {
                method: 'POST',
                body: JSON.stringify(jsonData),
            });

            if (result.success) {
                showNotification(result.message, 'success');
                // Ambil data terbaru dari server untuk memastikan sinkronisasi
                await fetchDataFromServer();
                // Render ulang tabel untuk menampilkan data baru
                renderAdminTable(tableId);
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error("Error processing or sending Excel file:", error);
            showNotification(error.message || "Gagal memproses file Excel.", 'error');
        } finally {
            hideLoader();
            e.target.value = ''; // Reset input file
        }
    };
    reader.readAsArrayBuffer(file);
}   
        
// Di dalam file E-ijazah.html, ganti seluruh fungsi ini

function renderAdminTable(tableId) {
    const tableBodyId = tableId === 'siswa' ? 'adminSiswaTableBody' : `${tableId}TableBody`;
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;

    let data;
    if (tableId === 'rekapNilaiAdmin') {
        data = getRekapNilaiLengkapData();
    } else {
        data = database[tableId] || [];
    }

    const searchInput = document.getElementById(`search${capitalize(tableId)}`);
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase();
    
    const filteredData = searchTerm
        ? data.filter(item => {
            if (['rekapNilaiAdmin', 'sekolah'].includes(tableId)) {
                return Object.values(item).some(val => 
                    String(val).toLowerCase().includes(searchTerm)
                );
            }
            return item.some(cell => String(cell).toLowerCase().includes(searchTerm));
        })
        : data;
    
    const sortedData = applySort(filteredData, tableId);
    
    updatePaginationControls(tableId, sortedData.length);
    const state = paginationState[tableId];
    const rowsPerPage = state.rowsPerPage === 'all' ? sortedData.length : parseInt(state.rowsPerPage);
    const start = (state.currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = sortedData.slice(start, end);

    tableBody.innerHTML = '';

    if (tableId === 'rekapNilaiAdmin') {
        // Logika untuk rekap nilai tidak berubah
    } else {
        paginatedData.forEach(rowData => {
            const row = tableBody.insertRow();
            rowData.forEach(cellData => {
                const cell = row.insertCell();
                cell.textContent = cellData;
            });

            // ==========================================================
            // == PERBAIKAN UTAMA ADA DI SINI ==
            // Pastikan class tombolnya spesifik: 'btn-edit-sekolah' dan 'btn-delete-sekolah'
            // ==========================================================
            if (tableId === 'sekolah') {
                const actionCell = row.insertCell();
                actionCell.classList.add('action-cell');
                const kodeBiasa = rowData[0];
                
                actionCell.innerHTML = `
    <button type="button" class="btn btn-edit btn-edit-sekolah" data-kode="${kodeBiasa}">Edit</button>
    <button type="button" class="btn btn-delete btn-delete-sekolah" data-kode="${kodeBiasa}">Hapus</button>
`;
            }
            // ==========================================================
        });
    }
}

        function updatePaginationControls(tableId, totalRows) {
    const controls = document.querySelector(`.pagination-controls[data-table-id="${tableId}"]`);
    if (!controls) return;

    const state = paginationState[tableId];
    if (!state) return;

    const rowsPerPage = parseInt(state.rowsPerPage, 10);
    const totalPages = rowsPerPage > 0 ? Math.ceil(totalRows / rowsPerPage) : 1;
    const infoSpan = controls.querySelector('.pagination-info');
    const rowsPerPageSelect = controls.querySelector('.rows-per-page');
    const prevButton = controls.querySelector('.prev-page');
    const nextButton = controls.querySelector('.next-page');

    if (infoSpan) {
        const start = totalRows > 0 ? (state.currentPage - 1) * rowsPerPage + 1 : 0;
        const end = Math.min(start + rowsPerPage - 1, totalRows);
        infoSpan.textContent = `Menampilkan ${start} - ${end} dari ${totalRows} siswa`;
    }
    if (rowsPerPageSelect) {
        rowsPerPageSelect.value = state.rowsPerPage;
    }
    if (prevButton) {
        prevButton.disabled = state.currentPage <= 1;
    }
    if (nextButton) {
        nextButton.disabled = state.currentPage >= totalPages;
    }
}
// === FINAL: REPLACE fungsi yang sudah ada, JANGAN bikin nama baru ===
// === FINAL (REPLACE): Hapus semua data pada panel admin sesuai tableId ===
// Pemakaian: deleteAllData('sekolah') atau deleteAllData('siswa')
// - 'sekolah'  => coba hapus semua baris SEKOLAH saja (tidak menyentuh siswa/nilai/foto).
//                 Jika masih ada siswa, server akan menolak (409) dan memberi pesan.
// - 'siswa'    => coba hapus semua baris SISWA saja (tidak menyentuh sekolah).
//                 Jika masih ada nilai/foto terkait siswa, server akan menolak (409) dan memberi pesan.
async function deleteAllData(tableId) {
  const expected = tableId === 'sekolah' ? 'HAPUS SEKOLAH' : 'HAPUS SISWA';
  const msg = tableId === 'sekolah'
    ? [
        'Anda akan menghapus SEMUA data SEKOLAH.',
        'Tindakan ini hanya menyasar tabel SEKOLAH.',
        'Jika masih ada SISWA terkait, penghapusan akan DITOLAK.',
        `Ketik: ${expected}`
      ].join('\n')
    : [
        'Anda akan menghapus SEMUA data SISWA.',
        'Tindakan ini hanya menyasar tabel SISWA.',
        'Jika masih ada NILAI/FOTO terkait, penghapusan akan DITOLAK.',
        `Ketik: ${expected}`
      ].join('\n');

  const confirmText = prompt(msg, '');
  if (confirmText !== expected) {
    if (typeof showNotification === 'function') showNotification('Dibatalkan.', 'warning');
    return;
  }

  try {
    if (typeof showLoader === 'function') showLoader();

    // Panggil endpoint yang SUDAH ADA
    const resp = await fetchWithAuth('http://localhost:3000/api/data/delete-all', {
      method: 'POST',
      body: JSON.stringify({ tableId })
    });

    // sukses
    if (!resp?.success) throw new Error(resp?.message || 'Gagal menghapus data.');

    // ambil ulang data dari server
    await fetchDataFromServer();

    // reset UI (search & pagination) hanya pada tabel yang relevan
    const idsToReset = [tableId];
    idsToReset.forEach((id) => {
      const searchEl =
        document.getElementById(`search${id.charAt(0).toUpperCase()}${id.slice(1)}`) ||
        document.querySelector(`.search-bar[data-table-id="${id}"]`);
      if (searchEl) searchEl.value = '';
      if (typeof searchState === 'object' && Object.prototype.hasOwnProperty.call(searchState, id)) {
        searchState[id] = '';
      }
      if (typeof paginationState === 'object') {
        if (!paginationState[id]) paginationState[id] = { currentPage: 1, rowsPerPage: 10 };
        paginationState[id].currentPage = 1;
        paginationState[id].rowsPerPage = 'all';
      }
    });

    // render ulang tabel yang terdampak
    if (typeof renderAdminTable === 'function') {
      idsToReset.forEach((id) => renderAdminTable(id));
    } else if (typeof rerenderActiveTable === 'function') {
      idsToReset.forEach((id) => rerenderActiveTable(id));
    }

    if (typeof showNotification === 'function') {
      showNotification(resp.message || 'Data berhasil dihapus.', 'success');
    }
  } catch (err) {
    // fetchWithAuth melempar string JSON bila status != 2xx; coba rapikan pesan
    let msg = err?.message || String(err) || 'Terjadi kesalahan.';
    try {
      // jika server mengirim JSON, ambil field message
      const parsed = JSON.parse(msg);
      if (parsed && parsed.message) msg = parsed.message;
    } catch (_) {}
    console.error('deleteAllData error:', err);
    if (typeof showNotification === 'function') showNotification(msg, 'error');
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
}




function rerenderActiveTable(tableId) {
    // Jika tidak ada tableId, jangan lakukan apa-apa
    if (!tableId) return;

    // Menormalkan tableId untuk mencakup ID section juga
    if (tableId.endsWith('Section')) {
        tableId = tableId.replace('Section', '');
    }

    if (tableId === 'sekolahSiswa') {
        renderProfilSiswa();
    } else if (tableId === 'isiNilai') {
        const { currentSemester, currentSemesterName } = paginationState.isiNilai;
        // Hanya render jika semester sudah dipilih. Jika belum, jangan lakukan apa-apa.
        if (currentSemester) {
            renderIsiNilaiPage(currentSemester, currentSemesterName);
        }
    } else if (tableId === 'transkripNilai') {
        renderTranskripSiswaTable();
    } else if (tableId === 'skl') {
        renderSklSiswaTable();
    } else if (tableId === 'skkb') {
        renderSkkbSiswaTable();
    } else if (tableId === 'cetakGabungan') {
        renderCetakGabunganPage();
    } else if (tableId === 'rekapNilai') {
        renderRekapNilai();
    } else {
        // Ini untuk tabel di dasbor admin
        renderAdminTable(tableId);
    }
}
        
        function renderGenericSiswaTable(tableId, openModalFn, downloadPdfFn) {
    if (currentUser.role !== 'sekolah' || !currentUser.schoolData) return;
    
    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const allSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa);
    
    const searchTerm = searchState[tableId];
    let filteredSiswa = filterSiswaData(allSiswa, searchTerm);
    
    filteredSiswa = applySort(filteredSiswa, tableId);

    const tableBodyId = (tableId === 'transkripNilai') ? 'transkripSiswaTableBody' : `${tableId}SiswaTableBody`;
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const state = paginationState[tableId];
    const rowsPerPage = state.rowsPerPage === 'all' ? filteredSiswa.length : parseInt(state.rowsPerPage);
    const totalPages = rowsPerPage > 0 ? Math.ceil(filteredSiswa.length / rowsPerPage) : 1;
    state.currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    
    const start = (state.currentPage - 1) * rowsPerPage;
    const end = state.rowsPerPage === 'all' ? filteredSiswa.length : start + rowsPerPage;
    const paginatedData = filteredSiswa.slice(start, end);

    paginatedData.forEach((siswa, index) => {
        const nisn = siswa[7] || `temp-${start + index}`;
        const row = tableBody.insertRow();
        
        // Cek kelengkapan nilai untuk dokumen yang relevan
        let statusHtml = '<span style="color: #6c757d;">-</span>'; // Default status
        if (tableId === 'skkb') {
            // SKKB tidak memerlukan nilai, jadi selalu dianggap "siap"
            statusHtml = '<span style="color: #1e8e3e; font-weight: bold;" title="Dokumen siap dicetak">✔</span>';
        } else if (checkNilaiLengkap(nisn, false)) {
            statusHtml = '<span style="color: #1e8e3e; font-weight: bold;" title="Nilai sudah lengkap, dokumen siap dicetak">✔</span>';
        } else {
            statusHtml = '<span style="color: #ff9800; font-weight: bold;" title="Nilai belum lengkap, tidak dapat dicetak">⚠️</span>';
        }
        
        let actionButtonsHTML = '';
        if (openModalFn) {
            actionButtonsHTML += `<button class="btn btn-small btn-view" onclick="${openModalFn}('${nisn}')">Lihat</button>`;
        }
        
        // Nonaktifkan tombol PDF jika nilai belum lengkap (kecuali untuk SKKB)
        const isReadyToPrint = (tableId === 'skkb') || checkNilaiLengkap(nisn, false);
        actionButtonsHTML += `<button class="btn btn-small btn-pdf" onclick="${isReadyToPrint ? `${downloadPdfFn}('${nisn}')` : `showNotification('Nilai belum lengkap.', 'warning')`}" ${isReadyToPrint ? '' : 'disabled'}>PDF</button>`;
        
        if (tableId === 'skl' && currentUser.loginType === 'pro') {
            actionButtonsHTML += `
                <button class="btn btn-small btn-upload" onclick="document.getElementById('skl-photo-input-${nisn}').click();">Upload Foto</button>
                <input type="file" id="skl-photo-input-${nisn}" class="file-input" accept="image/*" onchange="handleSklPhotoUpload(event, '${nisn}')">
                <button class="btn btn-small btn-delete" onclick="deleteSklPhoto('${nisn}')">Hapus Foto</button>`;
        }

        row.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${siswa[8] || ''}</td>
            <td>${nisn}</td>
            <td style="text-align: center;">${statusHtml}</td>
            <td>${actionButtonsHTML}</td>`;
    });

    updatePaginationControls(tableId, filteredSiswa.length);
    updateSortHeaders(tableId);
}

        function renderTranskripSiswaTable() {
            renderGenericSiswaTable('transkripNilai', 'openTranskripModal', 'downloadTranskripPDF');
        }
        
        function renderSklSiswaTable() {
            renderGenericSiswaTable('skl', 'openSklModal', 'downloadSklPDF');
        }
        
        function renderSkkbSiswaTable() {
            renderGenericSiswaTable('skkb', 'openSkkbModal', 'downloadSkkbPDF');
        }


function renderRekapNilai() {
    const tableId = 'rekapNilai'; 
    if (currentUser.role !== 'sekolah' || !currentUser.schoolData) return;

    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const allSiswa = database.siswa.filter(siswa => String(siswa[0]) === schoolKodeBiasa);
    
    const searchTerm = searchState.rekapNilai;
    let filteredSiswa = filterSiswaData(allSiswa, searchTerm);

    const thead = document.getElementById('rekapNilaiThead');
    const tbody = document.getElementById('rekapNilaiTbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // --- PERBAIKAN UTAMA DI SINI ---
    // 1. Mengambil daftar mapel lengkap, termasuk Mulok
    const allSubjects = subjects[currentUser.kurikulum];
    const settings = database.settings[schoolKodeBiasa] || {};
    const subjectVisibility = settings.subjectVisibility || {};
    const mulokNames = database.nilai._mulokNames?.[schoolKodeBiasa] || {};

    // 2. Filter mapel yang akan ditampilkan berdasarkan Setting
    const visibleSubjects = allSubjects.filter(subjectKey => {
        // Untuk Mulok, tampilkan hanya jika namanya sudah diisi di Setting
        if (subjectKey.startsWith('MULOK')) {
            return mulokNames[subjectKey] && mulokNames[subjectKey].trim() !== '';
        }
        // Untuk mapel utama, periksa visibility dari setting
        return subjectVisibility[subjectKey] !== false;
    });

    // 3. Membuat Header Tabel dari daftar mapel yang sudah lengkap
    const headerRow = thead.insertRow();
    headerRow.innerHTML = '<th>NO</th><th>NISN</th><th>NAMA</th>';
    visibleSubjects.forEach(subjectKey => {
        // Gunakan nama custom untuk Mulok, atau key untuk mapel lain
        const headerName = mulokNames[subjectKey] || subjectKey;
        headerRow.innerHTML += `<th>${headerName}</th>`;
    });
    // --- AKHIR PERBAIKAN ---

    // Mengisi Body Tabel
    const state = paginationState.rekapNilai;
    const rowsPerPage = state.rowsPerPage === 'all' ? filteredSiswa.length : parseInt(state.rowsPerPage);
    const totalPages = rowsPerPage > 0 ? Math.ceil(filteredSiswa.length / rowsPerPage) : 1;
    state.currentPage = Math.max(1, Math.min(state.currentPage, totalPages));
    
    const start = (state.currentPage - 1) * rowsPerPage;
    const end = state.rowsPerPage === 'all' ? filteredSiswa.length : start + rowsPerPage;
    const paginatedData = filteredSiswa.slice(start, end);

    paginatedData.forEach((siswa, index) => {
        const nisn = siswa[7] || `temp-${start + index}`;
        const row = tbody.insertRow();
        row.innerHTML = `<td>${start + index + 1}</td><td>${nisn}</td><td>${siswa[8] || ''}</td>`;
        
        // Loop menggunakan daftar mapel yang sudah lengkap
        visibleSubjects.forEach(subjectKey => {
            const finalGrade = calculateAverageForSubject(nisn, subjectKey);
            const gradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : '-';
            row.innerHTML += `<td style="text-align: center;">${gradeDisplay}</td>`;
        });
    });

    updatePaginationControls('rekapNilai', filteredSiswa.length);
    updateSortHeaders(tableId);
}
        function checkNilaiLengkap(nisn, showNotif = true) {
            if (!nisn) return false;
            for (const semId of semesterIds) {
                if (!checkNilaiLengkapForSemester(nisn, semId)) {
                    if (showNotif) {
                        showNotification(`Data nilai belum lengkap. Periksa semua semester.`, 'warning');
                    }
                    return false;
                }
            }
            return true;
        }
        
        function checkNilaiLengkapForSemester(nisn, semesterId) {
            if (!nisn) return false;
            const requiredSubjects = subjects[currentUser.kurikulum];
            for (const subject of requiredSubjects) {
                const nilaiData = database.nilai[nisn]?.[semesterId]?.[subject];
                
                // Untuk Mulok, periksa apakah ada nama mapelnya. Jika tidak, tidak wajib diisi.
                if (subject.startsWith('MULOK')) {
                    const schoolKodeBiasa = String(currentUser.schoolData[0]);
                    const mulokName = database.nilai._mulokNames?.[schoolKodeBiasa]?.[subject];
                    if (!mulokName || mulokName.trim() === '') {
                        continue; // Lewati jika nama mulok kosong
                    }
                }

                if (!nilaiData) return false;

                if (currentUser.kurikulum === 'K13') {
                    if (!nilaiData.KI3 || String(nilaiData.KI3).trim() === '' || !nilaiData.KI4 || String(nilaiData.KI4).trim() === '') {
                        return false;
                    }
                } else { // Merdeka
                    if (!nilaiData.NILAI || String(nilaiData.NILAI).trim() === '') {
                        return false;
                    }
                }
            }
            return true;
        }


        function calculateAverageForSubject(nisn, subjectKey) {
            let totalNilai = 0;
            let countNilai = 0;
            semesterIds.forEach(semId => {
                const nilaiData = database.nilai[nisn]?.[semId]?.[subjectKey];
                let nilai;
            if (currentUser.kurikulum === 'K13') {
                if (nilaiData && nilaiData.RT !== undefined && String(nilaiData.RT).trim() !== '') {
                    nilai = nilaiData.RT;
                } else if (nilaiData && (String(nilaiData.KI3||'').trim() !== '' && String(nilaiData.KI4||'').trim() !== '')) {
                    const k3 = parseFloat(nilaiData.KI3);
                    const k4 = parseFloat(nilaiData.KI4);
                    if (!isNaN(k3) && !isNaN(k4)) nilai = Math.round((k3 + k4) / 2);
                } else {
                    nilai = '';
                }
            } else {
                nilai = nilaiData?.NILAI || '';
            };
                if (nilai !== '' && !isNaN(nilai)) {
                    totalNilai += parseFloat(nilai);
                    countNilai++;
                }
            });
            return countNilai > 0 ? (totalNilai / countNilai) : null;
        }
        
        function formatDateToIndonesian(dateString) {
            if (!dateString || !dateString.includes('-')) return '';
            const [year, month, day] = dateString.split('-');
            if(!year || !month || !day) return '';
            const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
        }


function createTranskripHTML(nisn) {
    const siswa = database.siswa.find(s => s[7] === nisn);
    const sekolah = currentUser.schoolData;
    if (!siswa || !sekolah) return '<p>Data tidak ditemukan.</p>';

    const schoolKodeBiasa = String(sekolah[0]);
    const settings = database.settings[schoolKodeBiasa] || {};

    const { tableRows } = createNilaiTableHTML(nisn, 'transkrip');
    const schoolName = (sekolah[4] || 'NAMA SEKOLAH').toUpperCase();
    const schoolNameHtml = schoolName.length > 40 ? `<p style="font-size: 1em;">${schoolName}</p>` : `<p>${schoolName}</p>`;
    const displayPrintDate = formatDateToIndonesian(settings.printDate) || '.........................';
    
    const transcriptNumberDisplay = (settings.transcriptNumber || '').replace(/ /g, '&nbsp;');
    
    const logoLeftPosTop = settings.logoLeftPosTop || 13;
    const logoLeftPosLeft = settings.logoLeftPosLeft || 15;
    const logoRightPosTop = settings.logoRightPosTop || 13;
    const logoRightPosRight = settings.logoRightPosRight || 15;

    return `
        <div class="transkrip-full-header">
            <img src="${settings.logoLeft || ''}" alt="Logo Kiri" class="transkrip-logo" style="position: absolute; top: ${logoLeftPosTop}mm; left: ${logoLeftPosLeft}mm; width: ${settings.logoLeftSize || 80}px; height: auto;" onerror="this.style.display='none'">
            <div class="transkrip-header-text" style="display: inline-block; vertical-align: middle; padding-top: 13mm;">
                <p>PEMERINTAH KABUPATEN MELAWI</p>
                ${schoolNameHtml}
                <p style="font-weight: normal; font-size: 0.9em;">${settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</p>
            </div>
            <img src="${settings.logoRight || ''}" alt="Logo Kanan" class="transkrip-logo" style="position: absolute; top: ${logoRightPosTop}mm; right: ${logoRightPosRight}mm; width: ${settings.logoRightSize || 80}px; height: auto;" onerror="this.style.display='none'">
        </div>
        <hr class="transkrip-hr">
        <p class="transkrip-title" style="font-size: 1.2em;">TRANSKRIP NILAI</p>
        <p class="transkrip-nomor">Nomor&nbsp;:&nbsp;${transcriptNumberDisplay}</p>
        <div class="transkrip-student-info-grid">
            <span>Satuan Pendidikan</span><span>:</span><span>${sekolah[4] || ''}</span>
            <span>Nomor Pokok Sekolah Nasional</span><span>:</span><span>${sekolah[3] || ''}</span>
            <span>Nama Lengkap</span><span>:</span><span>${siswa[8] || ''}</span>
            <span>Tempat, Tanggal Lahir</span><span>:</span><span>${siswa[9] || ''}</span>
            <span>Nomor Induk Siswa Nasional</span><span>:</span><span>${siswa[7] || ''}</span>
            <span>Nomor Ijazah</span><span>:</span><span>${siswa[12] || ''}</span>
            <span>Tanggal Kelulusan</span><span>:</span><span>2 Juni 2025</span>
        </div>
        <table id="transkripNilaiTable">
            <thead><tr><th>No</th><th>Mata Pelajaran</th><th>Nilai</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div class="transkrip-signature">
            <div class="transkrip-signature-block">
                <p>Kabupaten Melawi, ${displayPrintDate}</p>
                <p>Kepala,</p><br><br><br>
                <p class="principal-name">${settings.principalName || '.........................................'}</p>
                <p>${settings.principalNip ? 'NIP. ' + settings.principalNip : ''}</p>
            </div>
        </div>`;
}
        
function createSklHTML(nisn) {
    const siswa = database.siswa.find(s => s[7] === nisn);
    const sekolah = currentUser.schoolData;
    if (!siswa || !sekolah) return '<p>Data tidak ditemukan.</p>';

    const schoolKodeBiasa = String(sekolah[0]);
    const settings = database.settings[schoolKodeBiasa] || {};

    const { tableRows } = createNilaiTableHTML(nisn, 'skl');
    const schoolName = (sekolah[4] || 'NAMA SEKOLAH').toUpperCase();
    const schoolNameHtml = schoolName.length > 40 ? `<p style="font-size: 1em;">${schoolName}</p>` : `<p>${schoolName}</p>`;

    const sklPhoto = database.sklPhotos?.[nisn];
    let photoBoxContent;
    let photoBoxClass = 'skl-pasfoto no-photo';
    if (sklPhoto) {
        photoBoxContent = `<img src="${sklPhoto}" alt="Pasfoto">`;
        photoBoxClass = 'skl-pasfoto has-photo';
    } else {
        // PERBAIKAN DI SINI: Menggunakan elemen <p> terpisah untuk setiap baris
        photoBoxContent = `
            <p style="margin: 0;">Pasfoto 3 cm x 4 cm</p>
            <p style="margin: 0;">hitam putih atau</p>
            <p style="margin: 0;">berwarna</p>
        `;
    }

    const displayPrintDate = formatDateToIndonesian(settings.printDate) || '.........................';
    const transcriptNumberDisplay = (settings.transcriptNumber || '').replace(/ /g, '&nbsp;');

    const logoLeftPosTop = settings.logoLeftPosTop || 13;
    const logoLeftPosLeft = settings.logoLeftPosLeft || 15;
    const logoRightPosTop = settings.logoRightPosTop || 13;
    const logoRightPosRight = settings.logoRightPosRight || 15;

    return `
        <div class="transkrip-full-header">
            <img src="${settings.logoLeft || ''}" alt="Logo Kiri" class="transkrip-logo" style="position: absolute; top: ${logoLeftPosTop}mm; left: ${logoLeftPosLeft}mm; width: ${settings.logoLeftSize || 80}px; height: auto;" onerror="this.style.display='none'">
            <div class="transkrip-header-text" style="display: inline-block; vertical-align: middle; padding-top: 13mm;">
                <p>PEMERINTAH KABUPATEN MELAWI</p>
                ${schoolNameHtml}
                <p style="font-weight: normal; font-size: 0.9em;">${settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</p>
            </div>
            <img src="${settings.logoRight || ''}" alt="Logo Kanan" class="transkrip-logo" style="position: absolute; top: ${logoRightPosTop}mm; right: ${logoRightPosRight}mm; width: ${settings.logoRightSize || 80}px; height: auto;" onerror="this.style.display='none'">
        </div>
        <hr class="transkrip-hr">
        <p class="transkrip-title"><u>SURAT KETERANGAN LULUS</u></p>
        <p class="transkrip-nomor">TAHUN PELAJARAN 2024/2025</p>
        <p class="transkrip-nomor">Nomor:&nbsp;${transcriptNumberDisplay}</p>
        <p class="skl-body-text">Yang bertanda tangan dibawah ini, Kepala ${sekolah[4] || ''} NPSN: ${sekolah[3] || ''} Kecamatan ${sekolah[2] || ''} Kabupaten Melawi Provinsi Kalimantan Barat menerangkan :</p>
        <div class="transkrip-student-info-grid" style="margin-left: 4cm;">
            <span>Nama</span><span>:</span><span>${siswa[8] || ''}</span>
            <span>Tempat Dan Tanggal Lahir</span><span>:</span><span>${siswa[9] || ''}</span>
            <span>Nama Orang Tua/Wali</span><span>:</span><span>${siswa[10] || ''}</span>
            <span>Nomor Induk Siswa</span><span>:</span><span>${siswa[5] || ''}</span>
            <span>Nomor Induk Siswa Nasional</span><span>:</span><span>${siswa[7] || ''}</span>
            <span>Nomor Ijazah</span><span>:</span><span>${siswa[12] || ''}</span>
        </div>
        <p class="skl-lulus-text">LULUS</p>
        <table id="sklNilaiTable">
            <thead><tr><th>No</th><th>Mata Pelajaran</th><th>Nilai</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        <p class="skl-body-text" style="margin-top: 15px;">Surat Keterangan Kelulusan ini bersifat sementara sampai dikeluarkannya Ijazah.</p>
        <div class="skl-footer">
            <div class="${photoBoxClass}" style="margin-left: ${settings.sklPhotoLayout || 5}%;">${photoBoxContent}</div>
            <div class="transkrip-signature-block">
                <p>Kabupaten Melawi, ${displayPrintDate}</p>
                <p>Kepala Sekolah,</p><br><br><br>
                <p class="principal-name">${settings.principalName || '.........................................'}</p>
                <p>${settings.principalNip ? 'NIP. ' + settings.principalNip : ''}</p>
            </div>
        </div>`;
}

function createSkkbHTML(nisn) {
    const siswa = database.siswa.find(s => s[7] === nisn);
    const sekolah = currentUser.schoolData;
    if (!siswa || !sekolah) return '<p>Data tidak ditemukan.</p>';

    const schoolKodeBiasa = String(sekolah[0]);
    const settings = database.settings[schoolKodeBiasa] || {};

    const schoolName = (sekolah[4] || 'NAMA SEKOLAH').toUpperCase();
    const schoolNameHtml = schoolName.length > 40 ? `<p style="font-size: 1em;">${schoolName}</p>` : `<p>${schoolName}</p>`;
    const displayPrintDate = formatDateToIndonesian(settings.printDate) || '.........................';
    const skkbNumberDisplay = (settings.skkbNumber || '').replace(/ /g, '&nbsp;');

    const logoLeftPosTop = settings.logoLeftPosTop || 13;
    const logoLeftPosLeft = settings.logoLeftPosLeft || 15;
    const logoRightPosTop = settings.logoRightPosTop || 13;
    const logoRightPosRight = settings.logoRightPosRight || 15;

    return `
        <div class="transkrip-full-header">
            <img src="${settings.logoLeft || ''}" alt="Logo Kiri" class="transkrip-logo" style="position: absolute; top: ${logoLeftPosTop}mm; left: ${logoLeftPosLeft}mm; width: ${settings.logoLeftSize || 80}px; height: auto;" onerror="this.style.display='none'">
            <div class="transkrip-header-text" style="display: inline-block; vertical-align: middle; padding-top: 13mm;">
                <p>PEMERINTAH KABUPATEN MELAWI</p>
                ${schoolNameHtml}
                <p style="font-weight: normal; font-size: 0.9em;">${settings.schoolAddress || 'Alamat Sekolah Belum Diatur'}</p>
            </div>
            <img src="${settings.logoRight || ''}" alt="Logo Kanan" class="transkrip-logo" style="position: absolute; top: ${logoRightPosTop}mm; right: ${logoRightPosRight}mm; width: ${settings.logoRightSize || 80}px; height: auto;" onerror="this.style.display='none'">
        </div>
        <hr class="transkrip-hr">
        <p class="transkrip-title" style="font-size: 1.2em;"><u>SURAT KETERANGAN BERKELAKUAN BAIK</u></p>
        <p class="transkrip-nomor">${skkbNumberDisplay}</p>
        <p class="skkb-body-text">Yang bertanda tangan dibawah ini, Kepala ${sekolah[4] || ''} NPSN: ${sekolah[3] || ''} Kecamatan ${sekolah[2] || ''} Kabupaten Melawi Provinsi Kalimantan Barat menerangkan :</p>
        <div class="transkrip-student-info-grid" style="margin-left: 4cm;">
            <span>Nama</span><span>:</span><span>${siswa[8] || ''}</span>
            <span>Tempat dan Tanggal Lahir</span><span>:</span><span>${siswa[9] || ''}</span>
            <span>NIS</span><span>:</span><span>${siswa[5] || ''}</span>
            <span>NISN</span><span>:</span><span>${siswa[7] || ''}</span>
            <span>Nama Orang Tua</span><span>:</span><span>${siswa[10] || ''}</span>
        </div>
        <p class="skkb-body-text">Bahwa nama siswa yang tersebut di atas, selama dalam pendidikan di ${sekolah[4] || ''} Kecamatan ${sekolah[2] || ''} Kabupaten Melawi menunjukkan sikap dan berkelakuan BAIK. Surat keterangan berkelakuan baik (SKKB) ini diberikan kepada yang bersangkutan untuk melengkapi persyaratan meneruskan pendidikan selanjutnya.</p>
        <p class="skkb-body-text">Demikianlah surat keterangan ini dibuat dengan sebenar-benarnya, dan dapat dipergunakan sebagaimana mestinya.</p>
        <div class="transkrip-signature">
            <div class="transkrip-signature-block">
                <p>Kabupaten Melawi, ${displayPrintDate}</p>
                <p>Kepala Sekolah,</p><br><br><br>
                <p class="principal-name">${settings.principalName || '.........................................'}</p>
                <p>${settings.principalNip ? 'NIP. ' + settings.principalNip : ''}</p>
            </div>
        </div>`;
}


// GANTI SELURUH FUNGSI createNilaiTableHTML DENGAN VERSI FINAL INI
function createNilaiTableHTML(nisn, docType, semesterId = null) {
    let tableRows = '';
    let totalRataRata = 0;
    let countRataRata = 0;
    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const settings = database.settings[schoolKodeBiasa] || {};
    const subjectVisibility = settings.subjectVisibility || {};
    const nilaiData = database.nilai[nisn] || {};

    // 1. Filter HANYA mata pelajaran utama yang dicentang (visible)
    const visibleSubjects = transcriptSubjects[currentUser.kurikulum].filter(subject => {
        return subjectVisibility[subject.key] !== false;
    });

    // Membuat baris untuk setiap mapel utama yang visible
    visibleSubjects.forEach((subject, i) => {
        let gradeDisplay;
        if (semesterId) {
            const nilaiSemester = nilaiData[semesterId]?.[subject.key];
            gradeDisplay = (currentUser.kurikulum === 'K13' ? nilaiSemester?.RT : nilaiSemester?.NILAI) || '';
        } else {
            const finalGrade = calculateAverageForSubject(nisn, subject.key);
            gradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : '';
            if (finalGrade !== null) {
                totalRataRata += finalGrade;
                countRataRata++;
            }
        }
        tableRows += `<tr><td style="text-align: center;">${i + 1}</td><td>${subject.display}</td><td style="text-align: center;">${gradeDisplay}</td></tr>`;
    });

    // 2. Selalu tampilkan baris header untuk "Muatan Lokal"
    const mulokHeaderIndex = visibleSubjects.length + 1;
    tableRows += `<tr><td style="text-align: center;">${mulokHeaderIndex}</td><td>Muatan Lokal</td><td></td></tr>`;

    const mulokKeys = ['MULOK1', 'MULOK2', 'MULOK3'];
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const mulokNames = database.nilai?._mulokNames?.[schoolKodeBiasa] || {};

    // 3. Selalu loop sebanyak 3 kali untuk semua slot Mulok
    mulokKeys.forEach((key, index) => {
        const hasCustomName = mulokNames[key] && mulokNames[key].trim() !== '';
        // Jika nama tidak ada, tampilkan '-', persis seperti permintaan Anda
        const displayName = hasCustomName ? mulokNames[key] : '-';
        
        let gradeDisplay = '';
        
        // Hanya hitung nilai jika Mulok tersebut punya nama custom
        if (hasCustomName) {
            if (semesterId) {
                const nilaiSemester = nilaiData[semesterId]?.[key];
                gradeDisplay = (currentUser.kurikulum === 'K13' ? nilaiSemester?.RT : nilaiSemester?.NILAI) || '';
            } else {
                const finalGrade = calculateAverageForSubject(nisn, key);
                gradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : '';
                if (finalGrade !== null) {
                    totalRataRata += finalGrade;
                    countRataRata++;
                }
            }
        }
        
        // Buat baris tabel untuk Mulok.
        tableRows += `
            <tr>
                <td></td>
                <td> &nbsp; &nbsp; ${alphabet[index]}. ${displayName}</td>
                <td style="text-align: center;">${gradeDisplay}</td>
            </tr>
        `;
    });

    // Menghitung dan menambahkan baris Rata-rata (hanya jika dokumennya adalah SKL)
    if (docType === 'skl' && !semesterId) {
        const finalAverage = countRataRata > 0 ? (totalRataRata / countRataRata).toFixed(2) : '-';
        tableRows += `
            <tr>
                <td colspan="2" style="text-align: center; font-weight: bold;">Rata - Rata</td>
                <td style="font-weight: bold; text-align: center;">${finalAverage}</td>
            </tr>
        `;
    }

    return { tableRows };
}


        function openTranskripModal(nisn) {
            if (!checkNilaiLengkap(nisn)) return;
            const content = createTranskripHTML(nisn);
            document.getElementById('transkripContent').innerHTML = content;
            transkripModal.style.display = 'flex';
        }
        
        function openSklModal(nisn) {
            if (!checkNilaiLengkap(nisn)) return;
            const content = createSklHTML(nisn);
            document.getElementById('sklContent').innerHTML = content;
            sklModal.style.display = 'flex';
        }
        
        function openSkkbModal(nisn) {
            const content = createSkkbHTML(nisn);
            document.getElementById('skkbContent').innerHTML = content;
            skkbModal.style.display = 'flex';
        }

        async function downloadTranskripPDF(nisn) {
            if (!checkNilaiLengkap(nisn)) return;
            const content = createTranskripHTML(nisn);
            await downloadAsPDF(content, nisn, 'Transkrip');
        }
        
        async function downloadSklPDF(nisn) {
            if (!checkNilaiLengkap(nisn)) return;
            const content = createSklHTML(nisn);
            await downloadAsPDF(content, nisn, 'SKL');
        }
        
        async function downloadSkkbPDF(nisn) {
            const content = createSkkbHTML(nisn);
            await downloadAsPDF(content, nisn, 'SKKB');
        }
        
        async function downloadAsPDF(content, nisn, docType) {
            const { jsPDF } = window.jspdf;
            const pdfContainer = document.getElementById('pdf-content');
            const siswa = database.siswa.find(s => s[7] === nisn);
            const sekolah = currentUser.schoolData;

            if(!siswa || !sekolah) {
                showNotification('Data siswa atau sekolah tidak ditemukan.', 'error');
                return;
            }

            pdfContainer.innerHTML = content;
            
            showLoader();
            showNotification(`Membuat PDF ${docType}...`, 'success');

            try {
                const canvas = await html2canvas(pdfContainer, { scale: 3, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

                const namaSekolah = (sekolah[5] || 'sekolah').replace(/ /g, '_');
                const namaSiswa = (siswa[8] || 'siswa').replace(/ /g, '_');
                const fileName = `${docType}_${namaSekolah}_${namaSiswa}.pdf`;
                
                pdf.save(fileName);

            } catch (error) {
                console.error("Error creating PDF:", error);
                showNotification("Gagal membuat file PDF.", 'error');
            } finally {
                pdfContainer.innerHTML = '';
                hideLoader();
            }
        }


// TAMBAHKAN SELURUH BLOK FUNGSI BARU INI
// GANTI SELURUH FUNGSI renderSettingsPage ANDA DENGAN KODE LENGKAP DI BAWAH INI:

function renderSettingsPage() {
    if (!currentUser.schoolData) return;
    const schoolKodeBiasa = String(currentUser.schoolData[0]);
    const settings = database.settings[schoolKodeBiasa] || {};
    const mulokNames = database.nilai._mulokNames?.[schoolKodeBiasa] || {};

    // ... (kode untuk mengisi form, slider, logo, dan mulok tetap sama) ...
    document.getElementById('settingMulok3Name').value = mulokNames['MULOK3'] || '';
    
    // --- BAGIAN PENTING UNTUK MENAMPILKAN DAFTAR MAPEL ---
    const subjectContainer = document.getElementById('subjectSelectionContainer');
    subjectContainer.innerHTML = ''; // Pastikan dikosongkan dulu
    const subjectVisibility = settings.subjectVisibility || {};
    const allSubjects = transcriptSubjects[currentUser.kurikulum];

    allSubjects.forEach(subject => {
        const isChecked = subjectVisibility[subject.key] !== false;
        const checkboxHTML = `
            <div class="subject-checkbox">
                <input type="checkbox" id="check-${subject.key}" data-subject-key="${subject.key}" ${isChecked ? 'checked' : ''}>
                <label for="check-${subject.key}">${subject.display}</label>
            </div>
        `;
        subjectContainer.innerHTML += checkboxHTML;
    });
}

// ==========================================================
// == TAMBAHKAN KEMBALI FUNGSI YANG HILANG INI ==
// GANTI SELURUH FUNGSI saveSettings ANDA DENGAN KODE LENGKAP DI BAWAH INI:

// GANTI SELURUH FUNGSI saveSettings DENGAN VERSI FINAL INI
// GANTI SELURUH FUNGSI saveSettings DENGAN VERSI FINAL INI
async function saveSettings(event) {
    try {
        if (!currentUser.schoolData) return;
        const schoolKodeBiasa = String(currentUser.schoolData[0]);
        showLoader();

        // 1. Kumpulkan semua data dari form
        const settingsData = {
            principalName: document.getElementById('settingPrincipalName').value,
            principalNip: document.getElementById('settingPrincipalNip').value,
            schoolAddress: document.getElementById('settingSchoolAddress').value,
            printDate: document.getElementById('settingPrintDate').value,
            transcriptNumber: document.getElementById('settingTranscriptNumber').value,
            skkbNumber: document.getElementById('settingSkkbNumber').value,
            logoLeftSize: document.getElementById('settingLogoLeftSize').value,
            logoRightSize: document.getElementById('settingLogoRightSize').value,
            sklPhotoLayout: document.getElementById('settingSklPhotoLayout').value,
            logoLeftPosTop: document.getElementById('settingLogoLeftPosTop').value,
            logoLeftPosLeft: document.getElementById('settingLogoLeftPosLeft').value,
            logoRightPosTop: document.getElementById('settingLogoRightPosTop').value,
            logoRightPosRight: document.getElementById('settingLogoRightPosRight').value,
            subjectVisibility: {}
        };
        document.querySelectorAll('#subjectSelectionContainer input[type="checkbox"]').forEach(checkbox => {
            settingsData.subjectVisibility[checkbox.dataset.subjectKey] = checkbox.checked;
        });

        const mulokNamesData = {
            MULOK1: document.getElementById('settingMulok1Name').value,
            MULOK2: document.getElementById('settingMulok2Name').value,
            MULOK3: document.getElementById('settingMulok3Name').value
        };

        // 2. Kirim data ke server menggunakan fetchWithAuth
        const result = await fetchWithAuth('http://localhost:3000/api/data/settings/save', {
            method: 'POST',
            body: JSON.stringify({
                schoolCode: schoolKodeBiasa,
                settingsData: settingsData,
                mulokNamesData: mulokNamesData
            })
        });

        if (result.success) {
            // 3. Update data lokal di browser setelah berhasil disimpan di server
            database.settings[schoolKodeBiasa] = { ...database.settings[schoolKodeBiasa], ...settingsData };
            if (!database.nilai._mulokNames) database.nilai._mulokNames = {};
            database.nilai._mulokNames[schoolKodeBiasa] = mulokNamesData;
            showNotification(result.message, 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification(error.message || 'Gagal menyimpan pengaturan.', 'error');
    } finally {
        hideLoader();
    }
}

// ==========================================================
        // Ganti seluruh fungsi handleSklPhotoUpload dengan versi async ini
// GANTI SELURUH FUNGSI handleSklPhotoUpload DENGAN VERSI FINAL INI
// GANTI SELURUH FUNGSI INI
async function handleSklPhotoUpload(event, nisn) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const photoData = e.target.result;
        try {
            showLoader();
            const result = await fetchWithAuth('http://localhost:3000/api/data/skl-photo/save', {
                method: 'POST',
                body: JSON.stringify({ nisn: nisn, photoData: photoData })
            });

            if (result.success) {
                if (!database.sklPhotos) database.sklPhotos = {};
                database.sklPhotos[nisn] = photoData; // Update data lokal
                showNotification('Foto berhasil diunggah!', 'success');
                // === PERBAIKAN UTAMA DI SINI ===
                rerenderActiveTable('sekolahSiswa'); // Render ulang tabel profil siswa
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message || 'Gagal mengunggah foto.', 'error');
        } finally {
            hideLoader();
        }
    };
    reader.readAsDataURL(file);
}

// GANTI SELURUH FUNGSI INI JUGA
async function deleteSklPhoto(nisn) {
    if (confirm('Apakah Anda yakin ingin menghapus foto siswa ini?')) {
        try {
            showLoader();
            const result = await fetchWithAuth('http://localhost:3000/api/data/skl-photo/delete', {
                method: 'POST',
                body: JSON.stringify({ nisn: nisn })
            });

            if (result.success) {
                if (database.sklPhotos?.[nisn]) delete database.sklPhotos[nisn]; // Update data lokal
                showNotification('Foto berhasil dihapus.', 'success');
                // === PERBAIKAN UTAMA DI SINI ===
                rerenderActiveTable('sekolahSiswa'); // Render ulang tabel profil siswa
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message || 'Gagal menghapus foto dari server.', 'error');
        } finally {
            hideLoader();
        }
    }
}
        

// GANTI SELURUH FUNGSI INI
async function handleLogoUpload(event, logoKey, previewId) {
    const file = event.target.files[0];
    if (!file || !currentUser.schoolData) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            showLoader();
            const schoolKodeBiasa = String(currentUser.schoolData[0]);
            const logoData = e.target.result;
            document.getElementById(previewId).src = logoData;

            const partialSettingsData = {};
            partialSettingsData[logoKey] = logoData;

            const result = await fetchWithAuth('http://localhost:3000/api/data/settings/save', {
                method: 'POST',
                body: JSON.stringify({ 
                    schoolCode: schoolKodeBiasa, 
                    settingsData: partialSettingsData
                })
            });

            if (result.success) {
                if (!database.settings[schoolKodeBiasa]) database.settings[schoolKodeBiasa] = {};
                database.settings[schoolKodeBiasa][logoKey] = logoData;
                showNotification('Logo berhasil diunggah dan disimpan!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message || 'Gagal mengunggah logo ke server.', 'error');
            const oldLogo = (database.settings[currentUser.schoolData[0]] && database.settings[currentUser.schoolData[0]][logoKey]);
            document.getElementById(previewId).src = oldLogo || 'https://placehold.co/80x80/f0f0f0/ccc?text=Logo';
        } finally {
            hideLoader();
        }
    };
    reader.readAsDataURL(file);
}

        // Ganti seluruh fungsi deleteAllGradesForSemester dengan versi async ini
// GANTI SELURUH FUNGSI deleteAllGradesForSemester DENGAN VERSI FINAL INI
async function deleteAllGradesForSemester() {
    const { currentSemester, currentSemesterName } = paginationState.isiNilai;
    if (!currentSemester) {
        showNotification("Pilih semester terlebih dahulu.", 'warning');
        return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus semua nilai untuk semester ${currentSemesterName}? Aksi ini tidak dapat dibatalkan.`)) {
        try {
            showLoader();
            const schoolCode = String(currentUser.schoolData[0]);

            // Langsung gunakan hasil dari fetchWithAuth sebagai 'result'
            const result = await fetchWithAuth('http://localhost:3000/api/data/grades/delete-by-semester', {
                method: 'POST',
                body: JSON.stringify({ schoolCode: schoolCode, semesterId: currentSemester })
            });

            if (result.success) {
                // Panggil nama fungsi yang benar
                await fetchDataFromServer(); 

                // Render ulang halaman "Isi Nilai"
                renderIsiNilaiPage(currentSemester, currentSemesterName);
                showNotification(result.message, 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showNotification(error.message || 'Gagal menghapus data nilai.', 'error');
        } finally {
            hideLoader();
        }
    }
}
        
        function renderCetakGabunganPage() {
            const proMessage = document.getElementById('cetakGabunganProMessage');
            const tableContainer = document.getElementById('cetakGabunganTableContainer');
            const paginationControls = document.querySelector('.pagination-controls[data-table-id="cetakGabungan"]');
            const searchBar = document.getElementById('searchCetakGabungan');

            if (currentUser.loginType !== 'pro') {
                proMessage.style.display = 'block';
                tableContainer.style.display = 'none';
                paginationControls.style.display = 'none';
                searchBar.style.display = 'none';
                return;
            }
            
            proMessage.style.display = 'none';
            tableContainer.style.display = 'block';
            paginationControls.style.display = 'flex';
            searchBar.style.display = 'block';
            
            renderGenericSiswaTable('cetakGabungan', '', 'downloadGabunganPDF');
        }
        
        async function downloadGabunganPDF(nisn) {
            if (!checkNilaiLengkap(nisn)) return;
            const { jsPDF } = window.jspdf;
            const pdfContainer = document.getElementById('pdf-content');
            const siswa = database.siswa.find(s => s[7] === nisn);
            const sekolah = currentUser.schoolData;

            if(!siswa || !sekolah) {
                showNotification('Data siswa atau sekolah tidak ditemukan.', 'error');
                return;
            }

            showLoader();
            showNotification('Membuat PDF Gabungan...', 'success');

            try {
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const documents = [
                    { type: 'Transkrip', html: createTranskripHTML(nisn) },
                    { type: 'SKL', html: createSklHTML(nisn) },
                    { type: 'SKKB', html: createSkkbHTML(nisn) }
                ];

                for (let i = 0; i < documents.length; i++) {
                    const doc = documents[i];
                    pdfContainer.innerHTML = doc.html;
                    
                    const canvas = await html2canvas(pdfContainer, { scale: 3, useCORS: true });
                    const imgData = canvas.toDataURL('image/png');
                    
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                }

                const namaSekolah = (sekolah[5] || 'sekolah').replace(/ /g, '_');
                const namaSiswa = (siswa[8] || 'siswa').replace(/ /g, '_');
                const fileName = `Laporan_Gabungan_${namaSekolah}_${namaSiswa}.pdf`;
                
                pdf.save(fileName);

            } catch (error) {
                console.error("Error creating combined PDF:", error);
                showNotification("Gagal membuat file PDF gabungan.", 'error');
            } finally {
                pdfContainer.innerHTML = '';
                hideLoader();
            }
        }


async function handleBackup() {
    if (currentUser.role !== 'sekolah' || !currentUser.schoolData) return;

    showLoader();
    try {
        const schoolCode = String(currentUser.schoolData[0]);
        const schoolName = (currentUser.schoolData[5] || 'sekolah').replace(/ /g, '_');

        // Kita gunakan data `database` yang ada di frontend karena sudah paling update
        const backupData = {
            appVersion: '2.6-server',
            backupDate: new Date().toISOString(),
            schoolCode: schoolCode, // Menyertakan schoolCode
            schoolName: currentUser.schoolData[4],
            siswa: database.siswa.filter(s => String(s[0]) === schoolCode),
            nilai: {},
            settings: database.settings[schoolCode] || {},
            sklPhotos: {},
            mulokNames: database.nilai._mulokNames ? (database.nilai._mulokNames[schoolCode] || {}) : {}
        };

        const schoolNisns = new Set(backupData.siswa.map(s => s[7]));
        schoolNisns.forEach(nisn => {
            if (database.nilai[nisn]) backupData.nilai[nisn] = database.nilai[nisn];
            if (database.sklPhotos[nisn]) backupData.sklPhotos[nisn] = database.sklPhotos[nisn];
        });

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `backup_${schoolName}_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Backup data berhasil diunduh!', 'success');
    } catch (error) {
        console.error("Backup failed:", error);
        showNotification(error.message || 'Terjadi kesalahan saat membuat backup.', 'error');
    } finally {
        hideLoader();
    }
}

// Ganti seluruh fungsi handleRestore dengan versi async ini
// GANTI SELURUH FUNGSI handleRestore DENGAN VERSI FINAL INI
async function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            showLoader();
            const backupData = JSON.parse(e.target.result);

            // Validasi dasar di frontend
            if (!backupData || !backupData.schoolCode) {
                throw new Error('File backup tidak valid atau tidak berisi kode sekolah.');
            }

            // Langsung gunakan hasil dari fetchWithAuth sebagai 'result'
            const result = await fetchWithAuth('http://localhost:3000/api/data/restore', {
                method: 'POST',
                body: JSON.stringify(backupData)
            });

            if (result.success) {
                showNotification('Data berhasil direstore! Halaman akan dimuat ulang untuk menerapkan perubahan.', 'success');
                // Muat ulang halaman setelah 2 detik
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            console.error("Restore failed:", err);
            showNotification(err.message || 'Gagal memproses file backup!', 'error');
        } finally {
            hideLoader();
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}



document.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('currentUserSession');
    if (savedSession) {
        currentUser = JSON.parse(savedSession);
        if (currentUser.isLoggedIn) {
            fetchDataFromServer().then(() => {
                showDashboard(currentUser.role);
            });
        }
    }


        // Mengaktifkan sistem tab di menu Setting
    setupSettingTabs();


const btnTambah = document.getElementById('btnTambahSekolah');
    if (btnTambah) {
        btnTambah.addEventListener('click', () => {
            // Memanggil fungsi untuk membuka modal dengan mode 'add'
            openSekolahModal('add');
        });
    }

    // Menggunakan Event Delegation untuk tombol Edit dan Hapus yang dinamis
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.addEventListener('click', (event) => {
            // Cek apakah yang diklik adalah tombol Edit Sekolah
            if (event.target.matches('.btn-edit-sekolah')) {
                const kodeBiasa = event.target.dataset.kode;
                const rowData = database.sekolah.find(s => s[0] === kodeBiasa);
                if (rowData) {
                    openSekolahModal('edit', rowData);
                }
            }

            // Cek apakah yang diklik adalah tombol Hapus Sekolah
            if (event.target.matches('.btn-delete-sekolah')) {
                const kodeBiasa = event.target.dataset.kode;
                handleDeleteSekolah(kodeBiasa);
            }
        });
    }

    // Menghubungkan event 'submit' pada form di dalam modal
    const sekolahForm = document.getElementById('sekolahForm');
    if (sekolahForm) {
        sekolahForm.addEventListener('submit', (event) => {
            handleSekolahFormSubmit(event);
        });
    }

    // Menghubungkan tombol 'X' di modal agar bisa menutup pop-up
    const closeBtn = document.getElementById('closeSekolahModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeSekolahModal();
        });
    }

    // Tambahan: Menutup modal saat mengklik area luar (overlay)
    const sekolahModal = document.getElementById('sekolahModal');
    if (sekolahModal) {
        sekolahModal.addEventListener('click', (event) => {
            // Cek jika yang diklik adalah area overlay itu sendiri, bukan konten di dalamnya
            if (event.target === sekolahModal) {
                closeSekolahModal();
            }
        });
    }
    // --- Dari sini ke bawah adalah semua event listener yang benar ---
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('cancelBtn').addEventListener('click', () => { appCodeInput.value = ''; });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('sekolahLogoutBtn').addEventListener('click', handleLogout);

    document.querySelectorAll('#adminDashboard .sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            switchContent(item.dataset.target);
        });
    });

    document.querySelectorAll('#sekolahDashboard .sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            if (item.classList.contains('has-submenu')) {
                item.classList.toggle('open');
                const submenu = document.getElementById(item.dataset.target);
                if (submenu) submenu.classList.toggle('open');
            } else {
                switchSekolahContent(item.dataset.target);
            }
        });
    });
    
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            paginationState.isiNilai.currentPage = 1;
            renderIsiNilaiPage(item.dataset.semester, item.dataset.semesterName);
        });
    });
    
    document.querySelectorAll('.btn-import[data-target-input]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById(button.dataset.targetInput).click();
        });
    });
    
    document.getElementById('importSekolahInput').addEventListener('change', (e) => handleFile(e, 'sekolah'));
    document.getElementById('importSiswaInput').addEventListener('change', (e) => handleFile(e, 'siswa'));
    
    document.querySelectorAll('.btn-delete[data-table-id]').forEach(button => {
        button.addEventListener('click', () => {
            deleteAllData(button.dataset.tableId);
        });
    });

    document.querySelectorAll('.pagination-controls').forEach(controls => {
        const tableId = controls.dataset.tableId;
        if (!tableId) return;
        const prevButton = controls.querySelector('.prev-page');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (paginationState[tableId] && paginationState[tableId].currentPage > 1) {
                    paginationState[tableId].currentPage--;
                    rerenderActiveTable(tableId);
                }
            });
        }
        const nextButton = controls.querySelector('.next-page');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const state = paginationState[tableId];
                if (!state) return;
                let data;
                if (tableId === 'sekolah' || tableId === 'siswa') {
                    data = database[tableId];
                } else {
                    if (!currentUser.schoolData) return;
                    const schoolKodeBiasa = String(currentUser.schoolData[0]);
                    const allSiswaForSchool = database.siswa.filter(s => String(s[0]) === schoolKodeBiasa);
                    const searchTerm = searchState[tableId] || '';
                    data = filterSiswaData(allSiswaForSchool, searchTerm);
                }
                if (!data) return;
                const rowsPerPage = state.rowsPerPage === 'all' ? data.length : parseInt(state.rowsPerPage);
                const totalPages = rowsPerPage > 0 ? Math.ceil(data.length / rowsPerPage) : 1;
                if (state.currentPage < totalPages) {
                    state.currentPage++;
                    rerenderActiveTable(tableId);
                }
            });
        }
        const rowsPerPageSelect = controls.querySelector('.rows-per-page');
        if (rowsPerPageSelect) {
            rowsPerPageSelect.addEventListener('change', (e) => {
                if (paginationState[tableId]) {
                    paginationState[tableId].rowsPerPage = e.target.value;
                    paginationState[tableId].currentPage = 1;
                    rerenderActiveTable(tableId);
                }
            });
        }
    });

    document.querySelectorAll('.search-bar').forEach(searchBar => {
        searchBar.addEventListener('input', (e) => {
            const tableId = e.target.dataset.tableId;
            if (searchState.hasOwnProperty(tableId) && paginationState.hasOwnProperty(tableId)) {
                searchState[tableId] = e.target.value;
                paginationState[tableId].currentPage = 1;
                rerenderActiveTable(tableId);
            }
        });
    });

    editSiswaForm.addEventListener('submit', saveSiswaChanges);
    window.addEventListener('click', (event) => {
        if (event.target == editModal) closeEditModal();
        if (event.target == transkripModal) closeTranskripModal();
        if (event.target == sklModal) closeSklModal();
        if (event.target == skkbModal) closeSkkbModal();
        if (event.target == loginInfoModal) closeLoginInfoModal();
    });

// ==== Delegasi Event Toolbar "Isi Nilai" ====
// Berfungsi walau DOM tombol dibuat/dihapus berkali-kali.
document.addEventListener('click', (e) => {
  // Download Template
  const dlBtn = e.target.closest('#btnDownloadTemplate');
  if (dlBtn) {
    e.preventDefault();
    try {
      downloadIsiNilaiTemplate();
    } catch (err) {
      console.error('Download template error:', err);
    }
    return;
  }

  // Upload Nilai -> trigger input file hidden
  const upBtn = e.target.closest('#btnUploadNilai');
  if (upBtn) {
    e.preventDefault();
    const fileInput = document.getElementById('uploadExcelInput');
    if (fileInput) fileInput.click();
    return;
  }
});

// Change handler untuk input file (hidden)
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'uploadExcelInput') {
    handleUploadExcelChange(e);
  }
});

   
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('settingLogoLeftInput').addEventListener('change', (e) => handleLogoUpload(e, 'logoLeft', 'logoLeftPreview'));
    document.getElementById('settingLogoRightInput').addEventListener('change', (e) => handleLogoUpload(e, 'logoRight', 'logoRightPreview'));
    document.getElementById('settingLogoLeftSize').addEventListener('input', (e) => { document.getElementById('logoLeftSizeLabel').textContent = e.target.value; });
    document.getElementById('settingLogoRightSize').addEventListener('input', (e) => { document.getElementById('logoRightSizeLabel').textContent = e.target.value; });
    document.getElementById('settingSklPhotoLayout').addEventListener('input', (e) => { document.getElementById('sklPhotoLayoutLabel').textContent = e.target.value; });
    document.getElementById('deleteAllGradesBtn').addEventListener('click', deleteAllGradesForSemester);
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
    document.getElementById('restoreInput').addEventListener('change', handleRestore);
    // ==========================================================
});
    editSiswaForm.addEventListener('submit', saveSiswaChanges);
    window.addEventListener('click', (event) => {
        if (event.target == editModal) closeEditModal();
        if (event.target == transkripModal) closeTranskripModal();
        if (event.target == sklModal) closeSklModal();
        if (event.target == skkbModal) closeSkkbModal();
        if (event.target == loginInfoModal) closeLoginInfoModal();
    });


    
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('settingLogoLeftInput').addEventListener('change', (e) => handleLogoUpload(e, 'logoLeft', 'logoLeftPreview'));
    document.getElementById('settingLogoRightInput').addEventListener('change', (e) => handleLogoUpload(e, 'logoRight', 'logoRightPreview'));
    document.getElementById('settingLogoLeftSize').addEventListener('input', (e) => { document.getElementById('logoLeftSizeLabel').textContent = e.target.value; });
    document.getElementById('settingLogoRightSize').addEventListener('input', (e) => { document.getElementById('logoRightSizeLabel').textContent = e.target.value; });
    document.getElementById('settingSklPhotoLayout').addEventListener('input', (e) => { document.getElementById('sklPhotoLayoutLabel').textContent = e.target.value; });
    document.getElementById('deleteAllGradesBtn').addEventListener('click', deleteAllGradesForSemester);
    document.getElementById('backupBtn').addEventListener('click', handleBackup);
    document.getElementById('restoreBtn').addEventListener('click', () => document.getElementById('restoreInput').click());
    document.getElementById('restoreInput').addEventListener('change', handleRestore);

     populateKecamatanFilter();

    
/* ==== Excel Template & Upload Nilai (Isi Nilai) ==== */
// ===================== HELPER (PASTIKAN HANYA ADA SATU) =====================
function _getCurrentSchoolKode() {
  return String((currentUser && currentUser.schoolData && currentUser.schoolData[0]) || '');
}
function _getMulokNamesForSchool() {
  const kode = _getCurrentSchoolKode();
  const names = (database.nilai && database.nilai._mulokNames && database.nilai._mulokNames[kode]) || {};
  return names; // mis: { MULOK1: "BTQ", MULOK2: "Bahasa Daerah", MULOK3: "" }
}
function _normalizeHeader(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[().]/g, '') // "KI.3" -> "ki3"
    .trim();
}
function _subjectDisplayForTemplate(code) {
  // Dipakai saat membuat template; untuk MULOK pakai nama kustom jika ada
  const mn = _getMulokNamesForSchool();
  if (code.startsWith('MULOK')) {
    return mn[code] && mn[code].trim() ? mn[code] : code;
  }
  return code;
}

// ===================== MAPPER HEADER → KOLOM NILAI (PASTIKAN HANYA ADA SATU) =====================
function _mapHeadersToKeys(headers, kur) {
  const norm = headers.map(_normalizeHeader);
  const idxNISN = norm.findIndex(h => h === 'nisn');
  const idxNama = norm.findIndex(h => h === 'nama' || h === 'nama peserta' || h === 'nama siswa');

  const headerToIndex = new Map(norm.map((h, i) => [h, i]));
  const map = {}; // colIndex -> { subject: 'AGAMA'|'PKN'|...|'MULOK1', type: 'KI3'|'KI4'|'NILAI' }

  const addIf = (key, subject, type) => {
    const idx = headerToIndex.get(key);
    if (idx !== undefined && idx >= 0) map[idx] = { subject, type };
  };

  // alias umum untuk Merdeka (1 kolom nilai) dan K13 (KI3/KI4)
  const aliasBase = {
    'agama': 'AGAMA', 'pai': 'AGAMA', 'pabp': 'AGAMA',
    'ppkn': 'PKN', 'pkn': 'PKN',
    'bahasa indonesia': 'B.INDO', 'bindo': 'B.INDO', 'b indo': 'B.INDO',
    'matematika': 'MTK', 'mtk': 'MTK', 'mat': 'MTK',
    'ipas': 'IPAS', 'ipa': 'IPAS', 'ips': 'IPAS',
    'bahasa inggris': 'B.ING', 'bing': 'B.ING', 'b inggris': 'B.ING',
    'sbdp': 'SBDP', 'sbkp': 'SBDP', 'sbk': 'SBDP',
    'pjok': 'PJOK', 'penjas': 'PJOK', 'penjaskes': 'PJOK',
  };

  // nama MULOK kustom (jika di-setting)
  const mn = _getMulokNamesForSchool(); // { MULOK1: 'BTQ', ... }
  const mulokKeys = ['MULOK1', 'MULOK2', 'MULOK3'];
  const mulokVariants = mulokKeys.map(k => {
    const custom = _normalizeHeader(mn[k] || '');  // 'btq'
    const variants = [custom, _normalizeHeader(k), _normalizeHeader(k.replace('MULOK', 'Muatan Lokal '))].filter(Boolean);
    return Array.from(new Set(variants)); // buang duplikat
  });

  if (kur === 'K13') {
    // 1) map kolom KI.3 & KI.4 untuk mapel standar
    (subjects && subjects.K13 ? subjects.K13 : []).forEach(code => {
      const disp = _normalizeHeader(_subjectDisplayForTemplate(code)); // nama display
      const codeNorm = _normalizeHeader(code); // kode baku
      const bases = Array.from(new Set([disp, codeNorm, ...Object.keys(aliasBase).filter(a => aliasBase[a] === code)]));
      bases.forEach(base => {
        addIf(`${base} ki3`, code, 'KI3');
        addIf(`${base} ki4`, code, 'KI4');
      });
    });

    // 2) fallback khusus MULOK K13 (kalau header pakai nama kustom): cari "<namaMulok> ki3/ki4"
    mulokVariants.forEach((variants, i) => {
      variants.forEach(v => {
        addIf(`${v} ki3`, `MULOK${i + 1}`, 'KI3');
        addIf(`${v} ki4`, `MULOK${i + 1}`, 'KI4');
      });
    });

  } else {
    // Merdeka: 1 kolom per mapel
    (subjects && subjects.Merdeka ? subjects.Merdeka : []).forEach(code => {
      const disp = _normalizeHeader(_subjectDisplayForTemplate(code));
      const codeNorm = _normalizeHeader(code);
      const bases = Array.from(new Set([disp, codeNorm, ...Object.keys(aliasBase).filter(a => aliasBase[a] === code)]));
      bases.forEach(base => addIf(base, code, 'NILAI'));
    });

    // Fallback MULOK Merdeka: jika header memakai nama kustom saja
    mulokVariants.forEach((variants, i) => {
      variants.forEach(v => addIf(v, `MULOK${i + 1}`, 'NILAI'));
    });

    // Kalau masih ada header tak dikenal, alokasikan ke MULOK yang kosong (urutan MULOK1..3)
    const already = new Set(Object.keys(map).map(k => parseInt(k, 10)));
    const freeMulok = mulokKeys.filter(k => !Object.values(map).some(v => v.subject === k));
    if (freeMulok.length) {
      for (let col = 0; col < norm.length; col++) {
        if (col === idxNISN || col === idxNama || already.has(col)) continue;
        const h = norm[col];
        if (!h || h === '-' || h === 'nil') continue;
        const target = freeMulok.shift();
        if (!target) break;
        map[col] = { subject: target, type: 'NILAI' };
      }
    }
  }

  return { map, idxNISN, idxNama };
}


async function handleUploadExcelChange(evt) {
  const file = evt.target.files?.[0];
  if (!file) return;

  showLoader();
  try {
    // Pastikan nama MULOK sudah ada agar mapping di upload pertama langsung benar
    const kode = _getCurrentSchoolKode();
    if (!database.nilai || !database.nilai._mulokNames || !database.nilai._mulokNames[kode]) {
      await fetchDataFromServer();
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

    if (aoa.length < 2) throw new Error('Sheet kosong atau hanya header.');
    const headers = aoa[0];
    const rows = aoa.slice(1);

    const kur = currentUser?.kurikulum || 'Merdeka';
    const { map, idxNISN } = _mapHeadersToKeys(headers, kur);
    if (idxNISN < 0) throw new Error('Kolom NISN tidak ditemukan di header.');

    const semester = paginationState?.isiNilai?.currentSemester;

    const gradesToSave = [];
    for (const r of rows) {
      const nisn = String(r[idxNISN] ?? '').trim();
      if (!nisn) continue;

      for (const colIdxStr of Object.keys(map)) {
        const colIdx = +colIdxStr;
        const { subject, type } = map[colIdx];

        let raw = r[colIdx];
        if (raw === undefined || raw === null || String(raw).trim() === '') continue;

        let value = String(raw).replace(',', '.').trim();
        const num = Number(value);
        value = Number.isFinite(num) ? num : value;

        gradesToSave.push({ nisn, semester, subject, type, value });
      }
    }

    if (!gradesToSave.length) throw new Error('Tidak ada nilai yang terbaca dari file.');

    // ⛳ PENTING: fetchWithAuth mengembalikan JSON, jadi cek .success (bukan resp.ok / resp.text)
    const result = await fetchWithAuth('http://localhost:3000/api/data/grades/save-bulk', {
      method: 'POST',
      body: JSON.stringify(gradesToSave)
    });

    if (!result || result.success === false) {
      throw new Error(result?.message || 'Gagal menyimpan nilai (server).');
    }

 
    await fetchDataFromServer();                  // tarik data terbaru dari server
await refreshIsiNilaiViewAfterSave();         // ➜ paksa render ulang & reset pagination
showNotification(result.message || 'Berhasil menyimpan nilai.', 'success');


  } catch (err) {
    console.error('Error processing Excel for grades:', err);
    showNotification(err.message || 'Gagal memproses file Excel.', 'error');
  } finally {
    hideLoader();
    evt.target.value = '';
  }
}




async function saveIjazahNumber(inputElement) {
  const originalIndex = inputElement.dataset.index;
  const newValue = inputElement.value.trim();
  const siswaData = database.siswa[originalIndex];
  if (!siswaData) return;

  const nisn = String(siswaData[7]);
  inputElement.classList.remove('invalid-input');

  // Validasi: boleh kosong, atau 15 digit
  if (newValue !== '' && !/^\d{15}$/.test(newValue)) {
    const msg = 'Nomor Ijazah harus tepat 15 digit dan hanya berisi angka.';
    showNotification(msg, 'error');
    inputElement.classList.add('invalid-input');
    inputElement.value = siswaData[11] || '';
    setTimeout(() => inputElement.classList.remove('invalid-input'), 2500);
    return;
  }

  // Optimistic update (kembalikan jika gagal)
  const prev = siswaData[11];
  siswaData[11] = newValue;

  try {
    const result = await fetchWithAuth('http://localhost:3000/api/data/siswa/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nisn, updatedData: { noIjazah: newValue } })
    });
    if (!result.success) throw new Error(result.message);
    showNotification('Nomor Ijazah berhasil disimpan!', 'success');
  } catch (err) {
    siswaData[11] = prev;
    showNotification(err.message || 'Gagal menyimpan No. Ijazah ke server.', 'error');
  }
}


let rekapNilaiAdminState = {
    filteredSiswa: [],
    selectedSchool: null,
    selectedKurikulum: null
};


function renderRekapNilaiAdminPage() {
    const tableHead = document.querySelector("#rekapNilaiAdmin table thead tr"); // <-- Pencarian dibuat lebih spesifik
    if (!tableHead) return; // Hentikan fungsi jika header tidak ditemukan

    const subjects = transcriptSubjects[currentUser.kurikulum || 'Merdeka'];
    const mapelHeader = subjects.map(s => `<th>${s.display}</th>`).join('');

    tableHead.innerHTML = `
        <th>No</th>
        <th>NISN</th>
        <th>Nama Siswa</th>
        <th>Asal Sekolah</th>
        ${mapelHeader}
        <th>Rata-rata</th>
    `;
}

// Mengisi dropdown filter
function populateRekapNilaiFilters() {
    const kecamatanFilter = document.getElementById('filterKecamatan');
    kecamatanFilter.innerHTML = '<option value="">Semua Kecamatan</option>';
    const sekolahFilter = document.getElementById('filterSekolah');
    sekolahFilter.innerHTML = '<option value="">Semua Sekolah</option>';

    const allKecamatan = [...new Set(database.sekolah.map(s => s[2]))];
    allKecamatan.forEach(kecamatan => {
        kecamatanFilter.innerHTML += `<option value="${kecamatan}">${kecamatan}</option>`;
    });

    const selectedKecamatan = kecamatanFilter.value;
    if (selectedKecamatan) populateSekolahFilter();
}

// [PERBAIKAN #2]
// [GANTI FUNGSI INI SECARA KESELURUHAN]
function populateSekolahFilter() {
    const kecamatanFilter = document.getElementById('filterKecamatan');
    const sekolahFilter = document.getElementById('filterSekolah');
    const selectedKecamatan = kecamatanFilter.value;

    sekolahFilter.innerHTML = '<option value="">Semua Sekolah</option>';
    
    // Hanya mengisi sekolah jika kecamatan dipilih
    if (selectedKecamatan) {
        // [PERBAIKAN DI SINI] 
        // Membuat pencocokan lebih fleksibel dengan .trim() untuk menghapus spasi
        // dan .toUpperCase() untuk mengabaikan perbedaan huruf besar/kecil.
        const filteredSchools = database.sekolah.filter(s => 
            String(s[2]).trim().toUpperCase() === selectedKecamatan.trim().toUpperCase()
        );
        
        filteredSchools.forEach(sekolah => {
            sekolahFilter.innerHTML += `<option value="${sekolah[0]}">${sekolah[4]}</option>`;
        });
    }
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
// [GANTI FUNGSI INI SECARA KESELURUHAN]
function filterAndRenderRekapNilaiAdminTable() {
    const kurikulumFilter = document.getElementById('filterKurikulum').value;
    const kecamatanFilter = document.getElementById('filterKecamatan').value;
    const sekolahFilter = document.getElementById('filterSekolah').value;
    const downloadBtn = document.getElementById('downloadRekapPdfBtn');

    // Filter data siswa berdasarkan pilihan
    let filteredSiswa = database.siswa;
    
    if (kecamatanFilter) {
        // Filter berdasarkan kecamatan (s[3] adalah kolom kecamatan di data siswa)
        filteredSiswa = filteredSiswa.filter(s => s[3] === kecamatanFilter);
    }
    
    if (sekolahFilter) {
        // [PERBAIKAN DI SINI]
        // Menggunakan s[0] (kode sekolah siswa) untuk dicocokkan dengan nilai filter (kode sekolah).
        // Sebelumnya: s[2] (nama sekolah siswa), ini yang salah.
        filteredSiswa = filteredSiswa.filter(s => s[0] === sekolahFilter);
    }
    
    if (kurikulumFilter) {
        // Asumsi kolom ke-12 adalah kurikulum, sesuaikan jika berbeda
        filteredSiswa = filteredSiswa.filter(s => s[12] === kurikulumFilter);
    }

    // Simpan data yang sudah difilter untuk digunakan nanti
    rekapNilaiAdminState.filteredSiswa = filteredSiswa;

    // Menonaktifkan tombol download jika tidak ada data
    downloadBtn.disabled = filteredSiswa.length === 0;

    // Panggil fungsi untuk merender tabel dan paginasi
    renderAdminRekapTable(); 
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
// GANTI SELURUH FUNGSI LAMA DENGAN VERSI BARU DAN LENGKAP INI
function renderAdminRekapTable() {
    const thead = document.getElementById('rekapNilaiAdminThead');
    const tbody = document.getElementById('rekapNilaiAdminTableBody');
    const kurikulumFilter = document.getElementById('filterKurikulum').value;
    const siswaData = rekapNilaiAdminState.filteredSiswa;

    // --- Logika Paginasi ---
    const pageState = paginationState.rekapNilaiAdmin;
    const rowsPerPage = pageState.rowsPerPage === 'all' ? siswaData.length : parseInt(pageState.rowsPerPage);
    const totalPages = Math.ceil(siswaData.length / rowsPerPage) || 1;
    pageState.currentPage = Math.min(pageState.currentPage, totalPages);
    const start = (pageState.currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = siswaData.slice(start, end);

    // Kosongkan tabel
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Tampilkan pesan jika tidak ada data
    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 20px;">Tidak ada data yang cocok dengan filter Anda.</td></tr>`;
        updatePaginationControls('rekapNilaiAdmin', 0);
        return;
    }

    // --- Membuat Header Tabel Dinamis ---
    // Jika tidak ada filter kurikulum, gunakan kurikulum siswa pertama sebagai acuan
    // Asumsi: kolom ke-13 (indeks 12) berisi info kurikulum. Jika tidak ada, default ke Merdeka.
    const kurikulum = kurikulumFilter || paginatedData[0][12] || 'Merdeka';
    const subjectsForKurikulum = subjects[kurikulum];
    const schoolKodeBiasaSiswaPertama = String(paginatedData[0][0]);
    const mulokNames = database.nilai._mulokNames?.[schoolKodeBiasaSiswaPertama] || {};

    let headerHTML = '<th>NO</th><th>NAMA SEKOLAH</th><th>NAMA SISWA</th><th>NISN</th>';
    subjectsForKurikulum.forEach(subjectKey => {
        const headerName = (subjectKey.startsWith('MULOK') && mulokNames[subjectKey]) ? mulokNames[subjectKey] : subjectKey;
        headerHTML += `<th>${headerName}</th>`;
    });
    thead.insertRow().innerHTML = headerHTML;
    
    // --- Mengisi Baris Data dengan Nilai ---
    paginatedData.forEach((siswa, index) => {
        const nisn = siswa[7] || '';
        const row = tbody.insertRow();
        let rowHTML = `
            <td>${start + index + 1}</td>
            <td>${siswa[2] || '-'}</td> 
            <td>${siswa[8] || '-'}</td>
            <td>${nisn}</td>
        `;
        
        // Loop untuk setiap mata pelajaran, hitung rata-ratanya
        subjectsForKurikulum.forEach(subjectKey => {
            const finalGrade = calculateAverageForSubject(nisn, subjectKey);
            const gradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : '-';
            rowHTML += `<td style="text-align: center;">${gradeDisplay}</td>`;
        });
        
        row.innerHTML = rowHTML;
    });

    // Update kontrol paginasi
    updatePaginationControls('rekapNilaiAdmin', siswaData.length);
}

// Fungsi untuk mencetak rekap nilai per sekolah ke PDF
async function downloadRekapNilaiAdminPDF() {
    const school = rekapNilaiAdminState.selectedSchool;
    if (!school) {
        showNotification('Pilih sekolah terlebih dahulu.', 'warning');
        return;
    }

    showLoader();
    const { jsPDF } = window.jspdf;
    const filteredSiswa = rekapNilaiAdminState.filteredSiswa;
    
    try {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        const schoolName = (school[4] || 'SEKOLAH').toUpperCase();
        const kurikulum = filteredSiswa[0]?.kurikulum || 'Merdeka';
        const allSubjects = subjects[kurikulum] || [];
        const mulokNames = database.nilai._mulokNames?.[school[0]] || {};
        
        // Membangun data header dan body untuk autoTable
        const tableHeaders = [{
            "header": "NO", "dataKey": "no"
        }, {
            "header": "NAMA", "dataKey": "nama"
        }, {
            "header": "NISN", "dataKey": "nisn"
        }];
        
        allSubjects.forEach(subjectKey => {
            const headerName = (mulokNames && mulokNames[subjectKey]) || subjectKey;
            tableHeaders.push({ "header": headerName, "dataKey": subjectKey });
        });

        const tableBody = filteredSiswa.map((siswa, index) => {
            const row = {
                "no": index + 1,
                "nama": siswa[8] || '',
                "nisn": siswa[7] || ''
            };
            allSubjects.forEach(subjectKey => {
                const finalGrade = calculateAverageForSubject(siswa[7], subjectKey);
                row[subjectKey] = finalGrade !== null ? finalGrade.toFixed(2) : '-';
            });
            return row;
        });

        // Menambahkan metadata ke PDF
        pdf.setFontSize(16);
        pdf.text("Rekap Nilai Akhir Siswa", 148.5, 20, null, null, 'center');
        pdf.setFontSize(12);
        pdf.text(schoolName, 148.5, 27, null, null, 'center');
        pdf.text(`Kecamatan: ${school[2]}`, 14, 37);
        pdf.text(`NPSN: ${school[3]}`, 14, 43);
        pdf.text(`Kurikulum: ${kurikulum}`, 14, 49);
        
        // Menggambar tabel dengan autoTable
        pdf.autoTable({
            startY: 55,
            head: [tableHeaders.map(h => h.header)],
            body: tableBody.map(row => tableHeaders.map(h => row[h.dataKey])),
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 10 }, // NO
                1: { cellWidth: 50 }, // NAMA
                2: { cellWidth: 30 }, // NISN
                // Sisa kolom akan otomatis menyesuaikan
            }
        });

        const fileName = `RekapNilai_${schoolName.replace(/ /g, '_')}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error("Error creating Rekap Nilai PDF:", error);
        showNotification("Gagal membuat file PDF rekap nilai.", 'error');
    } finally {
        hideLoader();
    }
}

// Fungsi untuk membuat HTML khusus Rekap Nilai
function createRekapNilaiHTML(school, siswaList) {
    const schoolName = (school[4] || 'NAMA SEKOLAH').toUpperCase();
    const kurikulum = siswaList[0]?.kurikulum || 'Merdeka';
    const allSubjects = subjects[kurikulum];
    const mulokNames = database.nilai._mulokNames?.[school[0]] || {};

    let tableHeaders = '<th>NO</th><th>NAMA</th><th>NISN</th>';
    allSubjects.forEach(subjectKey => {
        const headerName = (mulokNames && mulokNames[subjectKey]) || subjectKey;
        tableHeaders += `<th>${headerName}</th>`;
    });

    let tableRows = '';
    siswaList.forEach((siswa, index) => {
        const nisn = siswa[7] || '';
        let rowData = `<td>${index + 1}</td><td>${siswa[8] || ''}</td><td>${nisn}</td>`;
        allSubjects.forEach(subjectKey => {
            const finalGrade = calculateAverageForSubject(nisn, subjectKey);
            const gradeDisplay = finalGrade !== null ? finalGrade.toFixed(2) : '-';
            rowData += `<td>${gradeDisplay}</td>`;
        });
        tableRows += `<tr>${rowData}</tr>`;
    });
    
    return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt;">
            <h1 style="text-align: center; margin-bottom: 5px;">Rekap Nilai Akhir Siswa</h1>
            <h2 style="text-align: center; margin-top: 0;">${schoolName}</h2>
            <p style="margin-top: 20px;"><strong>Kecamatan:</strong> ${school[2]}</p>
            <p><strong>NPSN:</strong> ${school[3]}</p>
            <p><strong>Kurikulum:</strong> ${kurikulum}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

// TAMBAHKAN FUNGSI BARU INI
// GANTI SELURUH FUNGSI getRekapNilaiData DENGAN INI
// GANTI SELURUH FUNGSI getRekapNilaiData DENGAN INI
function getRekapNilaiData() {
    const filterKecamatan = document.getElementById('filterKecamatan').value;
    const filterSekolah = document.getElementById('filterSekolah').value;

    let filteredSiswa = database.siswa;

    // 1. Filter berdasarkan Kecamatan (jika dipilih)
    if (filterKecamatan !== 'Semua Kecamatan') {
        const schoolCodesInKecamatan = new Set(database.sekolah.filter(s => s[2] === filterKecamatan).map(s => s[0]));
        filteredSiswa = filteredSiswa.filter(siswa => schoolCodesInKecamatan.has(siswa[0]));
    }
    
    // 2. Filter berdasarkan Sekolah (jika dipilih)
    if (filterSekolah !== 'Semua Sekolah') {
        filteredSiswa = filteredSiswa.filter(siswa => siswa[0] === filterSekolah);
    }
    
    // Sisa logika untuk menghitung rata-rata tetap sama
    const rekapData = filteredSiswa.map(siswa => {
        const nisn = siswa[7];
        const namaSiswa = siswa[8];
        const namaSekolah = (database.sekolah.find(s => s[0] === siswa[0]) || [])[4] || 'N/A';
        let totalNilai = 0;
        let jumlahMapel = 0;
        const subjectsToCalculate = transcriptSubjects[currentUser.kurikulum || 'Merdeka'];
        subjectsToCalculate.forEach(subject => {
            const avg = calculateAverageForSubject(nisn, subject.key);
            if (avg !== null) {
                totalNilai += avg;
                jumlahMapel++;
            }
        });
        const rataRataAkhir = jumlahMapel > 0 ? (totalNilai / jumlahMapel).toFixed(2) : 'N/A';
        return [nisn, namaSiswa, namaSekolah, rataRataAkhir];
    });
    return rekapData;
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// TAMBAHKAN FUNGSI BARU INI
// GANTI SELURUH FUNGSI populateKecamatanFilter DENGAN INI
function populateKecamatanFilter() {
    const filterKecamatan = document.getElementById('filterKecamatan');
    if (!filterKecamatan) return;

    const kecamatanSet = new Set(database.sekolah.map(s => s[2]));
    const kecamatanList = ['Semua Kecamatan', ...kecamatanSet];

    filterKecamatan.innerHTML = '';
    kecamatanList.forEach(kecamatan => {
        const option = document.createElement('option');
        option.value = kecamatan;
        option.textContent = kecamatan;
        filterKecamatan.appendChild(option);
    });
    
    // Panggil fungsi filter sekolah setelah kecamatan diisi
    populateSekolahFilter();
}


// TAMBAHKAN FUNGSI BARU INI
function populateSekolahFilter() {
    const filterKecamatan = document.getElementById('filterKecamatan').value;
    const filterSekolah = document.getElementById('filterSekolah');
    if (!filterSekolah) return;

    filterSekolah.innerHTML = ''; // Kosongkan pilihan lama

    // Tambahkan opsi default
    const defaultOption = document.createElement('option');
    defaultOption.value = 'Semua Sekolah';
    defaultOption.textContent = 'Semua Sekolah';
    filterSekolah.appendChild(defaultOption);

    if (filterKecamatan !== 'Semua Kecamatan') {
        const sekolahDiKecamatan = database.sekolah.filter(s => s[2] === filterKecamatan);
        sekolahDiKecamatan.forEach(sekolah => {
            const option = document.createElement('option');
            option.value = sekolah[0]; // Gunakan Kode Sekolah (NPSN/Kode Biasa) sebagai value
            option.textContent = sekolah[4]; // Tampilkan Nama Sekolah
            filterSekolah.appendChild(option);
        });
    }
}

function getRekapNilaiLengkapData() {
    const filterKecamatan = document.getElementById('filterKecamatan').value;
    const filterSekolah = document.getElementById('filterSekolah').value;

    let filteredSiswa = database.siswa;

    if (filterKecamatan !== 'Semua Kecamatan') {
        const schoolCodesInKecamatan = new Set(database.sekolah.filter(s => s[2] === filterKecamatan).map(s => s[0]));
        filteredSiswa = filteredSiswa.filter(siswa => schoolCodesInKecamatan.has(siswa[0]));
    }
    
    if (filterSekolah !== 'Semua Sekolah') {
        filteredSiswa = filteredSiswa.filter(siswa => siswa[0] === filterSekolah);
    }

    const rekapData = filteredSiswa.map(siswa => {
        const nisn = siswa[7];
        const namaSiswa = siswa[8];
        const namaSekolah = (database.sekolah.find(s => s[0] === siswa[0]) || [])[4] || 'N/A';
        
        let nilaiMapel = {};
        let totalNilai = 0;
        let jumlahMapel = 0;
        
        const subjectsToCalculate = transcriptSubjects[currentUser.kurikulum || 'Merdeka'];
        subjectsToCalculate.forEach(subject => {
            const avg = calculateAverageForSubject(nisn, subject.key);
            nilaiMapel[subject.key] = avg !== null ? avg.toFixed(2) : '-';
            if (avg !== null) {
                totalNilai += avg;
                jumlahMapel++;
            }
        });

        const rataRataAkhir = jumlahMapel > 0 ? (totalNilai / jumlahMapel).toFixed(2) : '0';
        
        return {
            no: 0, // Placeholder untuk nomor urut
            nisn: nisn,
            namaSiswa: namaSiswa,
            namaSekolah: namaSekolah,
            nilaiMapel: nilaiMapel,
            rataRata: parseFloat(rataRataAkhir)
        };
    });
    return rekapData;
}


// TAMBAHKAN FUNGSI BARU INI
function setupSettingTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Hapus kelas 'active' dari semua tombol dan panel
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Tambahkan kelas 'active' ke tombol yang diklik dan panel targetnya
            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });
}

// Tambahkan dua fungsi baru ini
function openSekolahModal(mode, data = null) {
    const modal = document.getElementById('sekolahModal');
    const form = document.getElementById('sekolahForm');
    form.reset(); // Bersihkan form setiap kali dibuka

    document.getElementById('sekolahModalMode').value = mode;

    if (mode === 'edit') {
        document.getElementById('sekolahModalTitle').textContent = 'Edit Data Sekolah';
        document.getElementById('originalKodeBiasa').value = data[0];
        document.getElementById('kodeBiasa').value = data[0];
        document.getElementById('kodePro').value = data[1];
        document.getElementById('kecamatan').value = data[2];
        document.getElementById('npsn').value = data[3];
        document.getElementById('namaSekolah').value = data[4];
        document.getElementById('namaSekolahSingkat').value = data[5];
    } else { // mode 'add'
        document.getElementById('sekolahModalTitle').textContent = 'Tambah Sekolah Baru';
    }

    modal.style.display = 'block';
}

function closeSekolahModal() {
    const modal = document.getElementById('sekolahModal');
    modal.style.display = 'none';
}


// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
async function handleSekolahFormSubmit(event) {
    event.preventDefault();
    showLoader();

    try {
        const mode = document.getElementById('sekolahModalMode').value;
        const originalKodeBiasa = document.getElementById('originalKodeBiasa').value;

        // Kumpulkan data dalam bentuk array, sesuai yang diharapkan backend
        const sekolahData = [
            document.getElementById('kodeBiasa').value,
            document.getElementById('kodePro').value,
            document.getElementById('kecamatan').value,
            document.getElementById('npsn').value,
            document.getElementById('namaSekolah').value,
            document.getElementById('namaSekolahSingkat').value,
        ];

        // Body request yang akan dikirim
        const requestBody = {
            mode: mode,
            sekolahData: sekolahData,
            originalKodeBiasa: originalKodeBiasa
        };

        // Kirim ke satu endpoint yang benar: /sekolah/save
        const result = await fetchWithAuth('http://localhost:3000/api/data/sekolah/save', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (!result.success) throw new Error(result.message);

        closeSekolahModal();
        showNotification(result.message, 'success');
        await fetchDataFromServer(); // Ambil data terbaru dari server

    } catch (error) {
        showNotification(error.message || 'Gagal menyimpan data.', 'error');
    } finally {
        hideLoader();
    }
}



async function handleDeleteSekolah(kodeBiasa) {
    if (confirm(`Yakin ingin menghapus sekolah dengan kode ${kodeBiasa}? Semua data siswa dan nilai terkait akan ikut terhapus permanen.`)) {
        showLoader();
        try {
            // Pastikan memanggil fetchWithAuth, bukan fetch biasa
           const result = await fetchWithAuth('http://localhost:3000/api/data/sekolah/delete', {
  method: 'POST',
  body: JSON.stringify({ kodeBiasa })
});


            if (!result.success) throw new Error(result.message);

            showNotification(result.message, 'success');
            await fetchDataFromServer(); // Ambil data terbaru

        } catch (error) {
            showNotification(error.message || 'Gagal menghapus data.', 'error');
        } finally {
            hideLoader();
        }
    }
}

// === FINAL: Ganti SELURUH fungsi handleFile Anda dengan ini ===
// === FINAL: Ganti SELURUH fungsi handleFile Anda dengan ini ===
async function handleFile(event, tableId) {
  try {
    if (typeof showLoader === 'function') showLoader();

    const file = event.target?.files?.[0];
    if (!file) {
      if (typeof showNotification === 'function') showNotification('Tidak ada file yang dipilih.', 'warning');
      return;
    }

    // Baca SEMUA sheet lalu gabungkan barisnya
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const allRows = [];
    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      let rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) || [];
      if (!rows.length) continue;
      rows.shift(); // buang header
      rows = rows.filter(r => Array.isArray(r) && r.some(c => String(c ?? '').trim() !== ''));
      if (rows.length) allRows.push(...rows);
    }

    if (!allRows.length) {
      if (typeof showNotification === 'function') showNotification('Tidak ada baris data valid pada file.', 'warning');
      return;
    }

    // Kirim ke backend
    const result = await fetchWithAuth(`http://localhost:3000/api/data/import/${tableId}`, {
      method: 'POST',
      body: JSON.stringify(allRows)
    });
    if (!result?.success) throw new Error(result?.message || 'Import gagal pada server.');

    // --- PERTAHANKAN pilihan rows-per-page yang sedang aktif (default 10) ---
    let preservedRowsPerPage = 10;
    // coba ambil dari UI select yang sekarang
    const rowsSelect =
      document.querySelector(`.pagination-controls[data-table-id="${tableId}"] .rows-per-page`) ||
      document.querySelector(`#${tableId} .pagination-controls .rows-per-page`);
    if (rowsSelect && rowsSelect.value) {
      preservedRowsPerPage = rowsSelect.value; // "10" | "30" | "50" | "all"
    } else if (typeof paginationState === 'object' && paginationState?.[tableId]?.rowsPerPage) {
      // fallback ke state lama jika select belum ada/baru
      preservedRowsPerPage = paginationState[tableId].rowsPerPage;
    }

    // Ambil ulang data dari server agar state FE sinkron
    const ok = await fetchDataFromServer();
    if (!ok) throw new Error('Gagal memuat ulang data dari server setelah import.');

    // Reset search hanya untuk tabel terkait (biar hasil import terlihat)
    const searchEl =
      document.getElementById(`search${tableId.charAt(0).toUpperCase()}${tableId.slice(1)}`) ||
      document.querySelector(`.search-bar[data-table-id="${tableId}"]`);
    if (searchEl) searchEl.value = '';
    if (typeof searchState === 'object' && Object.prototype.hasOwnProperty.call(searchState, tableId)) {
      searchState[tableId] = '';
    }

    // Terapkan kembali pagination yang dipertahankan (TIDAK lagi dipaksa 'all')
    if (typeof paginationState === 'object') {
      if (!paginationState[tableId]) paginationState[tableId] = { currentPage: 1, rowsPerPage: 10 };
      paginationState[tableId].currentPage = 1;
      paginationState[tableId].rowsPerPage = preservedRowsPerPage;
    }

    // Render ulang tabel yang relevan
    if (typeof renderAdminTable === 'function') {
      renderAdminTable(tableId); // 'sekolah' | 'siswa'
    } else if (typeof rerenderActiveTable === 'function') {
      rerenderActiveTable(tableId);
    }

    if (typeof showNotification === 'function') {
      const info = result?.message || `${allRows.length} baris diimpor.`;
      showNotification(`Import ${tableId} berhasil: ${info}`, 'success');
    }

    // Reset input file agar bisa pilih file sama lagi
    event.target.value = '';
  } catch (err) {
    console.error('Import error:', err);
    if (typeof showNotification === 'function') {
      showNotification(err.message || 'Terjadi kesalahan saat import.', 'error');
    }
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
}




async function handleDeleteAllDataClick(event) {
  const getTableId = () => {
    // Ambil tableId dari tombol (data-table-id="sekolah" | "siswa")
    const src = event?.currentTarget || event?.target;
    return src?.dataset?.tableId || 'sekolah';
  };

  const tableId = getTableId();

  // Pesan peringatan sesuai konteks
  const warningMessage =
    tableId === 'sekolah'
      ? [
          'Anda akan MENGHAPUS SEMUA DATA SEKOLAH.',
          'Karena relasi database (FOREIGN KEY + CASCADE), SEMUA SISWA, NILAI, dan FOTO TERKAIT juga akan ikut terhapus.',
          '',
          'Tindakan ini tidak dapat dibatalkan.',
          'Ketik HAPUS untuk konfirmasi kemudian tekan OK.'
        ].join('\n')
      : [
          'Perhatian:',
          'Saat ini penghapusan massal berjalan di level basis data.',
          'Menjalankan "hapus semua" akan mengosongkan tabel-tabel terkait (termasuk siswa & nilai).',
          '',
          'Tindakan ini tidak dapat dibatalkan.',
          'Ketik HAPUS untuk konfirmasi kemudian tekan OK.'
        ].join('\n');

  const confirmText = prompt(warningMessage, '');
  if (confirmText !== 'HAPUS') {
    if (typeof showNotification === 'function') showNotification('Dibatalkan.', 'warning');
    return;
  }

  try {
    if (typeof showLoader === 'function') showLoader();

    // Panggil endpoint global wipe (hapus semua tabel terkait)
    const result = await fetchWithAuth('http://localhost:3000/api/data/delete-all', {
      method: 'POST'
    });

    if (!result?.success) {
      throw new Error(result?.message || 'Gagal menghapus data.');
    }

    // Muat ulang database dari server agar state FE fresh
    const ok = await fetchDataFromServer();
    if (!ok) throw new Error('Gagal memuat ulang data setelah penghapusan.');

    // === RESET UI untuk kedua tabel admin (sekolah & siswa) ===
    const idsToReset = ['sekolah', 'siswa'];

    idsToReset.forEach((id) => {
      // Bersihkan search bar jika ada
      const searchEl =
        document.getElementById(`search${id.charAt(0).toUpperCase()}${id.slice(1)}`) ||
        document.querySelector(`.search-bar[data-table-id="${id}"]`);
      if (searchEl) searchEl.value = '';

      // Reset state pencarian
      if (typeof searchState === 'object' && Object.prototype.hasOwnProperty.call(searchState, id)) {
        searchState[id] = '';
      }

      // Reset pagination (ke halaman 1, dan tampilkan 'all' agar terlihat kosong jelas)
      if (typeof paginationState === 'object') {
        if (!paginationState[id]) paginationState[id] = { currentPage: 1, rowsPerPage: 10 };
        paginationState[id].currentPage = 1;
        paginationState[id].rowsPerPage = 'all';
      }
    });

    // Render ulang tabel admin jika fungsinya tersedia
    if (typeof renderAdminTable === 'function') {
      idsToReset.forEach((id) => renderAdminTable(id));
    } else if (typeof rerenderActiveTable === 'function') {
      idsToReset.forEach((id) => rerenderActiveTable(id));
    }

    if (typeof showNotification === 'function') {
      showNotification('Seluruh data berhasil dihapus.', 'success');
    }
  } catch (err) {
    console.error('Delete-all error:', err);
    if (typeof showNotification === 'function') {
      showNotification(err.message || 'Terjadi kesalahan saat menghapus data.', 'error');
    }
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
    // (opsional) blur tombol agar efek fokus hilang
    try { (event?.currentTarget || event?.target)?.blur?.(); } catch {}
  }
}
// === FINAL: Pasang event handler tombol hapus (Admin) ===
function bindAdminDeleteAllButtons() {
  // Tombol "Hapus Semua Data" di section Database Sekolah
  const btnDelSekolah = document.querySelector('#sekolah .btn.btn-delete[data-table-id="sekolah"]');
  if (btnDelSekolah) {
    btnDelSekolah.removeEventListener('click', handleDeleteAllSekolahClick);
    btnDelSekolah.addEventListener('click', handleDeleteAllSekolahClick);
  }

  // Tombol "Hapus Semua Data" di section Database Siswa
  const btnDelSiswa = document.querySelector('#siswa .btn.btn-delete[data-table-id="siswa"]');
  if (btnDelSiswa) {
    btnDelSiswa.removeEventListener('click', handleDeleteAllSiswaClick);
    btnDelSiswa.addEventListener('click', handleDeleteAllSiswaClick);
  }
}

// panggil setelah DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindAdminDeleteAllButtons);
} else {
  bindAdminDeleteAllButtons();
}
// === FINAL: Hapus semua SEKOLAH (FE) ===
async function handleDeleteAllSekolahClick(event) {
  const confirmText = prompt(
    [
      'Anda akan MENGHAPUS SEMUA DATA SEKOLAH.',
      'Karena relasi database (FOREIGN KEY + CASCADE), SEMUA SISWA, NILAI, dan FOTO TERKAIT juga akan ikut terhapus.',
      '',
      'Tindakan ini tidak dapat dibatalkan.',
      "Ketik: HAPUS SEKOLAH"
    ].join('\n'),
    ''
  );
  if (confirmText !== 'HAPUS SEKOLAH') {
    if (typeof showNotification === 'function') showNotification('Dibatalkan.', 'warning');
    return;
  }

  try {
    if (typeof showLoader === 'function') showLoader();

    // Endpoint khusus truncate sekolah
    const result = await fetchWithAuth('http://localhost:3000/api/data/truncate/sekolah', {
      method: 'POST'
    });

    if (!result?.success) throw new Error(result?.message || 'Gagal menghapus data sekolah.');

    // Sinkronisasi ulang state FE dengan DB
    const ok = await fetchDataFromServer();
    if (!ok) throw new Error('Gagal memuat ulang data setelah penghapusan.');

    // Reset UI untuk tabel sekolah & siswa (keduanya jadi kosong)
    ['sekolah', 'siswa'].forEach((id) => {
      const searchEl =
        document.getElementById(`search${id.charAt(0).toUpperCase()}${id.slice(1)}`) ||
        document.querySelector(`.search-bar[data-table-id="${id}"]`);
      if (searchEl) searchEl.value = '';
      if (typeof searchState === 'object' && Object.prototype.hasOwnProperty.call(searchState, id)) {
        searchState[id] = '';
      }
      if (typeof paginationState === 'object') {
        if (!paginationState[id]) paginationState[id] = { currentPage: 1, rowsPerPage: 10 };
        paginationState[id].currentPage = 1;
        paginationState[id].rowsPerPage = 'all';
      }
    });

    // Render ulang tabel admin
    if (typeof renderAdminTable === 'function') {
      renderAdminTable('sekolah');
      renderAdminTable('siswa');
    } else if (typeof rerenderActiveTable === 'function') {
      rerenderActiveTable('sekolah');
      rerenderActiveTable('siswa');
    }

    if (typeof showNotification === 'function') showNotification('Semua data sekolah (beserta siswa & nilai) berhasil dihapus.', 'success');
  } catch (err) {
    console.error('Delete-all sekolah error:', err);
    if (typeof showNotification === 'function') showNotification(err.message || 'Terjadi kesalahan saat menghapus sekolah.', 'error');
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
    try { (event?.currentTarget || event?.target)?.blur?.(); } catch {}
  }
}
// === FINAL: Hapus semua SISWA (FE) ===
async function handleDeleteAllSiswaClick(event) {
  const confirmText = prompt(
    [
      'Anda akan MENGHAPUS SEMUA DATA SISWA.',
      'Nilai & Foto terkait juga ikut terhapus. DATA SEKOLAH TETAP ADA.',
      '',
      'Tindakan ini tidak dapat dibatalkan.',
      "Ketik: HAPUS SISWA"
    ].join('\n'),
    ''
  );
  if (confirmText !== 'HAPUS SISWA') {
    if (typeof showNotification === 'function') showNotification('Dibatalkan.', 'warning');
    return;
  }

  try {
    if (typeof showLoader === 'function') showLoader();

    // Endpoint khusus truncate siswa
    const result = await fetchWithAuth('http://localhost:3000/api/data/truncate/siswa', {
      method: 'POST'
    });

    if (!result?.success) throw new Error(result?.message || 'Gagal menghapus data siswa.');

    // Sinkronisasi ulang state FE dengan DB
    const ok = await fetchDataFromServer();
    if (!ok) throw new Error('Gagal memuat ulang data setelah penghapusan.');

    // Reset UI untuk tabel siswa (sekolah dibiarkan)
    const id = 'siswa';
    const searchEl =
      document.getElementById(`search${id.charAt(0).toUpperCase()}${id.slice(1)}`) ||
      document.querySelector(`.search-bar[data-table-id="${id}"]`);
    if (searchEl) searchEl.value = '';
    if (typeof searchState === 'object' && Object.prototype.hasOwnProperty.call(searchState, id)) {
      searchState[id] = '';
    }
    if (typeof paginationState === 'object') {
      if (!paginationState[id]) paginationState[id] = { currentPage: 1, rowsPerPage: 10 };
      paginationState[id].currentPage = 1;
      paginationState[id].rowsPerPage = 'all';
    }

    // Render ulang tabel siswa (dan sekolah untuk kepastian state)
    if (typeof renderAdminTable === 'function') {
      renderAdminTable('siswa');
      renderAdminTable('sekolah');
    } else if (typeof rerenderActiveTable === 'function') {
      rerenderActiveTable('siswa');
      rerenderActiveTable('sekolah');
    }

    if (typeof showNotification === 'function') showNotification('Semua data siswa (beserta nilai & foto) berhasil dihapus. Data sekolah tetap ada.', 'success');
  } catch (err) {
    console.error('Delete-all siswa error:', err);
    if (typeof showNotification === 'function') showNotification(err.message || 'Terjadi kesalahan saat menghapus siswa.', 'error');
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
    try { (event?.currentTarget || event?.target)?.blur?.(); } catch {}
  }
}
// ====== INIT LOGIN UI (ringan, tidak mengubah handleLogin) ======
(function initLoginUI() {
  // autofocus ke appCode
  const code = document.getElementById('appCode');
  if (code) code.focus();

  // tombol "Tempel" ambil dari clipboard
  const pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn && navigator.clipboard) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && code) code.value = text.trim();
      } catch { /* no-op */ }
    });
  }

  // tombol Batal: bersihkan input & reset radio
  const cancel = document.getElementById('cancelBtn');
  if (cancel) {
    cancel.addEventListener('click', () => {
      const form = document.getElementById('loginForm');
      if (form) form.reset();
      if (code) { code.value = ''; code.focus(); }
      // defaultkan ke Merdeka
      const r1 = document.getElementById('kurikulumMerdeka');
      if (r1) r1.checked = true;
    });
  }

  // enter tekan di input => submit form (fallback)
  if (code) {
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const form = document.getElementById('loginForm');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    });
  }
})();

// Paksa re-render halaman "Isi Nilai" setelah simpan bulk
async function refreshIsiNilaiViewAfterSave() {
  // ambil state semester aktif dari pagination state
  const sem = paginationState?.isiNilai?.currentSemester;
  const semName = paginationState?.isiNilai?.currentSemesterName || '';

  // reset pagination ke halaman pertama kalau ada
  if (paginationState?.isiNilai) {
    paginationState.isiNilai.currentPage = 1;
  }

  // kalau ada fungsi render halaman, panggil itu
  if (typeof window.renderIsiNilaiPage === 'function') {
    window.renderIsiNilaiPage(sem, semName);
  }
  // fallback: kalau ada fungsi render tabel saja
  else if (typeof window.renderIsiNilaiTable === 'function') {
    window.renderIsiNilaiTable(sem);
  }
  // fallback ekstra: kalau app pakai router internal per menu
  else if (typeof window.switchSekolahContent === 'function') {
    try { window.switchSekolahContent('isiNilai'); } catch {}
  }

  // optional: perbarui info paginasi jika ada util-nya
  if (typeof window.updatePaginationInfo === 'function') {
    try { window.updatePaginationInfo('isiNilai'); } catch {}
  }
}

