# DkTEST development requirements

Follow the parent Git workflow: work and commit directly on `main` unless the user requests another branch or worktree.

## Versioning and audits (user requirement, 2026-11-08)

Every subsequent improvement or fix must include:

1. A higher version in `release.json`; increase `androidVersionCode` whenever an APK changes. Vite and Android must read this same file.
2. A versioned entry in `CHANGELOG.md` and the current version in `README.md`.
3. A detailed report in `docs/audits/<version>.md`: scope, findings, changes, Firestore read budget, security boundaries, tests and actual results, remaining risks, and deployment/migration prerequisites. Distinguish implemented code from deployed production state and real-device verification.
4. Run `npm run check:release` and checks appropriate to the change. Record failures and limitations honestly; do not claim an APK was tested on a phone unless it was.

Never commit tokens, service-account keys, signing keys, APKs, generated bundles, or private candidate data. Do not weaken server checks or Firestore rules to make a client workflow pass.
