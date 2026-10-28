# Snippet Palette

A compact, colorful palette for reusable text in Obsidian.

**[简体中文说明](DEVELOPMENT.zh-CN.md)**

## Features

- A dockable panel with wrapping labels, a vertical list, or a horizontal scrolling row.
- Always-visible titles, optional icons, and per-snippet colors.
- Search hidden by default: click the search icon to expand it; click again or press Escape to close and clear the filter.
- A compact single-line settings list with color dots, search, drag handles, and separate edit dialogs. Drag to insert before or after any row; focus a handle and use Home/End to move directly to the first/last position.
- A searchable icon picker using the icons actually supported by your Obsidian version.
- Insert at the cursor, after frontmatter, or at the bottom, with optional duplicate detection.
- English and Simplified Chinese UI following Obsidian's language setting; other languages fall back to English.

## Installation

Requires Obsidian 1.8.7 or later. Plugin ID: `snippet-palette`.

1. Build the plugin with the commands below.
2. Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/snippet-palette/`.
3. Reload Obsidian and enable **Snippet Palette** under Community plugins.
4. Click the ribbon opener or run **Snippet Palette: Open snippet panel**.

The panel shows the note it will insert into. Open that note in editing mode, then click a snippet title.

### Migrating from Ribbon Snippets

Back up the old `ribbon-snippets` plugin directory. Copy its `data.json` into the new `snippet-palette` directory and disable the old plugin before enabling Snippet Palette. Existing snippet IDs, titles, content and insertion options are retained. Open the new panel after switching plugins; the old panel has a different view type.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
```

To install into a chosen vault after building:

```sh
./deploy.sh "/path/to/vault"
```

Tests use simulated Obsidian APIs and a DOM. Native docking, workspace restore, and mobile touch interaction still require testing in Obsidian.

Translations live in `src/i18n.ts`. Translation keys are type checked; tests cover both supported locales and fallback behavior. Obsidian normally reloads when its interface language changes.

## Credits and license

Developed by [Jayden](https://github.com/Jaaayden), based on [Ribbon Snippets by Mark Riechers](https://github.com/mriechers/obsidian-ribbon-snippets). The original MIT copyright notice is preserved in [LICENSE](LICENSE).

## Continuous integration

Pull requests and `main` run the same reusable checks on Linux (Node 22, 24, 26), macOS 15 Intel (Node 24), and Windows (Node 24). Each job uses `npm ci`, validates plugin metadata and lockfile consistency, type checks, runs tests, and builds the installable plugin. The Linux / Node 24 job uploads a downloadable `snippet-palette-<commit>` artifact, retained for 14 days.

Use Node 22 or newer for local development. `npm run package` creates `artifacts/snippet-palette/` with the plugin files and license.

Release tags (`1.0.0` or `v1.0.0`) must match `manifest.json`, `package.json`, the lockfile, and `versions.json`. Tag builds run the full validation matrix before publishing those exact artifacts. Only the publishing job receives write permission. Routine pushes do not create releases.
