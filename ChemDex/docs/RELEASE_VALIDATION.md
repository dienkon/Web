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
| Browser integration | Chromium, Edge and WebKit: 22 passed, 2 deliberate Chromium-only inspection skips |
| Windows Firefox | Browser process fails before startup due to local mozglue side-by-side assembly error; Ubuntu CI verifies this engine separately |
| Production packaging | Seven child apps built; development source, environment files and server bundles excluded |

Lighthouse 13.5.0 simulated mobile, local production package at port 4173, median of three identically configured runs:

| Route | Performance | Accessibility | Approximate LCP |
| --- | --- | --- | --- |
| `/` | 98 | 96 | 1.96 s |
| `/tien-ich/` | 99 | 100 | 1.76 s |

Browser rendering benchmark: Windows x64, Intel Core i5-12450HX, Intel UHD Graphics through ANGLE D3D11, 1440×900 viewport. After a 15-second shader/adaptation warmup and 30 frames, 119 RAF intervals measured caffeine rotation at 60.00 FPS and the default three-vessel lab scene at 60.00 FPS (p95 frame duration 16.7 ms). This is a sustained default-scene benchmark, not a guarantee for every experiment or device. Software SwiftShader rendering is much slower; automatic quality starts at the lightest tier on that renderer. Commands and measurement scripts are in [PLATFORM_UPGRADE.md](PLATFORM_UPGRADE.md).

Detailed generated measurements remain under ignored `artifacts/platform/`; they are not website assets. Coordinate provenance is recorded per structure in `shared/compounds.json`, with NIST references retained in `shared/nist-geometries.json`.

## Release gates and rollback

- GitHub source baseline: `3c17731`; clean-install dependency correction: `3acdc48`.
- Vercel correctly built `3acdc48` as a Preview in the existing `chem-dex` project. Its deployment ID is `CKKWne4kuaShaiFzaopBWeY7yRHu`; URL: https://chem-bs5pgqmht-duongthanhdien3456-2621s-projects.vercel.app.
- That Preview currently redirects to Vercel Authentication. Application checks against it remain pending authenticated access. A successful build is not counted as a passing remote browser check.
- The first clean Linux CI run exposed floating-point aggregate residue after full water depletion. The correction uses authoritative water contents at complete depletion, retains real trace inventories and has regression tests. A clean CI rerun is required before promotion.
- Production has not yet been promoted by this upgrade. Existing production source: `dfd08c24dd8fa2b5677646b7e5549055f2d82b36`; previous successful deployment: https://chem-obarvp7mg-duongthanhdien3456-2621s-projects.vercel.app (GitHub deployment `7328219991`).
- After all gates pass, fast-forward the verified production branch, confirm `/api/health` reports the new commit, and test public routes/assets and chemistry APIs. The rollback target is the recorded previous deployment, promoted through Vercel; do not rewrite Git history.

## External account action

The old embedded AI fallback credential has been removed. A read-only Google request rejected it with HTTP 401 / `ACCESS_TOKEN_TYPE_UNSUPPORTED`; this does **not** verify account-level revocation. Revocation/rotation in the issuing account remains unverified and requires that account's access. No credential values are included in this report or the public build.
