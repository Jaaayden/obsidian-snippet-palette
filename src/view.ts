import { ItemView, WorkspaceLeaf, setIcon, getIcon } from 'obsidian';
import type RibbonSnippetsPlugin from './main';
import { SnippetEditorModal } from './settings';
import { snippetColor } from './model';
export const SNIPPETS_VIEW_TYPE = 'ribbon-snippets-panel';

export class SnippetsView extends ItemView {
	private query = '';
	private listEl: HTMLElement;
	private targetEl: HTMLElement;
	constructor(leaf: WorkspaceLeaf, private plugin: RibbonSnippetsPlugin) { super(leaf); }
	getViewType() { return SNIPPETS_VIEW_TYPE; }
	getDisplayText() { return '片段'; }
	getIcon() { return 'text-cursor-input'; }
	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass('ribbon-snippets-panel');
		const toolbar = this.contentEl.createDiv({ cls: 'ribbon-snippets-toolbar' });
		const search = toolbar.createEl('input', { type: 'search', placeholder: '搜索片段…' });
		search.setAttribute('aria-label', '搜索片段');
		search.addEventListener('input', () => { this.query = search.value; this.render(); });
		const add = toolbar.createEl('button', { text: '新建' });
		add.addEventListener('click', () => new SnippetEditorModal(this.app, this.plugin, null, () => {}).open());
		this.targetEl = this.contentEl.createDiv({ cls: 'ribbon-snippets-target' });
		this.listEl = this.contentEl.createDiv();
		this.render();
	}
	render() {
		if (!this.listEl) return;
		const target = this.plugin.getTargetView();
		this.targetEl.setText(target?.file ? `插入到：${target.file.basename}` : '先打开要插入片段的笔记');
		this.listEl.empty();
		this.listEl.className = `ribbon-snippets-list ribbon-snippets-layout-${this.plugin.settings.layout}`;
		const query = this.query.trim().toLocaleLowerCase();
		let count = 0;
		this.plugin.settings.snippets.forEach((snippet, index) => {
			if (query && !snippet.name.toLocaleLowerCase().includes(query)) return;
			count++;
			const button = this.listEl.createEl('button', {
				cls: `ribbon-snippets-chip ribbon-snippets-color-${snippetColor(snippet, index)}`
			});
			button.setAttribute('aria-label', `插入：${snippet.name || '未命名片段'}`);
			button.title = snippet.content;
			if (this.plugin.settings.showIcons) {
				const icon = button.createSpan({ cls: 'ribbon-snippets-icon' });
				icon.setAttribute('aria-hidden', 'true');
				setIcon(icon, getIcon(snippet.icon) ? snippet.icon : 'file-text');
			}
			button.createSpan({ text: snippet.name || '未命名片段' });
			// Preserve the editor selection on mouse clicks, without disabling touch scrolling or keyboard access.
			button.addEventListener('mousedown', event => { if (event.button === 0) event.preventDefault(); });
			button.addEventListener('click', () => this.plugin.insertSnippet(snippet.id));
		});
		if (!count) this.listEl.createEl('p', {
			text: query ? '没有匹配的片段' : '还没有片段，点击「新建」添加。', cls: 'ribbon-snippets-empty'
		});
	}
}
