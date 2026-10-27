# ChemDex release validation

Updated: 2026-10-27. Feature branch: `codex/chemdex-platform-upgrade`.

## Verified locally

| Check | Result |
| --- | --- |
| Shared dataset | 118 elements, 58 curated structures, all 95 lab chemicals classified |
| Guided learning | 20 lab experiments, 60 questions with explanations |
| Lab-2D TypeScript / tests | Passed / 88 tests passed |
| Lab-3D TypeScript / tests | Passed / 1,911 tests passed across 166 files |
| Safety tests | Academy and practical workflow audits passed |
| Platform / API | TypeScript passed; 6 platform tests passed |
| Browser integration | Chromium, Edge and WebKit: 28 passed, 2 deliberate Chromium-only inspection skips; repeated successfully against authenticated Vercel Preview |
| Clean Linux CI | Node 22, all seven builds, lab/safety/API tests and Chromium/Firefox/WebKit: passed; 26 browser checks passed, 4 deliberate Chromium-only inspection skips |
| Tablet / modal | 768 px layout fits viewport; native structure dialog closes using Escape |
| Hidden canvas | WebGL draw calls stop while hidden and resume when visible |
| Windows Firefox | Browser process fails before startup due to local mozglue side-by-side assembly error; Ubuntu CI verifies this engine separately |
| Production packaging | Seven child apps built; development source, environment files and server bundles excluded |

Lighthouse 13.5.0 simulated mobile, local production package at port 4173, median of three identically configured runs:

| Route | Performance | Accessibility | Approximate LCP |
| --- | --- | --- | --- |
| `/` | 98 | 96 | 1.96 s |
| `/tien-ich/` | 99 | 100 | 1.76 s |

Browser rendering benchmark: Windows x64, Intel Core i5-12450HX, Intel UHD Graphics through ANGLE D3D11, 1440×900 viewport. After a 15-second shader/adaptation warmup and 30 frames, 119 RAF intervals measured caffeine rotation at 60.00 FPS and the default three-vessel lab scene at 60.00 FPS (p95 frame duration 16.7–16.8 ms). This is a sustained default-scene benchmark, not a guarantee for every experiment or device. Software SwiftShader rendering is much slower; automatic quality starts at the lightest tier on that renderer. Commands and measurement scripts are in [PLATFORM_UPGRADE.md](PLATFORM_UPGRADE.md).

Detailed generated measurements remain under ignored `artifacts/platform/`; they are not website assets. Coordinate provenance is recorded per structure in `shared/compounds.json`, with NIST references retained in `shared/nist-geometries.json`.

## Release gates and rollback

- Verified runtime source: `0cc08947d0b77fda345c13a5957e9c6d423b98f5`. [Clean CI run](https://github.com/dienkon/Web/actions/runs/40462772408) passed.
- Verified Vercel Preview: https://chem-ciqu4aqjn-duongthanhdien3456-2621s-projects.vercel.app, deployment `dpl_DDrdB3tXd8Xjf75uTdjjMvRqXt3J`. The full authenticated Chromium/Edge/WebKit suite passed with 28 checks and 2 intentional skips.
- Vercel CLI authentication was completed by the project owner. The project settings now explicitly specify Node 22, `npm ci`, `npm run build`, and output `dist`; Git production branch is verified as `main`. Server environment contains `GEMINI_API_KEY` (value not logged).
- Remote checks confirmed health JSON and release SHA, input errors as JSON, actual PubChem formula/isomer results, H₂O 3D, NaCl 2D, center deep links, legacy lab redirects, and genuine 404 responses for missing assets. The server-side AI endpoint also returned a successful response. That transport check does not validate every AI-generated scientific answer.
- Standalone API routing uses `api/dispatch.ts` with explicit rewrites for both slash variants; it does not rely on Next.js catch-all filename semantics. Document fallbacks exclude filenames with extensions.
- The Linux full-depletion regression is fixed and passed in clean CI. Complete depletion follows authoritative water contents; real trace inventories remain intact.
- Rollback source: `dfd08c24dd8fa2b5677646b7e5549055f2d82b36`; previous successful production deployment: https://chem-obarvp7mg-duongthanhdien3456-2621s-projects.vercel.app, Vercel ID `dpl_BZ9qRStbXzCFfHUJBY2VQuhTau9W` (GitHub deployment `7328219991`).
- Release procedure: fast-forward `main` after validation, verify the resulting deployment and `/api/health` SHA at https://chem-dex.vercel.app, then repeat public browser/API smoke checks. Final production commit/deployment results belong in the release record, because this report is committed before promotion.
- Rollback: select the recorded previous deployment in the same Vercel project and promote it (or run `vercel rollback <previous-deployment-url>` with that project's scope). Do not rewrite Git history. Verify the public alias and health after rollback.

## External account action

The old embedded AI fallback credential has been removed. A read-only Google request rejected it with HTTP 401 / `ACCESS_TOKEN_TYPE_UNSUPPORTED`; this does **not** verify account-level revocation. Revocation/rotation in the issuing account remains unverified and requires that account's access. No credential values are included in this report or the public build.
