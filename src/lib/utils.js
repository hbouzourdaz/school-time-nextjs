// =====================================================
// الثوابت والدوال المساعدة العامة
// =====================================================

export const C_INK        = "#0F3D3E";
export const C_INK_DARK   = "#0A2C2D";
export const C_INK_TEAL   = "#0F3D3E";
export const C_INK_TEAL_DARK = "#0A2C2D";
export const C_PAPER      = "#F5F6F0";
export const C_SAGE_LINE  = "#DCE2D6";
export const C_OCHRE      = "#C68A2E";
export const C_OCHRE_DARK = "#96691F";
export const C_CLAY       = "#B5533C";
export const C_SUCCESS    = "#3F7859";

export const FONT_STACK = "'Cairo', system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif";

export const PRICE_PER_SECTION = 250;
export const ROTATING_SECTIONS_FEE = 1000;
export const EXPERT_REGISTRATION_FEE = 5000;

export const ADMIN_PAYMENT_DEFAULTS = {
  ccp_name: "BELHOCINE NAWEL",
  ccp_number: "1620661515",
  baridimob_name: "BELHOCINE NAWEL",
  baridimob_number: "079999002206615182",
};

const ADMIN_PAYMENT_KEY = "app-config:admin-payment";

export function getAdminPaymentInfo() {
  if (typeof window === "undefined") return ADMIN_PAYMENT_DEFAULTS;
  try {
    const raw = localStorage.getItem(ADMIN_PAYMENT_KEY);
    if (raw) return { ...ADMIN_PAYMENT_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return ADMIN_PAYMENT_DEFAULTS;
}

export function saveAdminPaymentInfo(info) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ADMIN_PAYMENT_KEY, JSON.stringify(info)); } catch {}
}

export const STATUS_PENDING     = "قيد المعاينة";
export const STATUS_IN_PROGRESS = "قيد الإنجاز";
export const STATUS_DONE        = "مكتمل";
export const STATUS_CANCELLED   = "ملغي";
export const STATUS_REJECTED    = "مرفوض";
export const ALL_STATUSES       = [STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_DONE];
export const ALL_STATUSES_WITH_CANCEL = [STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_DONE, STATUS_CANCELLED];

export const REG_STATUS_PENDING  = "قيد المراجعة";
export const REG_STATUS_APPROVED = "مقبول";
export const REG_STATUS_REJECTED = "مرفوض";

export const PAYMENT_METHOD_CCP       = "ccp";
export const PAYMENT_METHOD_BARIDIMOB = "baridimob";
export const PAYMENT_METHOD_LABELS    = {
  [PAYMENT_METHOD_CCP]:       "CCP",
  [PAYMENT_METHOD_BARIDIMOB]: "بريد موب",
};

export const LEVEL_MIDDLE     = "متوسط";
export const LEVEL_SECONDARY  = "ثانوي";

export const DAYS_PATTERN_SUN_THU = "sun_thu";
export const DAYS_PATTERN_SAT_THU = "sat_thu";
export const DAYS_PATTERN_LABELS = {
  [DAYS_PATTERN_SUN_THU]: "من الأحد إلى الخميس",
  [DAYS_PATTERN_SAT_THU]: "من السبت إلى الخميس",
};

export const MIDDLE_LEVELS = [
  "السنة الأولى متوسط",
  "السنة الثانية متوسط",
  "السنة الثالثة متوسط",
  "السنة الرابعة متوسط",
];

export const SECONDARY_STRUCTURE = [
  { level: "السنة الأولى ثانوي", streams: ["جذع مشترك آداب", "جذع مشترك علوم وتكنولوجيا"] },
  { level: "السنة الثانية ثانوي", streams: ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"] },
  { level: "السنة الثالثة ثانوي", streams: ["علوم تجريبية", "رياضيات", "تقني رياضي", "تسيير واقتصاد", "آداب وفلسفة", "لغات أجنبية"] },
];

export const DEFAULT_SUBJECTS = {
  [LEVEL_MIDDLE]: [
    "اللغة العربية","اللغة الفرنسية","اللغة الإنجليزية","الرياضيات",
    "العلوم الطبيعية","العلوم الفيزيائية","التاريخ والجغرافيا",
    "التربية الإسلامية","التربية المدنية","التربية الفنية",
    "التربية الموسيقية","التربية البدنية","الإعلام الآلي",
  ],
  [LEVEL_SECONDARY]: [
    "اللغة العربية","اللغة الفرنسية","اللغة الإنجليزية","الرياضيات",
    "العلوم الطبيعية","العلوم الفيزيائية","التاريخ والجغرافيا",
    "التربية الإسلامية","العلوم التطبيقية","التربية البدنية","الإعلام الآلي",
  ],
};

export const WILAYAS = [
  "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار",
  "البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو",
  "الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس",
  "عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر",
  "ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف",
  "تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة",
  "عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون",
  "برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام",
  "تقرت","جانت","المغير","المنيعة",
];

// =====================================================
// دوال مساعدة
// =====================================================
let __idCounter = 0;
export function generateId() {
  __idCounter += 1;
  return `row_${Date.now()}_${__idCounter}`;
}

export function generateCode() {
  const n = Math.floor(1e5 + Math.random() * 9e5);
  return `BK-${n}`;
}

export function generatePIN() {
  return String(Math.floor(1e3 + Math.random() * 9e3));
}

export function generateExpertPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export function formatDZD(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString("en-US")} دج`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createEmptyForm() {
  return {
    level: "",
    applicantName: "",
    phone: "",
    email: "",
    institutionName: "",
    wilaya: "",
    municipality: "",
    expertUsername: "",
    daysPattern: "",
    morningPeriods: "",
    afternoonPeriods: "",
    afternoonStartTime: "13:00",
    numRooms: "",
    numLabs: "",
    numWorkshops: "",
    numComputerRooms: "",
    numPlaygrounds: "",
    sectionsMode: "manual",
    sectionsBreakdown: {},
    teachersBreakdown: [],
    mapImage: null,
    mapTotalSections: "",
    hasRotatingSections: false,
    rotatingSectionsNames: "",
    assignmentFile: null,
    notesGuidedWork: "",
    notesCatchUpTech: "",
    notesGeneral: "",
  };
}

export function seedTeachers(level) {
  const subjects = DEFAULT_SUBJECTS[level] || [];
  return subjects.map((s) => ({ id: generateId(), subject: s, count: "" }));
}

export function getSectionRows(level) {
  if (level === LEVEL_MIDDLE) {
    return MIDDLE_LEVELS.map((lvl) => ({ key: lvl, label: lvl }));
  }
  if (level === LEVEL_SECONDARY) {
    const rows = [];
    SECONDARY_STRUCTURE.forEach(({ level: lvl, streams }) => {
      streams.forEach((stream) => {
        rows.push({ key: `${lvl}::${stream}`, label: `${lvl} - ${stream}`, group: lvl });
      });
    });
    return rows;
  }
  return [];
}

export function groupSectionRows(rows) {
  const order = [];
  const map = {};
  rows.forEach((row) => {
    const g = row.group;
    if (!map[g]) { map[g] = []; order.push(g); }
    map[g].push(row);
  });
  return order.map((g) => ({ group: g, rows: map[g] }));
}

export function computeTotalSections(form) {
  if (form.sectionsMode === "map") {
    return Number(form.mapTotalSections) || 0;
  }
  return Object.values(form.sectionsBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

export function computeRotatingFee(form) {
  return form.hasRotatingSections ? ROTATING_SECTIONS_FEE : 0;
}

export function computeTotalPrice(form) {
  return computeTotalSections(form) * PRICE_PER_SECTION + computeRotatingFee(form);
}

export function buildBookingRecord(form, code, pin) {
  const totalSections = computeTotalSections(form);
  const rotatingFee = computeRotatingFee(form);
  const totalPrice = computeTotalPrice(form);
  const nowIso = new Date().toISOString();
  return {
    code,
    pin,
    level: form.level,
    applicant_name: form.applicantName,
    phone: form.phone,
    email: form.email,
    institution_name: form.institutionName,
    wilaya: form.wilaya,
    municipality: form.municipality,
    expert_username: form.expertUsername || null,
    expert_name: "",
    days_pattern: form.daysPattern,
    morning_periods: Number(form.morningPeriods) || 0,
    afternoon_periods: Number(form.afternoonPeriods) || 0,
    afternoon_start_time: form.afternoonStartTime,
    num_rooms: Number(form.numRooms) || 0,
    num_labs: Number(form.numLabs) || 0,
    num_workshops: Number(form.numWorkshops) || 0,
    num_computer_rooms: Number(form.numComputerRooms) || 0,
    num_playgrounds: Number(form.numPlaygrounds) || 0,
    sections_mode: form.sectionsMode,
    sections_breakdown: form.sectionsMode === "manual" ? form.sectionsBreakdown : null,
    teachers_breakdown: form.sectionsMode === "manual" ? form.teachersBreakdown : null,
    map_image_url: form.sectionsMode === "map" && form.mapImage ? form.mapImage.url : null,
    total_sections: totalSections,
    has_rotating_sections: form.hasRotatingSections,
    rotating_sections_names: form.hasRotatingSections ? form.rotatingSectionsNames : "",
    rotating_sections_fee: rotatingFee,
    assignment_file_url: form.assignmentFile ? form.assignmentFile.url : null,
    notes_guided_work: form.notesGuidedWork,
    notes_catch_up_tech: form.notesCatchUpTech,
    notes_general: form.notesGeneral,
    total_price: totalPrice,
    status: STATUS_PENDING,
    is_paid: false,
    final_files: [],
    payment_method: null,
    payment_proof_url: null,
    payment_proof_name: null,
    payment_confirmed: false,
    download_allowed: false,
    payment_submitted_at: null,
    cancel_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    rejected_reason: null,
    admin_confirmed: false,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export function computeStats(bookings) {
  const byLevel = {};
  const byExpert = {};
  let totalValue = 0;
  let totalCollected = 0;
  for (const b of bookings) {
    const level = b.level || "غير محدد";
    byLevel[level] = (byLevel[level] || 0) + 1;
    const expertKey = b.expert_name || b.expert_username || "بدون خبير محدد";
    if (!byExpert[expertKey]) byExpert[expertKey] = { count: 0, value: 0, collected: 0 };
    byExpert[expertKey].count += 1;
    byExpert[expertKey].value += Number(b.total_price) || 0;
    if (b.is_paid) byExpert[expertKey].collected += Number(b.total_price) || 0;
    totalValue += Number(b.total_price) || 0;
    if (b.is_paid) totalCollected += Number(b.total_price) || 0;
  }
  return { totalRequests: bookings.length, byLevel, byExpert, totalValue, totalCollected };
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file, maxWidth = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
