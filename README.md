# ZPC Manufacturing Workspace

A browser-based CNC setup sheet workspace, styled after [Zero Point Cryogenics](https://www.zpcryo.com) and informed by the browser-first architecture in the Valve-Database configurator project.

## Features

- New setup sheet opens a blank editor directly, with one initial operation and no prefilled tools or machining instructions.
- Reference-style machinist setup forms: part/material information and stock source, operation count, bordered workholding and tooling tables, operation notes, and lessons learned.
- Add, edit, reorder, and remove up to 50 operations per sheet. Each operation has its own machine, program, fixture, jaws/clamping, part stick-out, datum, setup notes, and machining notes.
- Photos can be assigned to an operation and categorized as setup, fixture/soft jaws, or finished part. Links survive operation reordering; removing an operation keeps its photos as general photos.
- Special tooling requirements, cutting data, inspection checks.
- Legacy single-operation sheets and backups migrate automatically without deleting saved information.
- Camera capture on supported phones, photo attachment and captions, and reference PDF attachment.
- Search by name, part, machine, material, operation, or program; machine and status filters; sorting; grid/list views.
- IndexedDB persistence for sheets, photos, and files; duplicate and delete; editable JSON export/import and whole-workspace backups.
- Document preview, print, and direct PDF download with paginated instructions and embedded photos.
- Google Drive sign-in, explicit snapshot uploads, and restore to a new local copy. Snapshots contain an editable JSON sheet, PDF, separate photos, and attached PDFs.
- Three removable, clearly labeled example sheets. No real manufacturing information is committed.

## Run locally

Use Node.js 22+ and Python 3:

```sh
npm run check
npm test
npm start
```

Open http://localhost:4173. There is no build step or runtime package dependency. Fonts and the Google sign-in script load from Google; the document workspace itself runs locally in the browser.

## GitHub Pages

The workflow at `.github/workflows/pages.yml` checks JavaScript, tests PDF generation, uploads only `site/`, and publishes with the official Pages actions on every push to `main`.

Expected URL once deployment succeeds: **https://josephspratt-3d.github.io/ZPC/**

If automatic Pages enablement is denied, open [repository Pages settings](https://github.com/JosephSpratt-3D/ZPC/settings/pages), choose **GitHub Actions** under Build and deployment, then rerun **Deploy manufacturing workspace**. Private repository Pages requires an eligible GitHub plan. Do not change repository visibility to work around this without considering the source visibility you want.

GitHub Pages hosts the app shell. Sheets and photos are never committed to GitHub by the app. A normal Pages deployment may be publicly accessible even when its source repository is private; the app shell contains only example data and templates.

## Connect Google Drive

Visitors open Google Drive and select **Connect with Google**. They choose a Google account and authorize the `drive.file` permission; no client-ID input is shown.

The site owner must complete one-time Google Cloud setup before the button can be activated:

1. Enable Google Drive API in a Google Cloud project.
2. Configure Google Auth platform Branding and Audience. For External / Testing, add the intended Google accounts as test users.
3. Create an OAuth **Web application** client with `https://josephspratt-3d.github.io` as an authorized JavaScript origin (without `/ZPC/`). Add `http://localhost:4173` or `http://localhost:4174` only if needed for local testing.
4. Set the public client ID in `site/google-config.js` and commit it. Never add a client secret. GitHub Pages redeploys automatically.

Until a client ID is configured, the connection button stays disabled with a setup-pending message. A ChatGPT Google connection cannot provide authentication to this independent website.

Access tokens remain only in memory. Connect again after reloading or when the token expires. Google Drive files stay private unless the account owner changes sharing. Uploads create a snapshot folder containing editable JSON, a PDF, photos, and reference PDFs. Restore creates a new local sheet. Failed uploads can leave partial folders; retrying creates a separate snapshot.

## Storage and document limits

- Local documents stay on this browser/device; clearing site data removes them. Use Drive or editable exports for durable copies.
- This first draft does not provide a shared team database, automatic synchronization, access-control system, revision approval process, or simultaneous editing.
- Ready is a manual workflow label, not an engineering approval. Review all setup and cutting information before production.
- Up to 30 photos and 100 tool entries per sheet; photos are resized to 1600 px and converted to JPEG. Reference PDFs are limited to 10 MB each, 10 per sheet. Backups accept up to 100 MB.
- PDFs list reference attachment names; reference PDFs remain separate files in backups and Drive, rather than being merged into the generated setup PDF.
- Direct PDF download uses standard Latin fonts; use Print → Save as PDF for other scripts.

## Updated document layout

The editor, preview, print view, and direct PDF download include the operations added to each sheet. PDF tables repeat headings on continuation pages and split unusually long notes without truncating text. Existing JSON/Drive snapshots remain compatible; the additive operations fields are included in new backups.

## Validation

`npm test` checks long-document PDF pagination and byte offsets, imported photo data validation, legacy migration, and long multi-operation tables. `tests/operations.cjs` additionally exercises operation creation, reordering, removal, photo associations, tooling requirements, save/reload, and phone layouts. Browser QA exercised sheet creation, tool editing, photo upload/captions, IndexedDB persistence across reload, search, preview, PDF download, and mobile overflow. The exported PDF was also parsed with `pdfinfo`. Camera hardware and Google authorization require testing on an authorized device/account.

Photo handling uses a DOM-attached native picker and native image decoding with an ImageBitmap fallback. Photos added to a named sheet are saved immediately; unsupported formats show an inline error. PDF downloads use embedded Liberation Sans fonts, a branded header, numbered sections, shaded tables, and framed photo grids. Font license: `site/licenses/liberation-fonts.txt`.

Optional browser regression script: `tests/browser.cjs` requires Playwright and a Chromium executable. It is a development check, not part of deployment.

The logo asset is from the user's referenced Zero Point Cryogenics website, used for this ZPC workspace.
