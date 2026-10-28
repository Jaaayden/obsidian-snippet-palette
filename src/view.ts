import { t } from './i18n';
import { ItemView, WorkspaceLeaf, setIcon, getIcon } from 'obsidian';
import type SnippetPalettePlugin from './main';
import { SnippetEditorModal } from './settings';
import { snippetColor } from './model';
export const SNIPPETS_VIEW_TYPE = 'snippet-palette-panel';

export class SnippetsView extends ItemView {
	private query = '';
	private listEl: HTMLElement;
	private targetEl: HTMLElement;
	constructor(leaf: WorkspaceLeaf, private plugin: SnippetPalettePlugin) { super(leaf); }
	getViewType() { return SNIPPETS_VIEW_TYPE; }
	getDisplayText() { return t('viewTitle'); }
	getIcon() { return 'text-cursor-input'; }
	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass('snippet-palette-panel');
		const header = this.contentEl.createDiv({ cls: 'snippet-palette-panel-header' });
		this.targetEl = header.createDiv({ cls: 'snippet-palette-target' });
		const actions = header.createDiv({ cls: 'snippet-palette-panel-actions' });
		const toggle = actions.createEl('button', { cls: 'snippet-palette-tool' });
		setIcon(toggle, 'search');
		toggle.setAttribute('aria-label', t('search'));
		toggle.setAttribute('aria-expanded', 'false');
		toggle.title = t('search');
		const add = actions.createEl('button', { cls: 'snippet-palette-tool' });
		setIcon(add, 'plus');
		add.setAttribute('aria-label', t('newSnippet'));
		add.title = t('newSnippet');
		add.addEventListener('click', () => new SnippetEditorModal(this.app, this.plugin, null, () => {}).open());
		const toolbar = this.contentEl.createDiv({ cls: 'snippet-palette-toolbar' });
		toolbar.hidden = true;
		const search = toolbar.createEl('input', { type: 'search', placeholder: t('searchPlaceholder') });
		search.setAttribute('aria-label', t('search'));
		search.value = this.query = '';
		search.addEventListener('input', () => { this.query = search.value; this.render(); });
		const closeSearch = () => {
			toolbar.hidden = true;
			search.value = this.query = '';
			toggle.setAttribute('aria-expanded', 'false');
			toggle.setAttribute('aria-label', t('search'));
			toggle.title = t('search');
			this.render();
			toggle.focus();
		};
		toggle.addEventListener('click', () => {
			if (!toolbar.hidden) { closeSearch(); return; }
			toolbar.hidden = false;
			toggle.setAttribute('aria-expanded', 'true');
			toggle.setAttribute('aria-label', t('hideSearch'));
			toggle.title = t('hideSearch');
			search.focus();
		});
		search.addEventListener('keydown', event => {
			if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearch(); }
		});
		this.listEl = this.contentEl.createDiv();
		this.render();
	}
	render() {
		if (!this.listEl) return;
		const target = this.plugin.getTargetView();
		this.targetEl.setText(target?.file ? t('target', { name: target.file.basename }) : t('noTarget'));
		this.listEl.empty();
		this.listEl.className = `snippet-palette-list snippet-palette-layout-${this.plugin.settings.layout}`;
		const query = this.query.trim().toLocaleLowerCase();
		let count = 0;
		this.plugin.settings.snippets.forEach((snippet, index) => {
			if (query && !snippet.name.toLocaleLowerCase().includes(query)) return;
			count++;
			const button = this.listEl.createEl('button', {
				cls: `snippet-palette-chip snippet-palette-color-${snippetColor(snippet, index)}`
			});
			button.setAttribute('aria-label', t('insert', { name: snippet.name || t('unnamed') }));
			button.title = snippet.content;
			if (this.plugin.settings.showIcons) {
				const icon = button.createSpan({ cls: 'snippet-palette-icon' });
				icon.setAttribute('aria-hidden', 'true');
				setIcon(icon, getIcon(snippet.icon) ? snippet.icon : 'file-text');
			}
			button.createSpan({ text: snippet.name || t('unnamed') });
			// Preserve the editor selection on mouse clicks, without disabling touch scrolling or keyboard access.
			button.addEventListener('mousedown', event => { if (event.button === 0) event.preventDefault(); });
			button.addEventListener('click', () => this.plugin.insertSnippet(snippet.id));
		});
		if (!count) this.listEl.createEl('p', {
			text: query ? t('noMatches') : t('emptyList'), cls: 'snippet-palette-empty'
		});
	}
}
