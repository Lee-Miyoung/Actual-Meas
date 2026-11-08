# Mobile comparison repair — 2026-11-08

The saved `brandOutput.fit=contain` option bypassed the platform renderer and called the older card renderer. This made the comparison ignore proposed copy and layout. All fit modes now use the same platform renderer. Contain fits the entire source photo inside its designated area without changing its ratio; export dimensions follow the selected platform preset.

Comparison now displays large, individually titled proofs. Phone and tablet use horizontal swipe, previous/next buttons and a counter; desktop displays three columns. Each proof has a separate apply button. Proposed drafts do not replace saved copy until applied. Existing undo retains copy, settings and the selected site stage. High density previews are 720 × 900.

New automatic writing defaults to an unconfirmed site stage. It does not imply completion from construction photos. The owner can select before / in progress / completed. Existing manual and approved content remains intact. Newly uploaded photo sets reset the stage to unconfirmed.

Validation:
- Node content, workflow, catalogue, import and typography tests passed.
- `tests/comparison_browser.py`: retained contain/manual settings on iPhone and iPad Chromium emulation; three distinct renders, source ratio preservation, large gallery, swipe/navigation, apply/undo, saved copy and stage reload passed.
- `tests/workflow_browser.py`: four channels, review/approval, schedule, PNG ZIP, H.264 MP4, immutable assets and full backup/restore passed.
- `tests/webkit_browser.py`: WebKitGTK 2.52.6; upload, three proofs, PNG formats, save preparation, IndexedDB reload, responsive widths and decoded H.264 MP4 passed. This is an engine test, not physical iOS hardware validation.
- Protected root measurement files retain their pre-change SHA-256 hashes. No database reset or migration.

Deployment: only `marketing/` changes. Previous version is preserved on `backup/before-mobile-comparison-20261108`. To roll back, restore `marketing/` from that branch and commit/push normally; never reset unrelated measurement files or browser storage.
