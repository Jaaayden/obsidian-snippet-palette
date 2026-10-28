import { t } from './i18n';
import { Editor, MarkdownView, Notice, Plugin, getIcon } from 'obsidian';
import { SnippetPaletteSettingTab } from './settings';
import { SnippetsView, SNIPPETS_VIEW_TYPE } from './view';
import { normalizeSettings, PaletteSnippet, SnippetPaletteSettings } from './model';
export type { PaletteSnippet, SnippetPaletteSettings } from './model';

export default class SnippetPalettePlugin extends Plugin {
	settings: SnippetPaletteSettings = normalizeSettings(null);
	private ribbonIcons: HTMLElement[] = [];
	private commandIds: string[] = [];
	private lastMarkdownView: MarkdownView | null = null;
	private saveQueue: Promise<void> = Promise.resolve();

	async onload() {
		this.settings = normalizeSettings(await this.loadData());
		this.registerView(SNIPPETS_VIEW_TYPE, leaf => new SnippetsView(leaf, this));
		this.addRibbonIcon('panels-top-left', t('openPanel'), () => { void this.openPanel(); });
		this.addCommand({ id: 'open-snippets-panel', name: t('openPanel'), callback: () => this.openPanel() });
		this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
			if (leaf?.view instanceof MarkdownView) this.lastMarkdownView = leaf.view;
			this.refreshViews();
		}));
		this.lastMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.refreshRibbonIcons();
		this.refreshCommands();
		this.addSettingTab(new SnippetPaletteSettingTab(this.app, this));
	}

	onunload() {
		this.removeRibbonIcons();
		this.removeCommands();
		this.lastMarkdownView = null;
	}

	async openPanel() {
		const existing = this.app.workspace.getLeavesOfType(SNIPPETS_VIEW_TYPE)[0];
		const leaf = existing ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing) await leaf.setViewState({ type: SNIPPETS_VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	async saveSettings() {
		// Snapshot and serialize writes so rapid settings changes cannot persist out of order.
		const snapshot = JSON.parse(JSON.stringify(this.settings)) as SnippetPaletteSettings;
		const write = this.saveQueue.then(() => this.saveData(snapshot));
		this.saveQueue = write.catch(() => {});
		try { await write; }
		catch (error) { new Notice(t('saveFailed')); throw error; }
		this.refreshRibbonIcons();
		this.refreshCommands();
		this.refreshViews();
	}

	refreshViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(SNIPPETS_VIEW_TYPE)) {
			if (leaf.view instanceof SnippetsView) leaf.view.render();
		}
	}

	private removeRibbonIcons() {
		this.ribbonIcons.forEach(el => el.remove());
		this.ribbonIcons = [];
	}

	private refreshRibbonIcons() {
		this.removeRibbonIcons();
		if (!this.settings.showSnippetPalette) return;
		for (const snippet of this.settings.snippets) {
			this.ribbonIcons.push(this.addRibbonIcon(
				getIcon(snippet.icon) ? snippet.icon : 'file-text',
				snippet.name || t('unnamed'), () => this.insertSnippet(snippet.id)
			));
		}
	}

	private removeCommands() {
		this.commandIds.forEach(id => this.removeCommand(id));
		this.commandIds = [];
	}

	private refreshCommands() {
		this.removeCommands();
		for (const snippet of this.settings.snippets) {
			const id = `insert-snippet-${snippet.id}`;
			this.addCommand({ id, name: t('insert', { name: snippet.name || t('unnamed') }),
				editorCallback: (editor: Editor) => {
					const current = this.settings.snippets.find(s => s.id === snippet.id);
					if (current) this.insertSnippetInEditor(editor, current);
				}
			});
			this.commandIds.push(id);
		}
	}

	getTargetView(): MarkdownView | null {
		const active = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (active) return active;
		// Only reuse a still-open editor. Never reopen or write to a closed note.
		let target: MarkdownView | null = null;
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view === this.lastMarkdownView) target = this.lastMarkdownView;
		});
		return target;
	}

	insertSnippet(id: string) {
		const snippet = this.settings.snippets.find(s => s.id === id);
		if (!snippet) return;
		const view = this.getTargetView();
		if (!view?.file || view.getMode() !== 'source') {
			new Notice(t('openEditor'));
			return;
		}
		this.insertSnippetInEditor(view.editor, snippet);
	}

	private insertSnippetInEditor(editor: Editor, snippet: PaletteSnippet) {
		if (!snippet.content) { new Notice(t('emptyContent')); return; }
		const content = editor.getValue();
		if (snippet.checkDuplicate) {
			const firstLine = snippet.content.split('\n')[0];
			if (firstLine && content.includes(firstLine)) {
				new Notice(t('duplicate', { name: snippet.name })); return;
			}
		}
		const text = snippet.content.endsWith('\n') ? snippet.content : snippet.content + '\n';
		switch (snippet.position) {
			case 'top': {
				const lines = content.split('\n');
				let line = 0;
				if (lines[0]?.trim() === '---') {
					for (let i = 1; i < lines.length; i++) {
						if (lines[i].trim() === '---') { line = i + 1; break; }
					}
				}
				// A closing YAML delimiter at EOF needs a newline before the snippet.
				if (line === lines.length) {
					editor.replaceRange('\n' + text, { line: line - 1, ch: lines[line - 1].length });
				} else editor.replaceRange(text, { line, ch: 0 });
				break;
			}
			case 'cursor': editor.replaceSelection(text); break;
			case 'bottom': {
				const line = editor.lastLine();
				const ch = editor.getLine(line).length;
				editor.replaceRange((ch ? '\n' : '') + text, { line, ch });
				break;
			}
		}
		new Notice(t('inserted', { name: snippet.name }));
	}

	generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
	}
}
