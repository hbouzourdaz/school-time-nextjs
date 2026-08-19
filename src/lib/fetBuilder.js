// =====================================================
// FET XML Builder & Parser Utilities
// =====================================================
import {
  DAYS_PATTERN_SUN_THU,
  DAYS_PATTERN_SAT_THU,
  DEFAULT_SUBJECTS,
  LEVEL_MIDDLE,
  LEVEL_SECONDARY
} from "./utils";

/**
 * Builds an initial FET data model from a Booking object.
 */
export function buildInitialFetModelFromBooking(booking) {
  const institution = booking.institution_name || "المؤسسة التعليمية";
  const comments = `Generated for booking ${booking.code || ""} - ${booking.applicant_name || ""}`;

  // 1. Days List
  let days = [];
  if (booking.days_pattern === DAYS_PATTERN_SAT_THU) {
    days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  } else {
    // Default Sun-Thu
    days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  }

  // 2. Hours List
  const morningPeriods = Number(booking.morning_periods) || 4;
  const afternoonPeriods = Number(booking.afternoon_periods) || 3;
  const hours = [];

  // Morning hours (e.g. 08:00 - 09:00, 09:00 - 10:00, ...)
  for (let i = 1; i <= morningPeriods; i++) {
    const startH = 7 + i;
    const endH = 8 + i;
    const startStr = startH < 10 ? `0${startH}:00` : `${startH}:00`;
    const endStr = endH < 10 ? `0${endH}:00` : `${endH}:00`;
    hours.push(`ح${i} (${startStr}-${endStr})`);
  }

  // Afternoon hours (e.g. 13:00 - 14:00, 14:00 - 15:00, ...)
  for (let i = 1; i <= afternoonPeriods; i++) {
    const periodNum = morningPeriods + i;
    const startH = 12 + i;
    const endH = 13 + i;
    hours.push(`ح${periodNum} (${startH}:00-${endH}:00)`);
  }

  // 3. Subjects List
  const subjectsSet = new Set();
  if (booking.teachers_breakdown && Array.isArray(booking.teachers_breakdown)) {
    booking.teachers_breakdown.forEach((t) => {
      if (t.subject && t.subject.trim()) subjectsSet.add(t.subject.trim());
    });
  }
  if (subjectsSet.size === 0) {
    DEFAULT_SUBJECTS.forEach((s) => subjectsSet.add(s));
  }
  const subjects = Array.from(subjectsSet);

  // 4. Teachers List
  const teachers = [];
  if (booking.teachers_breakdown && Array.isArray(booking.teachers_breakdown) && booking.teachers_breakdown.length > 0) {
    booking.teachers_breakdown.forEach((t) => {
      const subjectName = t.subject || "مادة عامة";
      const count = Number(t.count) || 1;
      for (let i = 1; i <= count; i++) {
        teachers.push({
          name: count > 1 ? `أستاذ ${subjectName} ${i}` : `أستاذ ${subjectName}`,
          subject: subjectName,
          targetHours: 18
        });
      }
    });
  } else {
    // Default mock teachers if none provided
    subjects.slice(0, 10).forEach((subj, idx) => {
      teachers.push({
        name: `أستاذ ${subj}`,
        subject: subj,
        targetHours: 18
      });
    });
  }

  // 5. Sections / Students Structure
  const sections = [];
  if (booking.sections_breakdown && typeof booking.sections_breakdown === "object") {
    Object.entries(booking.sections_breakdown).forEach(([key, count]) => {
      const num = Number(count) || 0;
      for (let i = 1; i <= num; i++) {
        // e.g. 1AM 1, 1AM 2, or 1AS Sci 1
        const cleanKey = key.includes("::") ? key.split("::").join(" ") : key;
        sections.push({
          name: num > 1 ? `${cleanKey} (${i})` : cleanKey,
          year: cleanKey
        });
      }
    });
  }
  if (sections.length === 0) {
    const total = Number(booking.total_sections) || 8;
    const isMiddle = booking.level === LEVEL_MIDDLE;
    for (let i = 1; i <= total; i++) {
      const lvl = isMiddle ? `${((i - 1) % 4) + 1}م` : `${((i - 1) % 3) + 1}ث`;
      const groupNum = Math.floor((i - 1) / (isMiddle ? 4 : 3)) + 1;
      sections.push({
        name: `${lvl} ${groupNum}`,
        year: lvl
      });
    }
  }

  // 6. Rooms List
  const rooms = [];
  const numRooms = Number(booking.num_rooms) || 12;
  const numLabs = Number(booking.num_labs) || 2;
  const numWorkshops = Number(booking.num_workshops) || 1;
  const numComp = Number(booking.num_computer_rooms) || 1;
  const numPlaygrounds = Number(booking.num_playgrounds) || 1;

  for (let i = 1; i <= numRooms; i++) rooms.push({ name: `حجرة ${i}`, type: "standard", capacity: 40 });
  for (let i = 1; i <= numLabs; i++) rooms.push({ name: `مخبر ${i}`, type: "lab", capacity: 36 });
  for (let i = 1; i <= numWorkshops; i++) rooms.push({ name: `ورشة ${i}`, type: "workshop", capacity: 36 });
  for (let i = 1; i <= numComp; i++) rooms.push({ name: `قاعة إعلام ${i}`, type: "computer", capacity: 30 });
  for (let i = 1; i <= numPlaygrounds; i++) rooms.push({ name: `ملعب رياضي ${i}`, type: "sports", capacity: 50 });

  // 7. Initial Activities (Connect teachers, subjects, and sections)
  const activities = [];
  let actIdCounter = 1;

  // Simple round-robin distribution to create initial activities for each section
  sections.forEach((sec) => {
    subjects.slice(0, 8).forEach((subj) => {
      // Find teacher for this subject
      const t = teachers.find((tch) => tch.subject === subj) || teachers[0];
      // 2 single-hour activities per subject per section
      activities.push({
        id: actIdCounter++,
        teacher: t ? t.name : "أستاذ عام",
        subject: subj,
        students: sec.name,
        duration: 1,
        active: true
      });
      activities.push({
        id: actIdCounter++,
        teacher: t ? t.name : "أستاذ عام",
        subject: subj,
        students: sec.name,
        duration: 1,
        active: true
      });
    });
  });

  // 8. Constraints
  const constraints = {
    teacherNotAvailableTimes: {}, // { "Teacher Name": [ { day: "الأحد", hour: "ح1 (...)" } ] }
    teacherMaxHoursDaily: {},    // { "Teacher Name": 6 }
    teacherMaxDaysPerWeek: {},   // { "Teacher Name": 5 }
    activityPreferredRooms: {},  // { activityId: "مخبر 1" }
    subjectPreferredRooms: {}    // { "التربية البدنية": "ملعب رياضي 1", "الإعلام الآلي": "قاعة إعلام 1" }
  };

  // Set default subject preferred rooms if suitable rooms exist
  const compRoom = rooms.find((r) => r.type === "computer");
  if (compRoom) constraints.subjectPreferredRooms["الإعلام الآلي"] = compRoom.name;

  const sportRoom = rooms.find((r) => r.type === "sports");
  if (sportRoom) constraints.subjectPreferredRooms["التربية البدنية"] = sportRoom.name;

  const labRoom = rooms.find((r) => r.type === "lab");
  if (labRoom) {
    constraints.subjectPreferredRooms["العلوم الفيزيائية والتكنولوجية"] = labRoom.name;
    constraints.subjectPreferredRooms["علوم الطبيعة والحياة"] = labRoom.name;
  }

  return {
    institution,
    comments,
    days,
    hours,
    teachers,
    subjects,
    sections,
    rooms,
    activities,
    constraints
  };
}

/**
 * Serializes the JS FET model into a standard valid FET XML string.
 */
export function serializeFetModelToXml(model) {
  const {
    institution = "المؤسسة التعليمية",
    comments = "",
    days = [],
    hours = [],
    teachers = [],
    subjects = [],
    sections = [],
    rooms = [],
    activities = [],
    constraints = {}
  } = model;

  const escapeXml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<fet version="7.10.0">\n`;
  xml += `  <Institution_Name>${escapeXml(institution)}</Institution_Name>\n`;
  xml += `  <Comments>${escapeXml(comments)}</Comments>\n\n`;

  // Days List
  xml += `  <Days_List>\n`;
  xml += `    <Number_of_Days>${days.length}</Number_of_Days>\n`;
  days.forEach((d) => {
    xml += `    <Day>\n      <Name>${escapeXml(d)}</Name>\n    </Day>\n`;
  });
  xml += `  </Days_List>\n\n`;

  // Hours List
  xml += `  <Hours_List>\n`;
  xml += `    <Number_of_Hours>${hours.length}</Number_of_Hours>\n`;
  hours.forEach((h) => {
    xml += `    <Hour>\n      <Name>${escapeXml(h)}</Name>\n    </Hour>\n`;
  });
  xml += `  </Hours_List>\n\n`;

  // Subjects List
  xml += `  <Subjects_List>\n`;
  subjects.forEach((s) => {
    const sName = typeof s === "string" ? s : s.name;
    xml += `    <Subject>\n      <Name>${escapeXml(sName)}</Name>\n    </Subject>\n`;
  });
  xml += `  </Subjects_List>\n\n`;

  // Activity Tags
  xml += `  <Activity_Tags_List>\n`;
  xml += `  </Activity_Tags_List>\n\n`;

  // Teachers List
  xml += `  <Teachers_List>\n`;
  teachers.forEach((t) => {
    const tName = typeof t === "string" ? t : t.name;
    xml += `    <Teacher>\n      <Name>${escapeXml(tName)}</Name>\n      <Target_Number_of_Hours>0</Target_Number_of_Hours>\n    </Teacher>\n`;
  });
  xml += `  </Teachers_List>\n\n`;

  // Students List (Grouped as single Years with Groups)
  xml += `  <Students_List>\n`;
  // Group sections by year if available
  const yearGroups = {};
  sections.forEach((sec) => {
    const secName = typeof sec === "string" ? sec : sec.name;
    const yearName = sec.year || "الأقسام";
    if (!yearGroups[yearName]) yearGroups[yearName] = [];
    yearGroups[yearName].push(secName);
  });

  Object.entries(yearGroups).forEach(([yearName, groupList]) => {
    xml += `    <Year>\n`;
    xml += `      <Name>${escapeXml(yearName)}</Name>\n`;
    xml += `      <Number_of_Students>0</Number_of_Students>\n`;
    groupList.forEach((grp) => {
      xml += `      <Group>\n`;
      xml += `        <Name>${escapeXml(grp)}</Name>\n`;
      xml += `        <Number_of_Students>0</Number_of_Students>\n`;
      xml += `      </Group>\n`;
    });
    xml += `    </Year>\n`;
  });
  xml += `  </Students_List>\n\n`;

  // Activities List
  xml += `  <Activities_List>\n`;
  activities.forEach((act, idx) => {
    const id = act.id || idx + 1;
    xml += `    <Activity>\n`;
    xml += `      <Id>${id}</Id>\n`;
    if (act.teacher) xml += `      <Teacher>${escapeXml(act.teacher)}</Teacher>\n`;
    if (act.subject) xml += `      <Subject>${escapeXml(act.subject)}</Subject>\n`;
    if (act.students) {
      // Multiple students can be split by +
      const studentsList = String(act.students).split("+").map((s) => s.trim()).filter(Boolean);
      studentsList.forEach((s) => {
        xml += `      <Students>${escapeXml(s)}</Students>\n`;
      });
    }
    xml += `      <Duration>${act.duration || 1}</Duration>\n`;
    xml += `      <Total_Duration>${act.duration || 1}</Total_Duration>\n`;
    xml += `      <Active>${act.active !== false ? "true" : "false"}</Active>\n`;
    xml += `    </Activity>\n`;
  });
  xml += `  </Activities_List>\n\n`;

  // Buildings & Rooms List
  xml += `  <Buildings_List>\n`;
  xml += `  </Buildings_List>\n\n`;

  xml += `  <Rooms_List>\n`;
  rooms.forEach((r) => {
    const rName = typeof r === "string" ? r : r.name;
    const rCap = typeof r === "object" && r.capacity ? r.capacity : 40;
    xml += `    <Room>\n`;
    xml += `      <Name>${escapeXml(rName)}</Name>\n`;
    xml += `      <Capacity>${rCap}</Capacity>\n`;
    xml += `    </Room>\n`;
  });
  xml += `  </Rooms_List>\n\n`;

  // ==========================================
  // TIME CONSTRAINTS
  // ==========================================
  xml += `  <Time_Constraints_List>\n`;
  xml += `    <ConstraintBasicCompulsoryTime>\n      <Weight_Percentage>100</Weight_Percentage>\n      <Active>true</Active>\n    </ConstraintBasicCompulsoryTime>\n`;

  // 1. Teacher Not Available Times Constraints
  if (constraints.teacherNotAvailableTimes) {
    Object.entries(constraints.teacherNotAvailableTimes).forEach(([teacherName, unavailSlots]) => {
      if (Array.isArray(unavailSlots) && unavailSlots.length > 0) {
        xml += `    <ConstraintTeacherNotAvailableTimes>\n`;
        xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
        xml += `      <Teacher_Name>${escapeXml(teacherName)}</Teacher_Name>\n`;
        xml += `      <Number_of_Not_Available_Times>${unavailSlots.length}</Number_of_Not_Available_Times>\n`;
        unavailSlots.forEach((slot) => {
          xml += `      <Not_Available_Time>\n`;
          xml += `        <Day>${escapeXml(slot.day)}</Day>\n`;
          xml += `        <Hour>${escapeXml(slot.hour)}</Hour>\n`;
          xml += `      </Not_Available_Time>\n`;
        });
        xml += `      <Active>true</Active>\n`;
        xml += `    </ConstraintTeacherNotAvailableTimes>\n`;
      }
    });
  }

  // 2. Teacher Max Hours Daily Constraints
  if (constraints.teacherMaxHoursDaily) {
    Object.entries(constraints.teacherMaxHoursDaily).forEach(([teacherName, maxHours]) => {
      if (maxHours && Number(maxHours) > 0) {
        xml += `    <ConstraintTeacherMaxHoursDaily>\n`;
        xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
        xml += `      <Teacher_Name>${escapeXml(teacherName)}</Teacher_Name>\n`;
        xml += `      <Maximum_Hours_Daily>${Number(maxHours)}</Maximum_Hours_Daily>\n`;
        xml += `      <Active>true</Active>\n`;
        xml += `    </ConstraintTeacherMaxHoursDaily>\n`;
      }
    });
  }

  // 3. Teacher Max Days Per Week Constraints
  if (constraints.teacherMaxDaysPerWeek) {
    Object.entries(constraints.teacherMaxDaysPerWeek).forEach(([teacherName, maxDays]) => {
      if (maxDays && Number(maxDays) > 0) {
        xml += `    <ConstraintTeacherMaxDaysPerWeek>\n`;
        xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
        xml += `      <Teacher_Name>${escapeXml(teacherName)}</Teacher_Name>\n`;
        xml += `      <Max_Days_Per_Week>${Number(maxDays)}</Max_Days_Per_Week>\n`;
        xml += `      <Active>true</Active>\n`;
        xml += `    </ConstraintTeacherMaxDaysPerWeek>\n`;
      }
    });
  }

  // 4. Global Pedagogical Constraints (From Exp2Fet Screen 4)
  const gen = constraints.generalConstraints || {};
  if (gen.maxGapsPerWeekTeachers !== undefined && gen.maxGapsPerWeekTeachers !== "") {
    xml += `    <ConstraintTeachersMaxGapsPerWeek>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Max_Gaps>${Number(gen.maxGapsPerWeekTeachers)}</Max_Gaps>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintTeachersMaxGapsPerWeek>\n`;
  }
  if (gen.maxGapsPerDayTeachers !== undefined && gen.maxGapsPerDayTeachers !== "") {
    xml += `    <ConstraintTeachersMaxGapsPerDay>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Max_Gaps>${Number(gen.maxGapsPerDayTeachers)}</Max_Gaps>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintTeachersMaxGapsPerDay>\n`;
  }
  if (gen.minHoursDailyTeachers !== undefined && gen.minHoursDailyTeachers !== "") {
    xml += `    <ConstraintTeachersMinHoursDaily>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Minimum_Hours_Daily>${Number(gen.minHoursDailyTeachers)}</Minimum_Hours_Daily>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintTeachersMinHoursDaily>\n`;
  }
  if (gen.maxGapsPerWeekStudents !== undefined && gen.maxGapsPerWeekStudents !== "") {
    xml += `    <ConstraintStudentsMaxGapsPerWeek>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Max_Gaps>${Number(gen.maxGapsPerWeekStudents)}</Max_Gaps>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintStudentsMaxGapsPerWeek>\n`;
  }
  if (gen.studentsStartEarly) {
    xml += `    <ConstraintStudentsEarlyBeginnings>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintStudentsEarlyBeginnings>\n`;
  }
  if (gen.minHoursDailyStudents !== undefined && gen.minHoursDailyStudents !== "") {
    xml += `    <ConstraintStudentsMinHoursDaily>\n`;
    xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
    xml += `      <Minimum_Hours_Daily>${Number(gen.minHoursDailyStudents)}</Minimum_Hours_Daily>\n`;
    xml += `      <Active>true</Active>\n`;
    xml += `    </ConstraintStudentsMinHoursDaily>\n`;
  }

  xml += `  </Time_Constraints_List>\n\n`;

  // ==========================================
  // SPACE CONSTRAINTS
  // ==========================================
  xml += `  <Space_Constraints_List>\n`;
  xml += `    <ConstraintBasicCompulsorySpace>\n      <Weight_Percentage>100</Weight_Percentage>\n      <Active>true</Active>\n    </ConstraintBasicCompulsorySpace>\n`;

  // 1. Subject Preferred Room Constraints
  if (constraints.subjectPreferredRooms) {
    Object.entries(constraints.subjectPreferredRooms).forEach(([subjectName, roomName]) => {
      if (roomName) {
        xml += `    <ConstraintSubjectPreferredRoom>\n`;
        xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
        xml += `      <Subject>${escapeXml(subjectName)}</Subject>\n`;
        xml += `      <Room>${escapeXml(roomName)}</Room>\n`;
        xml += `      <Active>true</Active>\n`;
        xml += `    </ConstraintSubjectPreferredRoom>\n`;
      }
    });
  }

  // 2. Activity Preferred Room Constraints
  if (constraints.activityPreferredRooms) {
    Object.entries(constraints.activityPreferredRooms).forEach(([actId, roomName]) => {
      if (roomName) {
        xml += `    <ConstraintActivityPreferredRoom>\n`;
        xml += `      <Weight_Percentage>100</Weight_Percentage>\n`;
        xml += `      <Activity_Id>${actId}</Activity_Id>\n`;
        xml += `      <Room>${escapeXml(roomName)}</Room>\n`;
        xml += `      <Active>true</Active>\n`;
        xml += `    </ConstraintActivityPreferredRoom>\n`;
      }
    });
  }

  xml += `  </Space_Constraints_List>\n\n`;
  xml += `</fet>\n`;

  return xml;
}

/**
 * Parses an uploaded raw FET XML string into a structured FET model object.
 */
export function parseFetXmlToModel(xmlContent) {
  if (!xmlContent || typeof xmlContent !== "string") {
    throw new Error("محتوى ملف FET غير صالح");
  }

  // 1. Institution Name
  const instMatch = xmlContent.match(/<Institution_Name>([^<]*)<\/Institution_Name>/i);
  const institution = instMatch ? instMatch[1].trim() : "مؤسسة تعليمية";

  // 2. Days
  const days = [];
  const dayMatches = xmlContent.matchAll(/<Days_List>([\s\S]*?)<\/Days_List>/gi);
  for (const match of dayMatches) {
    const nameMatches = match[1].matchAll(/<Day>\s*<Name>([^<]*)<\/Name>\s*<\/Day>/gi);
    for (const nm of nameMatches) {
      if (nm[1].trim()) days.push(nm[1].trim());
    }
  }

  // 3. Hours
  const hours = [];
  const hourMatches = xmlContent.matchAll(/<Hours_List>([\s\S]*?)<\/Hours_List>/gi);
  for (const match of hourMatches) {
    const nameMatches = match[1].matchAll(/<Hour>\s*<Name>([^<]*)<\/Name>\s*<\/Hour>/gi);
    for (const nm of nameMatches) {
      if (nm[1].trim()) hours.push(nm[1].trim());
    }
  }

  // 4. Subjects
  const subjects = [];
  const subjMatches = xmlContent.matchAll(/<Subjects_List>([\s\S]*?)<\/Subjects_List>/gi);
  for (const match of subjMatches) {
    const nameMatches = match[1].matchAll(/<Subject>\s*<Name>([^<]*)<\/Name>\s*<\/Subject>/gi);
    for (const nm of nameMatches) {
      if (nm[1].trim()) subjects.push(nm[1].trim());
    }
  }

  // 5. Teachers
  const teachers = [];
  const teacherMatches = xmlContent.matchAll(/<Teachers_List>([\s\S]*?)<\/Teachers_List>/gi);
  for (const match of teacherMatches) {
    const nameMatches = match[1].matchAll(/<Teacher>\s*<Name>([^<]*)<\/Name>\s*<\/Teacher>/gi);
    for (const nm of nameMatches) {
      if (nm[1].trim()) teachers.push({ name: nm[1].trim(), subject: "", targetHours: 18 });
    }
  }

  // 6. Students / Groups
  const sections = [];
  const studentsBlock = xmlContent.match(/<Students_List>([\s\S]*?)<\/Students_List>/i);
  if (studentsBlock) {
    // Check for Groups first
    const groupMatches = studentsBlock[1].matchAll(/<Group>\s*<Name>([^<]*)<\/Name>/gi);
    for (const gm of groupMatches) {
      if (gm[1].trim()) sections.push({ name: gm[1].trim(), year: "" });
    }
    // If no groups, check Years
    if (sections.length === 0) {
      const yearMatches = studentsBlock[1].matchAll(/<Year>\s*<Name>([^<]*)<\/Name>/gi);
      for (const ym of yearMatches) {
        if (ym[1].trim()) sections.push({ name: ym[1].trim(), year: ym[1].trim() });
      }
    }
  }

  // 7. Rooms
  const rooms = [];
  const roomMatches = xmlContent.matchAll(/<Rooms_List>([\s\S]*?)<\/Rooms_List>/gi);
  for (const match of roomMatches) {
    const rmMatches = match[1].matchAll(/<Room>\s*<Name>([^<]*)<\/Name>(?:\s*<Capacity>(\d+)<\/Capacity>)?/gi);
    for (const rm of rmMatches) {
      if (rm[1].trim()) {
        rooms.push({
          name: rm[1].trim(),
          type: "standard",
          capacity: rm[2] ? parseInt(rm[2]) : 40
        });
      }
    }
  }

  // 8. Activities
  const activities = [];
  const actRegex = /<Activity>([\s\S]*?)<\/Activity>/gi;
  let actMatch;
  while ((actMatch = actRegex.exec(xmlContent)) !== null) {
    const block = actMatch[1];
    const idM = block.match(/<Id>(\d+)<\/Id>/i);
    const teacherM = block.match(/<Teacher>([^<]*)<\/Teacher>/i);
    const subjM = block.match(/<Subject>([^<]*)<\/Subject>/i);
    const durM = block.match(/<Duration>(\d+)<\/Duration>/i);
    const studentsM = block.match(/<Students>([^<]*)<\/Students>/i);

    if (idM) {
      activities.push({
        id: parseInt(idM[1]),
        teacher: teacherM ? teacherM[1].trim() : "",
        subject: subjM ? subjM[1].trim() : "",
        students: studentsM ? studentsM[1].trim() : (sections[0]?.name || ""),
        duration: durM ? parseInt(durM[1]) : 1,
        active: true
      });
    }
  }

  // 9. Time Constraints: TeacherNotAvailableTimes
  const teacherNotAvailableTimes = {};
  const notAvailRegex = /<ConstraintTeacherNotAvailableTimes>([\s\S]*?)<\/ConstraintTeacherNotAvailableTimes>/gi;
  let naMatch;
  while ((naMatch = notAvailRegex.exec(xmlContent)) !== null) {
    const block = naMatch[1];
    const tNameM = block.match(/<Teacher_Name>([^<]*)<\/Teacher_Name>/i);
    if (!tNameM) continue;
    const tName = tNameM[1].trim();
    if (!teacherNotAvailableTimes[tName]) teacherNotAvailableTimes[tName] = [];

    const slotRegex = /<Day>([^<]*)<\/Day>\s*<Hour>([^<]*)<\/Hour>/gi;
    let slotM;
    while ((slotM = slotRegex.exec(block)) !== null) {
      teacherNotAvailableTimes[tName].push({
        day: slotM[1].trim(),
        hour: slotM[2].trim()
      });
    }
  }

  return {
    institution: institution || "المؤسسة التعليمية",
    days: days.length > 0 ? days : ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
    hours: hours.length > 0 ? hours : ["ح1 (08:00-09:00)", "ح2 (09:00-10:00)", "ح3 (10:00-11:00)", "ح4 (11:00-12:00)", "ح5 (13:00-14:00)", "ح6 (14:00-15:00)", "ح7 (15:00-16:00)"],
    subjects: subjects.length > 0 ? subjects : ["لغة عربية", "رياضيات", "علوم"],
    teachers: teachers.length > 0 ? teachers : [{ name: "أستاذ عام", subject: "", targetHours: 18 }],
    sections: sections.length > 0 ? sections : [{ name: "قسم 1", year: "1" }],
    rooms: rooms.length > 0 ? rooms : [{ name: "حجرة 1", type: "standard", capacity: 40 }],
    activities: activities,
    constraints: {
      teacherNotAvailableTimes,
      teacherMaxHoursDaily: {},
      teacherMaxDaysPerWeek: {},
      subjectPreferredRooms: {},
      activityPreferredRooms: {}
    }
  };
}
