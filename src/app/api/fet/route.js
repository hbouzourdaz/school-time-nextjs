import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";

// Determine FET engine path based on environment or OS
const isWindows = os.platform() === "win32";
const FET_CL_PATH = process.env.FET_CL_PATH || (isWindows 
  ? String.raw`C:\Users\Hakim Bouzourdaz\Downloads\fet-7.10.0\fet-7.10.0\fet-cl.exe` 
  : "fet-cl"); // In Linux (Docker), 'fet-cl' will be in the system PATH after apt-get install


function runFetEngine(inputFilePath, outputDirPath, timeLimitSeconds = 300) {
  return new Promise((resolve, reject) => {
    const cmd = `"${FET_CL_PATH}" --inputfile="${inputFilePath}" --outputdir="${outputDirPath}" --timelimitseconds=${timeLimitSeconds} --language=ar --writetimetablesxml=true --writetimetablesdayshorizontal=true --writetimetablesdaysvertical=false --writetimetablestimehorizontal=false --writetimetablestimevertical=false`;

    exec(cmd, { timeout: (timeLimitSeconds + 30) * 1000 }, (error, stdout, stderr) => {
      const output = (stdout || "") + (stderr || "");

      if (output.includes("Generation successful") || output.includes("generation successful")) {
        resolve({ success: true, output });
      } else if (output.includes("Generation impossible") || output.includes("Impossible")) {
        reject(new Error("فشل التوليد: لم يجد المحرك حلاً ممكناً مع القيود المحددة.\n" + output));
      } else if (error) {
        reject(new Error("خطأ في تشغيل محرك FET:\n" + output));
      } else {
        // Some edge cases might still succeed
        resolve({ success: true, output });
      }
    });
  });
}

function parseActivitiesXml(xmlContent) {
  // Simple regex-based XML parser for the activities output
  const activities = [];
  const activityRegex = /<Activity>\s*<Id>(\d+)<\/Id>\s*<Day>([^<]*)<\/Day>\s*<Hour>([^<]*)<\/Hour>\s*(?:<Room>([^<]*)<\/Room>\s*)?(?:<Room>([^<]*)<\/Room>\s*)?<\/Activity>/g;
  let match;
  while ((match = activityRegex.exec(xmlContent)) !== null) {
    activities.push({
      id: parseInt(match[1]),
      day: match[2],
      hour: match[3],
      room: match[4] || ""
    });
  }
  return activities;
}

function parseInputActivities(xmlContent) {
  // Parse the original .fet file to get activity details (teacher, subject, students)
  const activities = {};
  const actRegex = /<Activity>\s*([\s\S]*?)<\/Activity>/g;
  let match;
  while ((match = actRegex.exec(xmlContent)) !== null) {
    const block = match[1];

    const idMatch = block.match(/<Id>(\d+)<\/Id>/);
    if (!idMatch) continue;
    const id = parseInt(idMatch[1]);

    const teacherMatch = block.match(/<Teacher>([^<]*)<\/Teacher>/);
    const subjectMatch = block.match(/<Subject>([^<]*)<\/Subject>/);
    const durationMatch = block.match(/<Duration>(\d+)<\/Duration>/);

    // Multiple students tags possible
    const studentsMatches = [...block.matchAll(/<Students>([^<]*)<\/Students>/g)];
    const students = studentsMatches.map(m => m[1]).join(" + ");

    activities[id] = {
      teacher: teacherMatch ? teacherMatch[1] : "",
      subject: subjectMatch ? subjectMatch[1] : "",
      students,
      duration: durationMatch ? parseInt(durationMatch[1]) : 1
    };
  }
  return activities;
}

export async function POST(req) {
  let tmpDir = "";
  let inputFilePath = "";

  try {
    const data = await req.json();
    const xmlContent = data.xmlContent;
    const timeLimit = data.timeLimit || 300;
    const runId = data.runId || Date.now().toString();

    tmpDir = path.join(os.tmpdir(), "fet-run-" + runId);

    if (!xmlContent) {
      return Response.json({ success: false, error: "لم يتم إرسال محتوى الملف." }, { status: 400 });
    }

    // Check that FET engine exists (only check if it's an absolute path, like on Windows)
    if (path.isAbsolute(FET_CL_PATH) && !fs.existsSync(FET_CL_PATH)) {
      return Response.json({
        success: false,
        error: `لم يتم العثور على محرك FET في المسار: ${FET_CL_PATH}`
      }, { status: 500 });
    }

    // Create temp dir and write input file
    fs.mkdirSync(tmpDir, { recursive: true });
    inputFilePath = path.join(tmpDir, "input.fet");
    fs.writeFileSync(inputFilePath, xmlContent, "utf-8");

    const outputDir = path.join(tmpDir, "output");
    fs.mkdirSync(outputDir, { recursive: true });

    // Run the real FET engine
    const result = await runFetEngine(inputFilePath, outputDir, timeLimit);

    // Find the generated activities XML file
    const timetablesDir = path.join(outputDir, "timetables");
    if (!fs.existsSync(timetablesDir)) {
      return Response.json({ success: false, error: "لم يتم العثور على مجلد الجداول الناتجة." }, { status: 500 });
    }

    // Find the subdirectory (named after the input file base)
    const subdirs = fs.readdirSync(timetablesDir);
    if (subdirs.length === 0) {
      return Response.json({ success: false, error: "لم يتم إنتاج أي ملفات." }, { status: 500 });
    }

    const resultDir = path.join(timetablesDir, subdirs[0]);

    // Find _activities.xml
    const files = fs.readdirSync(resultDir);
    const activitiesFile = files.find(f => f.endsWith("_activities.xml"));
    const dataAndTimetableFile = files.find(f => f.endsWith("_data_and_timetable.fet"));

    if (!activitiesFile) {
      return Response.json({ success: false, error: "لم يتم العثور على ملف الأنشطة المجدولة." }, { status: 500 });
    }

    // Parse the solved activities XML
    const activitiesXmlContent = fs.readFileSync(path.join(resultDir, activitiesFile), "utf-8");
    const solvedActivities = parseActivitiesXml(activitiesXmlContent);

    // Parse the original input to get activity details
    const inputActivities = parseInputActivities(xmlContent);

    // Merge solved schedule with original activity data
    const timetable = solvedActivities.map(solved => {
      const original = inputActivities[solved.id] || {};
      return {
        id: String(solved.id),
        day: solved.day,
        hour: solved.hour,
        room: solved.room,
        teacher: original.teacher || "",
        subject: original.subject || "",
        students: original.students || "",
        duration: original.duration || 1
      };
    });

    // Read the data_and_timetable.fet (the complete result file) if available
    let resultFetContent = "";
    if (dataAndTimetableFile) {
      resultFetContent = fs.readFileSync(path.join(resultDir, dataAndTimetableFile), "utf-8");
    }

    // Collect HTML file list
    const htmlFiles = {};
    files.filter(f => f.endsWith(".html")).forEach(f => {
      htmlFiles[f] = fs.readFileSync(path.join(resultDir, f), "utf-8");
    });

    // Read soft conflicts
    const softConflictsFile = files.find(f => f.endsWith("_soft_conflicts.txt"));
    let softConflicts = "";
    if (softConflictsFile) {
      softConflicts = fs.readFileSync(path.join(resultDir, softConflictsFile), "utf-8");
    }

    return Response.json({
      success: true,
      timetable,
      resultFetContent,
      htmlFiles,
      softConflicts,
      engineOutput: result.output,
      stats: {
        totalActivities: Object.keys(inputActivities).length,
        scheduledSlots: solvedActivities.length,
      }
    });

  } catch (error) {
    console.error("FET Engine error:", error);
    return Response.json({
      success: false,
      error: error.message || "حدث خطأ غير متوقع."
    }, { status: 500 });

  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}
