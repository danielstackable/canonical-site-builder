/**********************************************************************
 *  bubble-to-astro-sync.ts
 *  ---------------------------------------------------------------
 *  Pulls Stack_Program data from Bubble, enriches it with related
 *  objects, and writes index + detail Astro pages per domain.
 *********************************************************************/

import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });


/* ------------------------------------------------------------------ */
/* 1. Types                                                            */
/* ------------------------------------------------------------------ */

interface StackProgram {
  _id: string;
  Program_slug: string;
  Program_name: string;
  Program_description: string;

  Program_domain?: string[];
  Program_educationalCredentialAwarded?: string;
  Program_educationalLevel?: string;
  Program_educationalProgramMode?: string;
  Program_programType?: string;
  Program_publisher_logo?: string;
  Program_publisher_name?: string;
  Program_publisher_url?: string;
  Program_subjectOf?: string[];
  Program_timeToComplete?: string;
  Program_url?: string;
  Program_mainEntityOfPage_sameAs?: string[];

  Program_inLanguage?: string[];
  Program_occupationalCategory?: string[];
  Program_provider?: string;

  json_ld?: unknown;
}

interface StackProvider {
  _id: string;
  Provider_name: string;
  Provider_slug: string;
  Provider_canonicalDomainEN?: string[]; // Stack.Provider: Canonical Domain (option set)
}

interface StackLanguage {
  _id: string;
  Language_name: string;
}

interface StackOccupation {
  _id: string;
  Occupation_name: string;
}

/* ------------------------------------------------------------------ */
/* 2. Config from .env                                                 */
/* ------------------------------------------------------------------ */

const API_BASE =
  process.env.BUBBLE_API_BASE ??
  (() => {
    throw new Error("BUBBLE_API_BASE is not defined");
  })();

const PROJECT_MAP: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.PROJECT_MAP ?? "{}");
  } catch {
    throw new Error("PROJECT_MAP must be valid JSON");
  }
})();

/* ------------------------------------------------------------------ */
/* 3. Utilities                                                        */
/* ------------------------------------------------------------------ */

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(absPath: string, contents: string) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, contents, "utf8");
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* 4. Bubble fetchers                                                  */
/* ------------------------------------------------------------------ */

async function fetchAllPrograms(): Promise<StackProgram[]> {
  type BubbleResp = { response: { results: StackProgram[] } };
  const data = await fetchJSON<BubbleResp>(
    `${API_BASE}/obj/Stack_Program?limit=1000`
  );
  return data.response.results;
}

async function fetchProviderById(id?: string): Promise<StackProvider | null> {
  if (!id) return null;
  type BubbleObj = { response: StackProvider };
  try {
    const data = await fetchJSON<BubbleObj>(`${API_BASE}/obj/Stack_Provider/${id}`);
    return data.response;
  } catch {
    return null;
  }
}

async function fetchLanguageById(id: string): Promise<StackLanguage | null> {
  type BubbleObj = { response: StackLanguage };
  try {
    const data = await fetchJSON<BubbleObj>(`${API_BASE}/obj/Stack_Language/${id}`);
    return data.response;
  } catch {
    return null;
  }
}

async function fetchOccupationById(id: string): Promise<StackOccupation | null> {
  type BubbleObj = { response: StackOccupation };
  try {
    const data = await fetchJSON<BubbleObj>(`${API_BASE}/obj/Stack_Occupation/${id}`);
    return data.response;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 5. Enrichment                                                       */
/* ------------------------------------------------------------------ */

async function enrichProgram(p: StackProgram) {
  const provider = await fetchProviderById(p.Program_provider);
  const providerName = provider?.Provider_name ?? undefined;
  const Provider_slug = provider?.Provider_slug ?? "unknown-provider";
  const Provider_canonicalDomainEN = provider?.Provider_canonicalDomainEN ?? [];

  const langIds = p.Program_inLanguage ?? [];
  const langNames = (
    await Promise.all(langIds.map((id) => fetchLanguageById(id)))
  )
    .filter(Boolean)
    .map((l) => l!.Language_name);

  const occIds = p.Program_occupationalCategory ?? [];
  const occNames = (
    await Promise.all(occIds.map((id) => fetchOccupationById(id)))
  )
    .filter(Boolean)
    .map((o) => o!.Occupation_name);

  return {
    ...p,
    providerName,
    Provider_slug,
    Provider_canonicalDomainEN,
    langNames,
    occNames
  };
}

/* ------------------------------------------------------------------ */
/* 6. Astro page templates                                             */
/* ------------------------------------------------------------------ */

function detailAstro(p: ReturnType<typeof enrichProgram> extends Promise<infer U> ? U : never): string {
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

function indexAstro(
  programs: (StackProgram & { Provider_slug: string })[],
  domain: string
): string {
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

(async () => {
  const rawPrograms = await fetchAllPrograms();
  const enrichedPrograms = await Promise.all(rawPrograms.map(enrichProgram));

  const byDomain: Record<string, typeof enrichedPrograms> = {};

  for (const p of enrichedPrograms) {
    const domains = p.Provider_canonicalDomainEN ?? [];
    for (const domain of domains) {
      if (!byDomain[domain]) byDomain[domain] = [];
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
      const detailPath = path.join(
        root,
        "src",
        "pages",
        p.Provider_slug,
        p.Program_slug,
        "index.astro"
      );
      writeFile(detailPath, detailAstro(p));
    }

    // index page
    writeFile(path.join(root, "src", "pages", "index.astro"), indexAstro(programs, domain));

    console.log(`✓ Wrote ${programs.length} pages for ${domain}`);
  }
})();
