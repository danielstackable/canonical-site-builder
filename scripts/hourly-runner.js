"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const child_process_1 = require("child_process");
console.log("🕒 Minutely sync scheduler started...");
// Run every minute
node_cron_1.default.schedule("* * * * *", () => {
    console.log("🔄 Running sync at", new Date().toISOString());
    (0, child_process_1.exec)("pnpm ts-node scripts/bubble-to-astro-sync.ts", (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Sync failed:", err.message);
            return;
        }
        if (stderr)
            console.error("⚠️ stderr:", stderr);
        if (stdout)
            console.log("✅ stdout:", stdout);
    });
});
