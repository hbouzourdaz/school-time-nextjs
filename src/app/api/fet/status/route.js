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
  const maxPlacedFile = path.join(tmpDir, "output", "logs", "max_placed_activities.txt");

  try {
    if (fs.existsSync(maxPlacedFile)) {
      const content = fs.readFileSync(maxPlacedFile, "utf8");
      // Extract the last number from the file using regex
      const nums = content.match(/\d+/g);
      if (nums && nums.length > 0) {
        const placed = parseInt(nums[nums.length - 1], 10);
        return Response.json({ success: true, placed });
      }
    }
    
    // File not created yet, or no numbers
    return Response.json({ success: true, placed: 0 });
  } catch (error) {
    console.error("Status check error:", error);
    return Response.json({ success: false, error: "Failed to read status" }, { status: 500 });
  }
}
