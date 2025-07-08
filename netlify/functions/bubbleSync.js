"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const node_child_process_1 = require("node:child_process");
const handler = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Starting Bubble sync...");
    try {
        // 1. Install deps (optional, on ephemeral container)
        // execSync("pnpm install", { stdio: "inherit" });
        // 2. Run your sync script
        (0, node_child_process_1.execSync)("pnpm ts-node scripts/bubble-to-astro-sync.ts", { stdio: "inherit" });
        // 3. Commit and push changes (if needed)
        (0, node_child_process_1.execSync)("git config user.name 'Netlify Bot'");
        (0, node_child_process_1.execSync)("git config user.email 'bot@netlify.com'");
        (0, node_child_process_1.execSync)("git add .");
        (0, node_child_process_1.execSync)("git commit -m 'Netlify scheduled Bubble sync' || echo 'No changes'");
        (0, node_child_process_1.execSync)("git push");
        console.log("✅ Bubble sync completed");
        return {
            statusCode: 200,
            body: "Bubble sync completed."
        };
    }
    catch (err) {
        console.error("❌ Bubble sync failed:", err.message);
        return {
            statusCode: 500,
            body: `Error: ${err.message}`
        };
    }
});
exports.handler = handler;
