import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return Response.json({ success: false, error: "Missing runId" }, { status: 400 });
  }

  const tmpDir = path.join(os.tmpdir(), "fet-run-" + runId);
  const resultFilePath = path.join(tmpDir, "job_result.json");
  const maxPlacedFile = path.join(tmpDir, "output", "logs", "max_placed_activities.txt");

  try {
    // 1. Check if the job finished (completed or failed)
    if (fs.existsSync(resultFilePath)) {
      const resultData = JSON.parse(fs.readFileSync(resultFilePath, "utf-8"));
      return Response.json(resultData);
    }

    // 2. If still running, get the latest real-time placed activities count
    let placed = 0;
    if (fs.existsSync(maxPlacedFile)) {
      const content = fs.readFileSync(maxPlacedFile, "utf8");
      const nums = content.match(/\d+/g);
      if (nums && nums.length > 0) {
        placed = parseInt(nums[nums.length - 1], 10);
      }
    }

    return Response.json({
      success: true,
      status: "running",
      placed
    });
  } catch (error) {
    console.error("Status check error:", error);
    return Response.json({ success: false, error: "Failed to read status" }, { status: 500 });
  }
}
