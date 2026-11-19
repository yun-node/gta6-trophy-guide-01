// Leonida Legend — a GTA VI trophy guide & tracker, entered in make.fun's
// gta6-trophy-guide-01 bounty. The guide itself is this directory's app/ folder:
// plain static files (index.html, style.css, app.js, data/trophies.json) with no
// build step, served by any static server with app/ at its root and working with
// the network off. This program hands the entry in: it copies app/ and
// screenshots/ from beside this file to the output directory and writes
// dossier.json there with the vendored make.fun library, buildDossier. It is
// deterministic — the same inputs always produce the same bytes — so running it
// twice writes identical output. vendor/makefun-frontend.ts is the kit's copy
// and is left unchanged: the scorer rebuilds the dossier with its own copy and
// compares the two byte for byte.
//
// Run it locally (Node 22, standard library only) from the repository root:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a second run writes exactly the same
// bytes as the first (no stale files from an earlier, different entry).
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
