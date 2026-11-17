// JECRC University Central Library - Seed Data & Mock Database (v2.0)
// Batches: 2022 - 2026 (Admission before 2022 strictly excluded)

// Roll Number Parser Engine for JECRC University
const RollNumberParser = {
  // Mapping JECRC branch/program codes
  branchDictionary: {
    "BCON": { course: "B.Tech", branch: "Computer Science & Engineering", duration: 4 },
    "BAID": { course: "B.Tech", branch: "AI & Data Science", duration: 4 },
    "BIT":  { course: "B.Tech", branch: "Information Technology", duration: 4 },
    "BME":  { course: "B.Tech", branch: "Mechanical Engineering", duration: 4 },
    "BCE":  { course: "B.Tech", branch: "Civil Engineering", duration: 4 },
    "BECE": { course: "B.Tech", branch: "Electronics & Communication", duration: 4 },
    "BCA":  { course: "BCA", branch: "Computer Applications", duration: 3 },
    "BBA":  { course: "BBA", branch: "School of Management", duration: 3 },
    "MBA":  { course: "MBA", branch: "School of Management", duration: 2 },
    "BLAW": { course: "BA LLB (Hons)", branch: "Faculty of Law", duration: 5 },
    "BDES": { course: "B.Des", branch: "School of Design", duration: 4 },
    "BSCH": { course: "B.Sc (Hons)", branch: "Faculty of Science", duration: 3 }
  },

  /**
   * Parse student roll number: e.g. "26BCON1241"
   * 26 -> 2026 (Admission year)
   * BCON -> Bachelor of Computer Science & Engineering
   * 1241 -> Student sequential roll no
   */
  parse(inputRoll) {
    if (!inputRoll) return null;
    const clean = inputRoll.toString().trim().toUpperCase();

    // Regex to split 2-digit year prefix + alphabetic branch code + digits sequence
    const match = clean.match(/^(\d{2})([A-Z]+)(\d+)$/);
    if (!match) {
      return {
        validFormat: false,
        error: "Invalid Roll Number format. Expected format: [Year][Branch][RollNo] (e.g. 26BCON1241)"
      };
    }

    const yearPrefix = parseInt(match[1], 10);
    const branchCode = match[2];
    const seqNo = match[3];
    const admissionYear = 2000 + yearPrefix;

    // Strict Rule: Not include students who took admission before 2022
    if (admissionYear < 2022) {
      return {
        validFormat: true,
        isEligible: false,
        admissionYear,
        error: `Ineligible: Admission year 20${yearPrefix} is before 2022. Ex-students / graduated batches are not allowed in the current active student register.`
      };
    }

    // Current Date Year is 2026
    const currentYear = 2026;
    const yearDiff = currentYear - admissionYear;

    let academicYear = "1st Year";
    if (yearDiff === 0) academicYear = "1st Year";
    else if (yearDiff === 1) academicYear = "2nd Year";
    else if (yearDiff === 2) academicYear = "3rd Year";
    else if (yearDiff === 3) academicYear = "4th Year";
    else if (yearDiff >= 4) academicYear = "Final Year / 5th Year";

    const branchInfo = this.branchDictionary[branchCode] || {
      course: "Undergraduate",
      branch: branchCode + " Department",
      duration: 4
    };

    return {
      validFormat: true,
      isEligible: true,
      rollNo: clean,
      admissionYear,
      academicYear,
      batch: `${admissionYear} - ${admissionYear + branchInfo.duration}`,
      course: branchInfo.course,
      branch: branchInfo.branch,
      branchCode,
      seqNo
    };
  }
};

// INITIAL SEED DATABASE (Exclusively 2022 - 2026 Batches)
const INITIAL_STUDENTS = [
  {
    rollNo: "26BCON1241",
    name: "Aarav Sharma",
    branch: "Computer Science & Engineering",
    course: "B.Tech",
    year: "1st Year",
    admissionYear: 2026,
    batch: "2026 - 2030",
    email: "aarav.sharma26@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80",
    phone: "+91 98290 12345",
    bloodGroup: "O+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 75).toISOString(), // 75 mins ago
    history: [
      { date: "2026-11-17", entryTime: "15:07", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-16", entryTime: "10:15", exitTime: "13:45", durationMinutes: 210, status: "Completed" },
      { date: "2026-11-15", entryTime: "14:00", exitTime: "17:30", durationMinutes: 210, status: "Completed" },
      { date: "2026-11-14", entryTime: "11:20", exitTime: "15:00", durationMinutes: 220, status: "Completed" },
      { date: "2026-11-12", entryTime: "09:30", exitTime: "12:15", durationMinutes: 165, status: "Completed" },
      { date: "2026-11-10", entryTime: "13:00", exitTime: "16:45", durationMinutes: 225, status: "Completed" },
      { date: "2026-11-08", entryTime: "10:00", exitTime: "14:30", durationMinutes: 270, status: "Completed" },
      { date: "2026-11-05", entryTime: "15:10", exitTime: "18:00", durationMinutes: 170, status: "Completed" }
    ]
  },
  {
    rollNo: "26BAID0312",
    name: "Sneha Shekhawat",
    branch: "AI & Data Science",
    course: "B.Tech",
    year: "1st Year",
    admissionYear: 2026,
    batch: "2026 - 2030",
    email: "sneha.s26@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    phone: "+91 91160 33412",
    bloodGroup: "AB+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hrs ago
    history: [
      { date: "2026-11-17", entryTime: "13:22", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-16", entryTime: "14:00", exitTime: "17:00", durationMinutes: 180, status: "Completed" },
      { date: "2026-11-15", entryTime: "09:30", exitTime: "13:00", durationMinutes: 210, status: "Completed" },
      { date: "2026-11-13", entryTime: "11:00", exitTime: "14:15", durationMinutes: 195, status: "Completed" }
    ]
  },
  {
    rollNo: "25BCON0842",
    name: "Priya Rathore",
    branch: "Computer Science & Engineering",
    course: "B.Tech",
    year: "2nd Year",
    admissionYear: 2025,
    batch: "2025 - 2029",
    email: "priya.rathore25@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
    phone: "+91 98291 55678",
    bloodGroup: "B+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 125).toISOString(), // 2h 5m ago
    history: [
      { date: "2026-11-17", entryTime: "14:17", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-16", entryTime: "09:30", exitTime: "12:30", durationMinutes: 180, status: "Completed" },
      { date: "2026-11-14", entryTime: "14:15", exitTime: "17:15", durationMinutes: 180, status: "Completed" },
      { date: "2026-11-11", entryTime: "10:00", exitTime: "13:45", durationMinutes: 225, status: "Completed" }
    ]
  },
  {
    rollNo: "25BIT0194",
    name: "Kavya Singhal",
    branch: "Information Technology",
    course: "B.Tech",
    year: "2nd Year",
    admissionYear: 2025,
    batch: "2025 - 2029",
    email: "kavya.s25@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80",
    phone: "+91 93140 66523",
    bloodGroup: "O+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "15:37", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-15", entryTime: "11:00", exitTime: "14:00", durationMinutes: 180, status: "Completed" }
    ]
  },
  {
    rollNo: "24BCON0521",
    name: "Kartik Mathur",
    branch: "Computer Science & Engineering",
    course: "B.Tech",
    year: "3rd Year",
    admissionYear: 2024,
    batch: "2024 - 2028",
    email: "kartik.m24@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    phone: "+91 94140 88921",
    bloodGroup: "A+",
    isInside: false,
    currentEntryTime: null,
    history: [
      { date: "2026-11-16", entryTime: "10:00", exitTime: "14:00", durationMinutes: 240, status: "Completed" },
      { date: "2026-11-14", entryTime: "13:00", exitTime: "16:30", durationMinutes: 210, status: "Completed" },
      { date: "2026-11-11", entryTime: "11:30", exitTime: "14:00", durationMinutes: 150, status: "Completed" }
    ]
  },
  {
    rollNo: "24BME0145",
    name: "Rohan Meena",
    branch: "Mechanical Engineering",
    course: "B.Tech",
    year: "3rd Year",
    admissionYear: 2024,
    batch: "2024 - 2028",
    email: "rohan.meena24@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
    phone: "+91 97850 44123",
    bloodGroup: "B+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "15:47", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-13", entryTime: "10:30", exitTime: "13:00", durationMinutes: 150, status: "Completed" }
    ]
  },
  {
    rollNo: "24BLAW0032",
    name: "Ananya Joshi",
    branch: "Faculty of Law",
    course: "BA LLB (Hons)",
    year: "3rd Year",
    admissionYear: 2024,
    batch: "2024 - 2029",
    email: "ananya.j24@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80",
    phone: "+91 96490 22341",
    bloodGroup: "A-",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "14:37", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-15", entryTime: "11:30", exitTime: "15:00", durationMinutes: 210, status: "Completed" }
    ]
  },
  {
    rollNo: "23BAID0088",
    name: "Divyansh Khandelwal",
    branch: "AI & Data Science",
    course: "B.Tech",
    year: "4th Year",
    admissionYear: 2023,
    batch: "2023 - 2027",
    email: "divyansh.k23@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80",
    phone: "+91 98280 77456",
    bloodGroup: "B+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "15:17", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-14", entryTime: "12:00", exitTime: "15:30", durationMinutes: 210, status: "Completed" }
    ]
  },
  {
    rollNo: "23BCE0042",
    name: "Aditya Choudhary",
    branch: "Civil Engineering",
    course: "B.Tech",
    year: "4th Year",
    admissionYear: 2023,
    batch: "2023 - 2027",
    email: "aditya.c23@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=250&q=80",
    phone: "+91 94145 66782",
    bloodGroup: "O+",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "15:32", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-12", entryTime: "14:00", exitTime: "16:30", durationMinutes: 150, status: "Completed" }
    ]
  },
  {
    rollNo: "23BCA0110",
    name: "Riddhi Agarwal",
    branch: "Computer Applications",
    course: "BCA",
    year: "4th Year",
    admissionYear: 2023,
    batch: "2023 - 2026",
    email: "riddhi.a23@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80",
    phone: "+91 97840 11982",
    bloodGroup: "A+",
    isInside: false,
    currentEntryTime: null,
    history: [
      { date: "2026-11-16", entryTime: "12:00", exitTime: "14:45", durationMinutes: 165, status: "Completed" },
      { date: "2026-11-13", entryTime: "10:30", exitTime: "13:30", durationMinutes: 180, status: "Completed" }
    ]
  },
  {
    rollNo: "22BCON0219",
    name: "Vikramaditya Verma",
    branch: "Computer Science & Engineering",
    course: "B.Tech",
    year: "Final Year / 5th Year",
    admissionYear: 2022,
    batch: "2022 - 2026",
    email: "vikram.v22@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80",
    phone: "+91 98299 44321",
    bloodGroup: "B+",
    isInside: false,
    currentEntryTime: null,
    history: [
      { date: "2026-11-17", entryTime: "10:15", exitTime: "13:45", durationMinutes: 210, status: "Completed" },
      { date: "2026-11-15", entryTime: "11:00", exitTime: "15:20", durationMinutes: 260, status: "Completed" },
      { date: "2026-11-12", entryTime: "09:30", exitTime: "13:00", durationMinutes: 210, status: "Completed" }
    ]
  },
  {
    rollNo: "22BBA0114",
    name: "Karan Singhania",
    branch: "School of Management",
    course: "BBA",
    year: "Final Year / 5th Year",
    admissionYear: 2022,
    batch: "2022 - 2025",
    email: "karan.singh22@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80",
    phone: "+91 98295 99120",
    bloodGroup: "O-",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "16:02", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-14", entryTime: "11:15", exitTime: "13:30", durationMinutes: 135, status: "Completed" }
    ]
  },
  {
    rollNo: "25BSCH0045",
    name: "Arjun Pareek",
    branch: "Faculty of Science",
    course: "B.Sc (Hons)",
    year: "2nd Year",
    admissionYear: 2025,
    batch: "2025 - 2028",
    email: "arjun.p25@jecrc.ac.in",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80",
    phone: "+91 91660 88231",
    bloodGroup: "B-",
    isInside: true,
    currentEntryTime: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    history: [
      { date: "2026-11-17", entryTime: "15:12", exitTime: null, durationMinutes: null, status: "Active" },
      { date: "2026-11-13", entryTime: "11:00", exitTime: "13:30", durationMinutes: 150, status: "Completed" }
    ]
  }
];

// Department Configuration for JECRC University
const JECRC_DEPARTMENTS = [
  "Computer Science & Engineering",
  "AI & Data Science",
  "Information Technology",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electronics & Communication",
  "School of Management",
  "Faculty of Law",
  "School of Design",
  "Faculty of Science",
  "Computer Applications"
];
