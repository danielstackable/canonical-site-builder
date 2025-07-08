import { Handler } from "@netlify/functions";
import { execSync } from "node:child_process";

export const handler: Handler = async () => {
  console.log("Starting Bubble sync...");

  try {
    // 1. Install deps (optional, on ephemeral container)
    // execSync("pnpm install", { stdio: "inherit" });

    // 2. Run your sync script
    execSync("pnpm ts-node scripts/bubble-to-astro-sync.ts", { stdio: "inherit" });

    // 3. Commit and push changes (if needed)
    execSync("git config user.name 'Netlify Bot'");
    execSync("git config user.email 'bot@netlify.com'");
    execSync("git add .");
    execSync("git commit -m 'Netlify scheduled Bubble sync' || echo 'No changes'");
    execSync("git push");

    console.log("✅ Bubble sync completed");
    return {
      statusCode: 200,
      body: "Bubble sync completed."
    };
  } catch (err: any) {
    console.error("❌ Bubble sync failed:", err.message);
    return {
      statusCode: 500,
      body: `Error: ${err.message}`
    };
  }
};
