# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Non-Claude Agents: Workspace Isolation Rules

**If you are NOT Claude Code** (e.g., Gemini CLI, Codex, Copilot, Cursor, or any other LLM agent), you MUST follow these isolation rules to avoid interfering with Claude agent work:

1. **Always work in a git worktree.** Never modify files on the current branch directly. Create a worktree before making any changes:
   ```bash
   git worktree add .worktrees/<your-agent-name>-<feature> -b <your-agent-name>/<feature-description>
   ```
2. **Always commit to a feature branch.** Your branch name must include your agent identifier (e.g., `gemini/fix-typo`, `codex/add-tests`, `copilot/refactor-utils`). Never commit to `main` or any branch you did not create.
3. **Never force-push, rebase, or modify branches you did not create.** Treat all existing branches as read-only references.
4. **Clean up after yourself.** When your work is complete, leave the worktree in place for human review. Do not merge your own branches.
5. **Follow all other rules in this file.** The conventions below (commit format, secrets management, attribution, etc.) apply to all agents equally.

> Claude Code agents are exempt from the worktree requirement because they are the primary agents for this workspace and coordinate directly with the user.


## Project Overview

Snippet Palette is a dockable text-snippet plugin for Obsidian 1.8.7+.
Plugin ID: `snippet-palette`. Original source: mriechers/obsidian-ribbon-snippets (MIT).

## Validation

Run `npm run typecheck`, `npm test`, and `npm run build` before delivery.
Tests simulate Obsidian APIs and DOM; do not claim native UI testing from these alone.

## Architecture

- `src/main.ts`: plugin lifecycle, serialized persistence, commands, insertion targets.
- `src/model.ts`: settings, defaults and colors.
- `src/view.ts`: dockable panel, collapsible search and snippet buttons.
- `src/settings.ts`: compact management list, editing dialogs and icon picker.
- `src/i18n.ts`: typed English and Simplified Chinese translations using Obsidian's UI language.
- `styles.css`: styles scoped under `snippet-palette-`.

Use custom single-line rows for the snippet settings list; third-party themes can give standard Setting rows large card backgrounds and padding.

## Installation

`./deploy.sh "/path/to/vault"` validates, builds and copies the three plugin artifacts.
Never commit user `data.json`, vault content or credentials. Preserve the upstream MIT license.
