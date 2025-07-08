"use strict";
/**********************************************************************
 *  bubble-to-astro-sync.ts
 *  ---------------------------------------------------------------
 *  Pulls Stack_Program data from Bubble, enriches it with related
 *  objects, and writes index + detail Astro pages per domain.
 *********************************************************************/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/* ------------------------------------------------------------------ */
/* 2. Config from .env                                                 */
/* ------------------------------------------------------------------ */
const API_BASE = (_a = process.env.BUBBLE_API_BASE) !== null && _a !== void 0 ? _a : (() => {
    throw new Error("BUBBLE_API_BASE is not defined");
})();
const PROJECT_MAP = (() => {
    var _a;
    try {
        return JSON.parse((_a = process.env.PROJECT_MAP) !== null && _a !== void 0 ? _a : "{}");
    }
    catch (_b) {
        throw new Error("PROJECT_MAP must be valid JSON");
    }
})();
/* ------------------------------------------------------------------ */
/* 3. Utilities                                                        */
/* ------------------------------------------------------------------ */
function ensureDir(dir) {
    if (!node_fs_1.default.existsSync(dir))
        node_fs_1.default.mkdirSync(dir, { recursive: true });
}
function writeFile(absPath, contents) {
    ensureDir(node_path_1.default.dirname(absPath));
    node_fs_1.default.writeFileSync(absPath, contents, "utf8");
}
function fetchJSON(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield (0, node_fetch_1.default)(url);
        if (!res.ok)
            throw new Error(`${url} → ${res.status}`);
        return (yield res.json());
    });
}
/* ------------------------------------------------------------------ */
/* 4. Bubble fetchers                                                  */
/* ------------------------------------------------------------------ */
function fetchAllPrograms() {
    return __awaiter(this, void 0, void 0, function* () {
        const data = yield fetchJSON(`${API_BASE}/obj/Stack_Program?limit=1000`);
        return data.response.results;
    });
}
function fetchProviderById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!id)
            return null;
        try {
            const data = yield fetchJSON(`${API_BASE}/obj/Stack_Provider/${id}`);
            return data.response;
        }
        catch (_a) {
            return null;
        }
    });
}
function fetchLanguageById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield fetchJSON(`${API_BASE}/obj/Stack_Language/${id}`);
            return data.response;
        }
        catch (_a) {
            return null;
        }
    });
}
function fetchOccupationById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield fetchJSON(`${API_BASE}/obj/Stack_Occupation/${id}`);
            return data.response;
        }
        catch (_a) {
            return null;
        }
    });
}
/* ------------------------------------------------------------------ */
/* 5. Enrichment                                                       */
/* ------------------------------------------------------------------ */
function enrichProgram(p) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const provider = yield fetchProviderById(p.Program_provider);
        const providerName = (_a = provider === null || provider === void 0 ? void 0 : provider.Provider_name) !== null && _a !== void 0 ? _a : undefined;
        const Provider_slug = (_b = provider === null || provider === void 0 ? void 0 : provider.Provider_slug) !== null && _b !== void 0 ? _b : "unknown-provider";
        const Provider_canonicalDomainEN = (_c = provider === null || provider === void 0 ? void 0 : provider.Provider_canonicalDomainEN) !== null && _c !== void 0 ? _c : [];
        const langIds = (_d = p.Program_inLanguage) !== null && _d !== void 0 ? _d : [];
        const langNames = (yield Promise.all(langIds.map((id) => fetchLanguageById(id))))
            .filter(Boolean)
            .map((l) => l.Language_name);
        const occIds = (_e = p.Program_occupationalCategory) !== null && _e !== void 0 ? _e : [];
        const occNames = (yield Promise.all(occIds.map((id) => fetchOccupationById(id))))
            .filter(Boolean)
            .map((o) => o.Occupation_name);
        return Object.assign(Object.assign({}, p), { providerName,
            Provider_slug,
            Provider_canonicalDomainEN,
            langNames,
            occNames });
    });
}
/* ------------------------------------------------------------------ */
/* 6. Astro page templates                                             */
/* ------------------------------------------------------------------ */
function detailAstro(p) {
    return `---
/* ⚠️ AUTO‑GENERATED — DO NOT EDIT BY HAND. */
const program = ${JSON.stringify(p, null, 2)};
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{program.Program_name}</title>
    <script type="application/ld+json">{JSON.stringify(program.json_ld)}</script>
  </head>
  <body>
    <h1>{program.Program_name}</h1>
    <p>{program.Program_description}</p>

    {program.providerName && <p><strong>Provider:</strong> {program.providerName}</p>}
    {program.Provider_canonicalDomainEN?.length && <p><strong>Canonical Domains:</strong> {program.Provider_canonicalDomainEN.join(", ")}</p>}
    {program.langNames.length && <p><strong>Language(s):</strong> {program.langNames.join(", ")}</p>}
    {program.occNames.length && <p><strong>Occupation(s):</strong> {program.occNames.join(", ")}</p>}

    {program.Program_educationalCredentialAwarded && <p><strong>Credential:</strong> {program.Program_educationalCredentialAwarded}</p>}
    {program.Program_educationalLevel && <p><strong>Level:</strong> {program.Program_educationalLevel}</p>}
    {program.Program_educationalProgramMode && <p><strong>Mode:</strong> {program.Program_educationalProgramMode}</p>}
    {program.Program_programType && <p><strong>Type:</strong> {program.Program_programType}</p>}

    <p><a href="/">← Back to all programs</a></p>
  </body>
</html>`;
}
function indexAstro(programs, domain) {
    const items = programs
        .map((p) => `<li><a href="/${p.Provider_slug}/${p.Program_slug}/">${p.Program_name}</a></li>`)
        .join("\n        ");
    return `---
/* ⚠️ AUTO‑GENERATED — DO NOT EDIT BY HAND. */
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Programs for ${domain}</title>
  </head>
  <body>
    <h1>Available Programs for ${domain}:</h1>
    <ul>
        ${items}
    </ul>
  </body>
</html>`;
}
/* ------------------------------------------------------------------ */
/* 7. Main logic                                                       */
/* ------------------------------------------------------------------ */
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const rawPrograms = yield fetchAllPrograms();
    const enrichedPrograms = yield Promise.all(rawPrograms.map(enrichProgram));
    const byDomain = {};
    for (const p of enrichedPrograms) {
        const domains = (_a = p.Provider_canonicalDomainEN) !== null && _a !== void 0 ? _a : [];
        for (const domain of domains) {
            if (!byDomain[domain])
                byDomain[domain] = [];
            byDomain[domain].push(p);
        }
    }
    for (const [domain, programs] of Object.entries(byDomain)) {
        const root = PROJECT_MAP[domain];
        if (!root) {
            console.warn(`No Astro project mapped for domain ${domain}`);
            continue;
        }
        // detail pages
        for (const p of programs) {
            const detailPath = node_path_1.default.join(root, "src", "pages", p.Provider_slug, p.Program_slug, "index.astro");
            writeFile(detailPath, detailAstro(p));
        }
        // index page
        writeFile(node_path_1.default.join(root, "src", "pages", "index.astro"), indexAstro(programs, domain));
        console.log(`✓ Wrote ${programs.length} pages for ${domain}`);
    }
}))();
