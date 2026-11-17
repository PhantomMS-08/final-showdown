/**
 * JECRC University Central Library Management System (JU-CLMS)
 * Main Application Logic (v2.0)
 * Admitted Batches: 2022 to 2026 (Pre-2022 Batches Excluded)
 */

// Application State
const AppState = {
  students: [],
  selectedStudent: null,
  activeTab: "student-tab",
  timerInterval: null,
  barcodeBuffer: "",
  barcodeLastKeyTime: 0,
  cameraInitialized: false
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  loadDatabase();
  initClock();
  initEventListeners();
  initBarcodeGunListener();
  renderDemoShelf();
  renderDashboard();

  // Initialize Real Camera Barcode Reader
  try {
    await RealCameraScanner.init("scanner-video", (scannedCode) => {
      onRealCameraBarcodeDetected(scannedCode);
    });
  } catch (err) {
    console.warn("Camera scanner init notice:", err);
  }

  // Load first student as default demo selection (26BCON1241)
  if (AppState.students.length > 0) {
    selectStudentByRollNo(AppState.students[0].rollNo, false);
  }

  // Start live tick interval for real-time timers
  AppState.timerInterval = setInterval(() => {
    updateLiveTimers();
  }, 1000);
});

// Database Management with LocalStorage persistence (v2 schema)
function loadDatabase() {
  const saved = localStorage.getItem("jecrc_clms_students_v2");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Filter out any students before 2022 just in case
      AppState.students = parsed.filter(s => {
        const info = RollNumberParser.parse(s.rollNo);
        return !info || info.isEligible !== false;
      });
      return;
    } catch (e) {
      console.error("Error reading saved database, restoring defaults:", e);
    }
  }
  AppState.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
  saveDatabase();
}

function saveDatabase() {
  localStorage.setItem("jecrc_clms_students_v2", JSON.stringify(AppState.students));
}

function resetDatabaseToDefault() {
  if (confirm("Reset library records to fresh JECRC 2022-2026 demo data?")) {
    localStorage.removeItem("jecrc_clms_students_v2");
    localStorage.removeItem("jecrc_clms_students_v1");
    AppState.students = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
    saveDatabase();
    if (AppState.students.length > 0) {
      selectStudentByRollNo(AppState.students[0].rollNo, false);
    }
    renderDashboard();
    renderDemoShelf();
    showToast("Database restored to 2022–2026 student roster!", "success");
  }
}

// Live Header Clock
function initClock() {
  const clockEl = document.getElementById("live-clock-text");
  function updateTime() {
    const now = new Date();
    const options = {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };
    if (clockEl) {
      clockEl.textContent = now.toLocaleDateString("en-IN", options);
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// UI Navigation Tabs
function switchPageTab(tabName) {
  AppState.activeTab = tabName;
  const tabBtns = document.querySelectorAll(".nav-tab-btn");
  const pages = document.querySelectorAll(".page-view");

  tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  pages.forEach(page => {
    if (page.id === tabName) {
      page.classList.add("active-view");
    } else {
      page.classList.remove("active-view");
    }
  });

  if (tabName === "library-tab") {
    renderDashboard();
  }
}

// Event Listeners Initialization
function initEventListeners() {
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchPageTab(btn.dataset.tab);
    });
  });

  const searchInput = document.getElementById("barcode-input");
  const searchBtn = document.getElementById("btn-lookup");

  searchBtn.addEventListener("click", () => {
    handleBarcodeOrRollInput(searchInput.value);
  });

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeOrRollInput(searchInput.value);
    }
  });

  searchInput.addEventListener("input", () => {
    showSearchSuggestions(searchInput.value);
  });

  document.getElementById("btn-open-camera")?.addEventListener("click", toggleCameraScanner);
  document.getElementById("btn-reset-db")?.addEventListener("click", resetDatabaseToDefault);
  document.getElementById("btn-print-slip")?.addEventListener("click", printStudentSlip);
  document.getElementById("btn-export-csv")?.addEventListener("click", exportStudentAttendanceCSV);
  document.getElementById("barcode-file-input")?.addEventListener("change", handleBarcodeFileUpload);

  document.getElementById("camera-select")?.addEventListener("change", (e) => {
    if (RealCameraScanner.isScanning) {
      RealCameraScanner.stop();
      RealCameraScanner.start(e.target.value);
    }
  });

  document.getElementById("dashboard-search")?.addEventListener("input", filterLiveRoster);
  document.getElementById("dashboard-dept-filter")?.addEventListener("change", filterLiveRoster);
  document.getElementById("btn-export-roster")?.addEventListener("click", exportLiveRosterCSV);
}

// Hardware Barcode Scanner Gun Listener
function initBarcodeGunListener() {
  window.addEventListener("keydown", e => {
    const now = Date.now();
    const timeDiff = now - AppState.barcodeLastKeyTime;
    AppState.barcodeLastKeyTime = now;

    if (e.key === "Enter") {
      if (AppState.barcodeBuffer.length >= 3) {
        const scannedCode = AppState.barcodeBuffer.trim();
        AppState.barcodeBuffer = "";
        const searchInput = document.getElementById("barcode-input");
        if (searchInput) searchInput.value = scannedCode;
        handleBarcodeOrRollInput(scannedCode);
        e.preventDefault();
      } else {
        AppState.barcodeBuffer = "";
      }
      return;
    }

    if (e.key.length === 1) {
      if (timeDiff > 80 && AppState.barcodeBuffer.length > 0) {
        AppState.barcodeBuffer = "";
      }
      AppState.barcodeBuffer += e.key;
    }
  });
}

// Real-Time Camera Barcode Detected
function onRealCameraBarcodeDetected(scannedCode) {
  const statusOverlay = document.getElementById("camera-scan-status-overlay");
  if (statusOverlay) {
    statusOverlay.textContent = `✅ BARCODE LOCKED: ${scannedCode}`;
    statusOverlay.style.background = "#059669";
    statusOverlay.style.color = "#ffffff";
    statusOverlay.style.border = "1px solid #34d399";
  }

  const searchInput = document.getElementById("barcode-input");
  if (searchInput) searchInput.value = scannedCode;

  handleBarcodeOrRollInput(scannedCode);

  setTimeout(() => {
    if (statusOverlay && RealCameraScanner.isScanning) {
      statusOverlay.textContent = "Looking for 1D / 2D Barcode...";
      statusOverlay.style.background = "rgba(0,0,0,0.75)";
      statusOverlay.style.border = "1px solid rgba(255,255,255,0.2)";
    }
  }, 2500);
}

// ============================================================================
// ROLL NUMBER PROCESSING WITH STRICT 2022-2026 POLICY
// ============================================================================
function handleBarcodeOrRollInput(inputVal) {
  const query = (inputVal || "").trim().toUpperCase();
  if (!query) {
    showToast("Please enter or scan a student Roll Number / Barcode", "danger");
    return;
  }

  // Parse roll number structure (e.g. 26BCON1241)
  const rollDetails = RollNumberParser.parse(query);

  // If matches JECRC roll format but took admission before 2022
  if (rollDetails && rollDetails.validFormat && !rollDetails.isEligible) {
    AudioEngine.playWarningTone();
    showToast(`⛔ ACCESS RESTRICTED: Admission year ${rollDetails.admissionYear} is before 2022. Ex-students / graduated batches are not permitted.`, "danger");
    return;
  }

  // Look up existing student in active roster
  let student = AppState.students.find(s => s.rollNo.toUpperCase() === query || s.name.toUpperCase().includes(query));

  // If not found in database but follows valid JECRC roll format (>= 2022), auto-register on-the-fly!
  if (!student && rollDetails && rollDetails.validFormat && rollDetails.isEligible) {
    student = {
      rollNo: rollDetails.rollNo,
      name: `Student (${rollDetails.branchCode} #${rollDetails.seqNo})`,
      branch: rollDetails.branch,
      course: rollDetails.course,
      year: rollDetails.academicYear,
      admissionYear: rollDetails.admissionYear,
      batch: rollDetails.batch,
      email: `${rollDetails.seqNo}.${rollDetails.branchCode.toLowerCase()}@jecrc.ac.in`,
      avatar: `https://ui-avatars.com/api/?name=${rollDetails.branchCode}+${rollDetails.seqNo}&background=8b0000&color=fff&size=200`,
      phone: "+91 98290 00000",
      bloodGroup: "O+",
      isInside: false,
      currentEntryTime: null,
      history: []
    };
    AppState.students.push(student);
    saveDatabase();
    renderDashboard();
    renderDemoShelf();
    showToast(`✨ Enrolled New Student: ${rollDetails.rollNo} (${rollDetails.academicYear}, ${rollDetails.course} ${rollDetails.branch})`, "success");
  }

  if (student) {
    AudioEngine.playScanBeep();
    selectStudentByRollNo(student.rollNo, true);
    switchPageTab("student-tab");
    showToast(`🎯 Verified: ${student.name} (${student.rollNo}) - ${student.year}`, "success");
    hideSearchSuggestions();
  } else {
    AudioEngine.playWarningTone();
    showToast(`No active student record found for "${query}" (Batches 2022-2026 only)`, "danger");
  }
}

// Select and Display Student
function selectStudentByRollNo(rollNo, triggerSound = false) {
  const student = AppState.students.find(s => s.rollNo.toUpperCase() === rollNo.toUpperCase());
  if (!student) return;

  AppState.selectedStudent = student;
  renderStudentProfile(student);

  const inputEl = document.getElementById("barcode-input");
  if (inputEl) inputEl.value = student.rollNo;
}

// Render Student Details on Page 1
function renderStudentProfile(student) {
  const container = document.getElementById("student-profile-section");
  if (!container) return;

  const stats = calculateStudentStats(student);

  // Parse roll number details for institutional breakdown
  const rollInfo = RollNumberParser.parse(student.rollNo);

  const barcodeSvgHtml = BarcodeUtil.renderSVG(student.rollNo, {
    width: 2,
    height: 52,
    displayValue: true,
    lineColor: "#8b0000"
  });

  let sessionTimerHtml = "";
  if (student.isInside && student.currentEntryTime) {
    const elapsedMinutes = Math.floor((Date.now() - new Date(student.currentEntryTime).getTime()) / 60000);
    const hrs = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    sessionTimerHtml = `
      <div class="current-session-box">
        <div class="session-timer-label">CURRENT SESSION DWELL TIME</div>
        <div class="session-timer-val" id="single-student-dwell-timer" data-entry="${student.currentEntryTime}">
          ${hrs}h ${mins}m
        </div>
      </div>
    `;
  }

  // Roll Number Architecture Breakdown Badge
  const admissionYearText = rollInfo ? rollInfo.admissionYear : (student.admissionYear || "2026");
  const academicYearText = rollInfo ? rollInfo.academicYear : student.year;
  const branchNameText = rollInfo ? rollInfo.branch : student.branch;

  container.innerHTML = `
    <!-- Roll Number Decoded Metadata Banner -->
    <div style="background: linear-gradient(90deg, #fffdf5 0%, #ffffff 100%); border: 1.5px solid var(--jecrc-gold-primary); border-radius: var(--radius-md); padding: 12px 18px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.4rem;">🎓</span>
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--jecrc-gold-dark); text-transform: uppercase; letter-spacing: 0.5px;">
            ROLL NUMBER DECODED STRUCTURE (${student.rollNo})
          </div>
          <div style="font-size: 0.92rem; font-weight: 700; color: var(--jecrc-red-dark);">
            Admission Year: <span style="color: var(--jecrc-red-primary);">${admissionYearText}</span> • 
            Branch: <span style="color: var(--text-primary);">${branchNameText}</span> • 
            Calculated Status: <span style="background: var(--jecrc-gold-light); color: var(--jecrc-red-dark); padding: 2px 8px; border-radius: 4px; font-weight: 800;">${academicYearText}</span>
          </div>
        </div>
      </div>
      <div style="font-size: 0.76rem; color: #065f46; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px;">
        ✓ Eligible Active Student (Batch ${student.batch || '2026 - 2030'})
      </div>
    </div>

    <!-- JECRC University Student ID Badge Card -->
    <div class="student-id-card">
      <div class="id-card-banner">
        <div class="univ-name">JECRC UNIVERSITY • CENTRAL LIBRARY GATEWAY</div>
        <div class="id-type">SMART STUDENT CARD IDENTIFICATION</div>
      </div>

      <div class="id-card-content">
        <!-- Photo & Live Barcode -->
        <div class="id-photo-col">
          <div class="id-avatar-frame">
            <img src="${student.avatar}" alt="${student.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=8b0000&color=fff&size=200'" />
          </div>
          <div class="id-card-barcode-box">
            ${barcodeSvgHtml}
          </div>
        </div>

        <!-- Student Details -->
        <div class="id-details-col">
          <div class="student-name-row">
            <h2>${student.name}</h2>
            <span class="status-indicator-tag ${student.isInside ? 'inside' : 'outside'}">
              <span class="pulse-dot" style="${student.isInside ? '' : 'background:#64748b;box-shadow:none;animation:none;'}"></span>
              ${student.isInside ? 'INSIDE LIBRARY' : 'OUTSIDE LIBRARY'}
            </span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="label">Roll Number</div>
              <div class="val" style="font-family: monospace; color: var(--jecrc-red-primary);">${student.rollNo}</div>
            </div>
            <div class="info-item">
              <div class="label">Course & Program</div>
              <div class="val">${student.course}</div>
            </div>
            <div class="info-item">
              <div class="label">Department / Branch</div>
              <div class="val">${student.branch}</div>
            </div>
            <div class="info-item">
              <div class="label">Current Academic Year</div>
              <div class="val" style="color: var(--jecrc-red-primary); font-weight: 800;">${academicYearText}</div>
            </div>
            <div class="info-item">
              <div class="label">Admission Year & Batch</div>
              <div class="val">${admissionYearText} (Batch ${student.batch || '2026-30'})</div>
            </div>
            <div class="info-item">
              <div class="label">University Email</div>
              <div class="val" style="font-size: 0.82rem; word-break: break-all;">${student.email}</div>
            </div>
          </div>
        </div>

        <!-- Gate Action: Entry or Exit Scan -->
        <div class="id-actions-col">
          <div class="gate-control-heading">LIBRARY GATE ACTION</div>

          ${student.isInside ? `
            <button class="btn-gate-toggle btn-exit" onclick="toggleStudentLibraryGate('${student.rollNo}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              CHECK-OUT / EXIT
            </button>
          ` : `
            <button class="btn-gate-toggle btn-entry" onclick="toggleStudentLibraryGate('${student.rollNo}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              CHECK-IN / ENTER
            </button>
          `}

          ${sessionTimerHtml}

          <div style="font-size: 0.74rem; color: var(--text-secondary); text-align: center;">
            Supports USB barcode gun, camera scanner, & manual verification.
          </div>
        </div>
      </div>
    </div>

    <!-- Student Attendance & Time Statistics Cards -->
    <div class="student-stats-row">
      <div class="stat-tile">
        <div class="stat-tile-icon tile-icon-gold">📅</div>
        <div class="stat-tile-info">
          <div class="stat-number">${stats.totalDays} Days</div>
          <div class="stat-desc">Total Days Visited</div>
        </div>
      </div>

      <div class="stat-tile">
        <div class="stat-tile-icon tile-icon-red">⏱️</div>
        <div class="stat-tile-info">
          <div class="stat-number">${stats.totalHours.toFixed(1)} hrs</div>
          <div class="stat-desc">Total Library Hours</div>
        </div>
      </div>

      <div class="stat-tile">
        <div class="stat-tile-info">
          <div class="stat-number">${stats.avgHoursPerVisit} hrs</div>
          <div class="stat-desc">Avg Duration / Visit</div>
        </div>
        <div class="stat-tile-icon tile-icon-green">⏳</div>
      </div>

      <div class="stat-tile">
        <div class="stat-tile-icon tile-icon-blue">🏆</div>
        <div class="stat-tile-info">
          <div class="stat-number">${stats.tierTitle}</div>
          <div class="stat-desc">${stats.frequencyText}</div>
        </div>
      </div>
    </div>

    <!-- Attendance History Log Table -->
    <div class="j-card j-card-gold-border">
      <div class="card-header-flex">
        <div class="card-title-group">
          <div class="card-title-icon">📜</div>
          <h3>Individual Attendance & Visit History Log</h3>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary-tool" onclick="exportStudentAttendanceCSV()">
            📥 Download Log (.CSV)
          </button>
          <button class="btn-secondary-tool" onclick="printStudentSlip()">
            🖨️ Print Gate Slip
          </button>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Duration Spent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderStudentHistoryRows(student.history, student.isInside)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Calculate individual statistics: Days, Hours, Average duration
function calculateStudentStats(student) {
  const history = student.history || [];
  const uniqueDates = new Set();
  let totalMinutes = 0;
  let completedSessions = 0;

  history.forEach(item => {
    if (item.date) uniqueDates.add(item.date);
    if (item.durationMinutes) {
      totalMinutes += item.durationMinutes;
      completedSessions++;
    } else if (item.status === "Active" && student.currentEntryTime) {
      const elapsed = Math.floor((Date.now() - new Date(student.currentEntryTime).getTime()) / 60000);
      totalMinutes += Math.max(0, elapsed);
    }
  });

  const totalDays = uniqueDates.size;
  const totalHours = totalMinutes / 60;
  const avgHoursPerVisit = completedSessions > 0 ? (totalMinutes / completedSessions / 60).toFixed(1) : (totalHours).toFixed(1);

  let tierTitle = "Explorer";
  let frequencyText = "Occasional Reader";
  if (totalHours > 30) {
    tierTitle = "Gold Scholar";
    frequencyText = "Top 5% Avid Reader";
  } else if (totalHours > 15) {
    tierTitle = "Silver Scholar";
    frequencyText = "Consistent Visitor";
  } else if (totalHours > 5) {
    tierTitle = "Bronze Scholar";
    frequencyText = "Regular Reader";
  }

  return {
    totalDays,
    totalHours,
    avgHoursPerVisit,
    tierTitle,
    frequencyText
  };
}

// Render Individual Attendance History Rows
function renderStudentHistoryRows(history, isCurrentlyInside) {
  if (!history || history.length === 0) {
    return `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No past library records found for this student.</td></tr>`;
  }

  return history
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(item => {
      const isLive = item.status === "Active";
      let durationDisplay = "--";

      if (isLive) {
        durationDisplay = `<span style="color: var(--success); font-weight: 700;">🟢 In Progress</span>`;
      } else if (item.durationMinutes) {
        const hrs = Math.floor(item.durationMinutes / 60);
        const mins = item.durationMinutes % 60;
        durationDisplay = `${hrs > 0 ? hrs + "h " : ""}${mins}m`;
      }

      return `
        <tr>
          <td style="font-weight: 600;">${item.date}</td>
          <td><strong style="color: #065f46;">${item.entryTime || "--"}</strong></td>
          <td><strong style="color: var(--jecrc-red-primary);">${item.exitTime || "--"}</strong></td>
          <td>${durationDisplay}</td>
          <td>
            <span class="status-badge ${isLive ? 'badge-active' : 'badge-completed'}">
              ${isLive ? 'Active in Library' : 'Completed'}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Student Check-In & Check-Out Toggle Action
function toggleStudentLibraryGate(rollNo) {
  const student = AppState.students.find(s => s.rollNo.toUpperCase() === rollNo.toUpperCase());
  if (!student) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toISOString().split("T")[0];

  if (!student.isInside) {
    student.isInside = true;
    student.currentEntryTime = now.toISOString();

    student.history.unshift({
      date: dateStr,
      entryTime: timeStr,
      exitTime: null,
      durationMinutes: null,
      status: "Active"
    });

    AudioEngine.playSuccessChime();
    showToast(`✅ ${student.name} checked IN at ${timeStr}`, "success");
  } else {
    student.isInside = false;

    let durationMins = 45;
    if (student.currentEntryTime) {
      durationMins = Math.max(1, Math.round((now.getTime() - new Date(student.currentEntryTime).getTime()) / 60000));
    }

    const activeRecord = student.history.find(h => h.status === "Active");
    if (activeRecord) {
      activeRecord.exitTime = timeStr;
      activeRecord.durationMinutes = durationMins;
      activeRecord.status = "Completed";
    } else {
      student.history.unshift({
        date: dateStr,
        entryTime: "12:00",
        exitTime: timeStr,
        durationMinutes: durationMins,
        status: "Completed"
      });
    }

    student.currentEntryTime = null;
    AudioEngine.playSuccessChime();
    showToast(`🚪 ${student.name} checked OUT. Session duration: ${Math.floor(durationMins / 60)}h ${durationMins % 60}m`, "danger");
  }

  saveDatabase();
  renderStudentProfile(student);
  renderDashboard();
  renderDemoShelf();
}

// Camera Toggle Controls
async function toggleCameraScanner() {
  const box = document.getElementById("camera-scanner-wrapper");
  const btn = document.getElementById("btn-open-camera");
  if (!box) return;

  if (RealCameraScanner.isScanning) {
    RealCameraScanner.stop();
    box.classList.remove("active");
    if (btn) btn.innerHTML = "📷 Start Live Camera Barcode Scanner";
    showToast("Camera scanner turned off", "danger");
  } else {
    box.classList.add("active");
    if (btn) btn.innerHTML = "🛑 Stop Camera Scanner";

    try {
      await populateCameraDevices();
      const select = document.getElementById("camera-select");
      const deviceId = select ? select.value : null;
      await RealCameraScanner.start(deviceId);
      showToast("Camera active: Position barcode inside reticle", "success");
    } catch (err) {
      console.warn("Camera start issue:", err);
      showToast("Camera permission denied or camera not found.", "danger");
    }
  }
}

async function populateCameraDevices() {
  const select = document.getElementById("camera-select");
  if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");

    if (videoDevices.length > 0) {
      select.innerHTML = videoDevices
        .map((d, idx) => `<option value="${d.deviceId}">${d.label || `Camera ${idx + 1}`}</option>`)
        .join("");
    }
  } catch (e) {}
}

async function handleBarcodeFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  showToast("Analyzing barcode in uploaded image...", "success");

  try {
    const result = await RealCameraScanner.scanImageFile(file);
    if (result) {
      AudioEngine.playScanBeep();
      const searchInput = document.getElementById("barcode-input");
      if (searchInput) searchInput.value = result;
      handleBarcodeOrRollInput(result);
    }
  } catch (err) {
    AudioEngine.playWarningTone();
    showToast(err.message || "Could not read barcode from image", "danger");
  } finally {
    e.target.value = "";
  }
}

function simulateCameraScanRandom() {
  if (AppState.students.length === 0) return;
  const randomStudent = AppState.students[Math.floor(Math.random() * AppState.students.length)];
  onRealCameraBarcodeDetected(randomStudent.rollNo);
}

// ============================================================================
// PAGE 2: REAL-TIME LIBRARY SITUATION & COMMON DATA DASHBOARD
// ============================================================================

function renderDashboard() {
  const totalCapacity = 250;
  const insideStudents = AppState.students.filter(s => s.isInside);
  const totalInside = insideStudents.length;
  const occupancyPercent = ((totalInside / totalCapacity) * 100).toFixed(1);

  const kpiInsideEl = document.getElementById("kpi-current-inside");
  const kpiCapacityEl = document.getElementById("kpi-capacity-meter");
  const kpiProgressFillEl = document.getElementById("kpi-occupancy-bar");
  const kpiFootfallEl = document.getElementById("kpi-today-footfall");
  const tabBadgeInsideEl = document.getElementById("tab-badge-inside");

  if (kpiInsideEl) kpiInsideEl.textContent = totalInside;
  if (kpiCapacityEl) kpiCapacityEl.textContent = `${occupancyPercent}% (${totalInside} / ${totalCapacity})`;
  if (kpiProgressFillEl) kpiProgressFillEl.style.width = `${Math.min(100, occupancyPercent)}%`;
  if (tabBadgeInsideEl) tabBadgeInsideEl.textContent = `${totalInside} Inside`;

  const todayStr = new Date().toISOString().split("T")[0];
  let todayVisits = 0;
  AppState.students.forEach(s => {
    (s.history || []).forEach(h => {
      if (h.date === todayStr) todayVisits++;
    });
  });
  if (kpiFootfallEl) kpiFootfallEl.textContent = todayVisits;

  renderDepartmentBreakdown(insideStudents);
  renderLiveInsideRoster();
}

function renderDepartmentBreakdown(insideStudents) {
  const container = document.getElementById("dept-breakdown-list");
  if (!container) return;

  const deptCounts = {};
  JECRC_DEPARTMENTS.forEach(dept => (deptCounts[dept] = 0));

  insideStudents.forEach(s => {
    if (deptCounts[s.branch] !== undefined) {
      deptCounts[s.branch]++;
    } else {
      deptCounts[s.branch] = (deptCounts[s.branch] || 0) + 1;
    }
  });

  const totalInside = Math.max(1, insideStudents.length);
  const sortedDepts = Object.keys(deptCounts).sort((a, b) => deptCounts[b] - deptCounts[a]);

  container.innerHTML = sortedDepts
    .map(dept => {
      const count = deptCounts[dept] || 0;
      const pct = ((count / totalInside) * 100).toFixed(0);
      const isZero = count === 0;

      return `
        <div class="dept-bar-item" style="opacity: ${isZero ? 0.45 : 1};">
          <div class="dept-bar-header">
            <span class="dept-name">
              ${dept}
            </span>
            <span class="dept-count">
              <strong>${count}</strong> students ${count > 0 ? `(${pct}%)` : ''}
            </span>
          </div>
          <div class="dept-bar-track">
            <div class="dept-bar-progress" style="width: ${count > 0 ? Math.max(8, pct) : 0}%;"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderLiveInsideRoster() {
  const tbody = document.getElementById("live-roster-tbody");
  if (!tbody) return;

  const searchQuery = (document.getElementById("dashboard-search")?.value || "").toLowerCase().trim();
  const deptFilter = document.getElementById("dashboard-dept-filter")?.value || "ALL";

  let insideStudents = AppState.students.filter(s => s.isInside);

  if (deptFilter !== "ALL") {
    insideStudents = insideStudents.filter(s => s.branch === deptFilter);
  }
  if (searchQuery) {
    insideStudents = insideStudents.filter(
      s =>
        s.name.toLowerCase().includes(searchQuery) ||
        s.rollNo.toLowerCase().includes(searchQuery) ||
        s.branch.toLowerCase().includes(searchQuery)
    );
  }

  if (insideStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No students currently inside match the selected filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = insideStudents
    .map(s => {
      const entryTimeFormatted = s.currentEntryTime
        ? new Date(s.currentEntryTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : "--:--";

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${s.avatar}" alt="${s.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--jecrc-gold-primary);" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=8b0000&color=fff'" />
              <div>
                <a href="javascript:void(0)" onclick="selectStudentAndGoToGate('${s.rollNo}')" style="font-weight: 700; color: var(--jecrc-red-primary); text-decoration: none;">
                  ${s.name}
                </a>
                <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${s.year} • Adm: ${s.admissionYear || '2026'}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-family: monospace; font-weight: 700; background: #fffdf5; border: 1px solid var(--jecrc-gold-border); padding: 3px 8px; border-radius: 4px; color: var(--jecrc-red-dark);">
              ${s.rollNo}
            </span>
          </td>
          <td><strong>${s.branch}</strong></td>
          <td>${s.course}</td>
          <td><span style="color: #065f46; font-weight: 700;">🕒 ${entryTimeFormatted}</span></td>
          <td>
            <span class="live-dwell-badge" data-entry="${s.currentEntryTime || ''}" style="font-family: monospace; font-weight: 700; color: var(--jecrc-red-primary);">
              calculating...
            </span>
          </td>
          <td>
            <button class="btn-checkout-sm" onclick="toggleStudentLibraryGate('${s.rollNo}')">
              Check-out
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  updateLiveTimers();
}

function filterLiveRoster() {
  renderLiveInsideRoster();
}

function selectStudentAndGoToGate(rollNo) {
  selectStudentByRollNo(rollNo, true);
  switchPageTab("student-tab");
}

function updateLiveTimers() {
  const dwellBadges = document.querySelectorAll(".live-dwell-badge");
  const now = Date.now();

  dwellBadges.forEach(badge => {
    const entryIso = badge.dataset.entry;
    if (!entryIso) {
      badge.textContent = "--";
      return;
    }
    const diffMs = now - new Date(entryIso).getTime();
    if (diffMs < 0) {
      badge.textContent = "Just entered";
      return;
    }
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    badge.textContent = `${hrs > 0 ? hrs + "h " : ""}${mins}m ${secs}s`;
  });

  const singleTimer = document.getElementById("single-student-dwell-timer");
  if (singleTimer && singleTimer.dataset.entry) {
    const diffMs = now - new Date(singleTimer.dataset.entry).getTime();
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    singleTimer.textContent = `${hrs > 0 ? hrs + "h " : ""}${mins}m ${secs}s`;
  }
}

// Render Demo Student Badges Shelf (All 2022-2026 Batches)
function renderDemoShelf() {
  const shelf = document.getElementById("demo-pills-list");
  if (!shelf) return;

  shelf.innerHTML = AppState.students
    .slice(0, 8)
    .map(s => {
      return `
        <button class="demo-student-pill" onclick="selectStudentByRollNo('${s.rollNo}', true)">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="demo-pill-name">${s.name}</span>
            <span style="font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; font-weight:700; ${s.isInside ? 'background:#d1fae5; color:#065f46;' : 'background:#f1f5f9; color:#64748b;'}">
              ${s.isInside ? 'INSIDE' : 'OUT'}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="demo-pill-roll">${s.rollNo}</span>
            <span style="font-size: 0.72rem; color: var(--jecrc-red-primary); font-weight: 700;">${s.year}</span>
          </div>
          <span class="demo-pill-dept">${s.branch}</span>
        </button>
      `;
    })
    .join("");
}

// Search Suggestions Dropdown
function showSearchSuggestions(query) {
  const cleanQ = (query || "").trim().toLowerCase();
  const dropdown = document.getElementById("search-suggestions-dropdown");
  if (!dropdown) return;

  if (cleanQ.length < 1) {
    hideSearchSuggestions();
    return;
  }

  const matches = AppState.students.filter(
    s => s.name.toLowerCase().includes(cleanQ) || s.rollNo.toLowerCase().includes(cleanQ)
  );

  if (matches.length === 0) {
    dropdown.innerHTML = `<div style="padding: 10px; color: var(--text-muted); font-size: 0.85rem;">No registered 2022-2026 student matching "${cleanQ}"</div>`;
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = matches
    .slice(0, 5)
    .map(s => `
      <div class="search-suggestion-item" onclick="selectStudentByRollNo('${s.rollNo}', true); hideSearchSuggestions();" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;">
        <div>
          <strong style="color: var(--jecrc-red-primary);">${s.name}</strong> (${s.rollNo})
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.year} • ${s.branch}</div>
        </div>
        <span style="font-size: 0.75rem; font-weight:700; color: ${s.isInside ? '#10b981' : '#94a3b8'};">
          ${s.isInside ? '● Inside' : '○ Out'}
        </span>
      </div>
    `)
    .join("");
  dropdown.style.display = "block";
}

function hideSearchSuggestions() {
  const dropdown = document.getElementById("search-suggestions-dropdown");
  if (dropdown) dropdown.style.display = "none";
}

function printStudentSlip() {
  if (!AppState.selectedStudent) return;
  window.print();
}

function exportStudentAttendanceCSV() {
  if (!AppState.selectedStudent) return;
  const s = AppState.selectedStudent;
  const rows = [
    ["JECRC UNIVERSITY CENTRAL LIBRARY - STUDENT ATTENDANCE REPORT"],
    ["Student Name", s.name],
    ["Roll Number", s.rollNo],
    ["Admission Year", s.admissionYear || "2026"],
    ["Academic Status", s.year],
    ["Department", s.branch],
    ["Course", s.course],
    [],
    ["Date", "Entry Time", "Exit Time", "Duration (Minutes)", "Status"]
  ];

  (s.history || []).forEach(h => {
    rows.push([h.date, h.entryTime || "--", h.exitTime || "--", h.durationMinutes || "Active", h.status]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `JECRC_Library_Log_${s.rollNo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Attendance CSV downloaded successfully", "success");
}

function exportLiveRosterCSV() {
  const insideStudents = AppState.students.filter(s => s.isInside);
  const rows = [
    ["JECRC UNIVERSITY CENTRAL LIBRARY - REAL-TIME OCCUPANCY ROSTER"],
    ["Generated On", new Date().toLocaleString()],
    ["Total Occupants Inside", insideStudents.length],
    [],
    ["Roll Number", "Student Name", "Admission Year", "Academic Status", "Department", "Course", "Entry Time", "Email", "Phone"]
  ];

  insideStudents.forEach(s => {
    const entryFormatted = s.currentEntryTime ? new Date(s.currentEntryTime).toLocaleTimeString("en-GB") : "--";
    rows.push([s.rollNo, s.name, s.admissionYear || "2026", s.year, s.branch, s.course, entryFormatted, s.email, s.phone]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => `"${e.join('","')}"`).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `JECRC_Library_Realtime_Roster_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Real-time Occupancy CSV exported!", "success");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("app-toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast-notification show ${type}`;

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3600);
}
