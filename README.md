# Ribbon Snippets · Snippet panel fork

An Obsidian plugin for inserting reusable text from a dockable, searchable panel.
Based on [mriechers/obsidian-ribbon-snippets](https://github.com/mriechers/obsidian-ribbon-snippets), under the original MIT license.

**[中文安装与使用说明](DEVELOPMENT.zh-CN.md)**

## Features

- Dockable snippet panel: drag its tab into the left sidebar, right sidebar, or another workspace split.
- Three layouts: compact wrapping labels, a vertical list, or a horizontal scrolling row.
- Always-visible titles, optional icons (off by default), and per-snippet background colors.
- Searchable icon picker with previews, populated from the icons supported by the running Obsidian version.
- Compact settings list with search, reordering, and separate edit dialogs. Changes are applied only on Save.
- Insert at the cursor, at the top after frontmatter, or at the bottom. Existing snippets retain their settings.
- Optional duplicate detection and per-snippet command palette entries.
- Optional legacy ribbon buttons. By default, the ribbon contains only the panel opener.

## Manual installation

This is a local development fork, not an official upstream release. It retains the `ribbon-snippets` plugin ID to reuse existing configuration.

1. Back up `<vault>/.obsidian/plugins/ribbon-snippets/`, especially `data.json`.
2. Disable the plugin and copy the built `main.js`, `manifest.json`, and `styles.css` into that directory. Keep `data.json`.
3. Enable the plugin and click the ribbon's panel opener, or run the **打开片段面板** command.
4. Open a note in editing mode, then click a snippet title. The panel displays the target note's name.

Settings and panel labels in this fork use Simplified Chinese. Requires Obsidian 1.7.2 or later.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Tests use a simulated Obsidian API and DOM. Native docking, workspace restore, and mobile touch interaction require manual testing in Obsidian.

## License

[MIT](LICENSE). Original author: Mark Riechers.
