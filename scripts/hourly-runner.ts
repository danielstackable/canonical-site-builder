import cron from "node-cron";
import { exec } from "child_process";

console.log("🕒 Minutely sync scheduler started...");

// Run every minute
cron.schedule("* * * * *", () => {
  console.log("🔄 Running sync at", new Date().toISOString());
  exec("pnpm ts-node scripts/bubble-to-astro-sync.ts", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Sync failed:", err.message);
      return;
    }
    if (stderr) console.error("⚠️ stderr:", stderr);
    if (stdout) console.log("✅ stdout:", stdout);
  });
});
