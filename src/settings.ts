import { reorderSnippets } from './reorder';
import { t } from './i18n';
import { App, Modal, Notice, PluginSettingTab, Setting, SuggestModal, getIconIds, getIcon, setIcon } from 'obsidian';
import type SnippetPalettePlugin from './main';
import { PaletteSnippet, SNIPPET_COLORS, SnippetColor, snippetColor } from './model';



export class IconPickerModal extends SuggestModal<string> {
	private icons = getIconIds();
	constructor(app: App, private select: (icon: string) => void) {
		super(app);
		this.setPlaceholder(t('iconSearch'));
		this.setInstructions([{ command: '↑ ↓', purpose: t('select') }, { command: '↵', purpose: t('confirm') }, { command: 'esc', purpose: t('cancel') }]);
		this.limit = 60;
	}
	getSuggestions(query: string): string[] {
		const terms = query.trim().toLowerCase().split(/\s+/);
		return this.icons.filter(icon => terms.every(term => icon.toLowerCase().includes(term))).slice(0, 60);
	}
	renderSuggestion(icon: string, el: HTMLElement) {
		el.addClass('snippet-palette-icon-option');
		setIcon(el.createSpan({ cls: 'snippet-palette-icon' }), icon);
		el.createSpan({ text: icon });
	}
	onChooseSuggestion(icon: string) { this.select(icon); }
}

export class SnippetEditorModal extends Modal {
	private draft: PaletteSnippet;
	constructor(app: App, private plugin: SnippetPalettePlugin, private original: PaletteSnippet | null, private onSaved: () => void) {
		super(app);
		this.draft = original ? { ...original } : {
			id: plugin.generateId(), name: '', icon: 'file-text', content: '',
			position: 'cursor', checkDuplicate: false, color: 'auto'
		};
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('snippet-palette-editor');
		this.setTitle(this.original ? t('editSnippet') : t('newSnippet'));
		new Setting(contentEl).setName(t('title')).setDesc(t('titleDesc'))
			.addText(text => text.setPlaceholder(t('titlePlaceholder')).setValue(this.draft.name).onChange(value => { this.draft.name = value; }));
		const iconSetting = new Setting(contentEl).setName(t('icon')).setDesc(t('iconDesc'));
		const preview = iconSetting.controlEl.createSpan({ cls: 'snippet-palette-icon' });
		const updatePreview = () => {
			preview.empty();
			setIcon(preview, getIcon(this.draft.icon) ? this.draft.icon : 'file-text');
		};
		updatePreview();
		iconSetting.addButton(button => button.setButtonText(t('chooseIcon')).onClick(() => {
			new IconPickerModal(this.app, icon => { this.draft.icon = icon; updatePreview(); }).open();
		}));
		new Setting(contentEl).setName(t('color')).addDropdown(dropdown => {
			SNIPPET_COLORS.forEach(color => dropdown.addOption(color, t(color)));
			dropdown.setValue(this.draft.color ?? 'auto').onChange(value => { this.draft.color = value as SnippetColor; });
		});
		new Setting(contentEl).setName(t('position')).addDropdown(dropdown => dropdown
			.addOption('cursor', t('cursor')).addOption('top', t('top')).addOption('bottom', t('bottom'))
			.setValue(this.draft.position).onChange(value => { this.draft.position = value as PaletteSnippet['position']; }));
		new Setting(contentEl).setName(t('preventDuplicates')).setDesc(t('duplicateDesc'))
			.addToggle(toggle => toggle.setValue(this.draft.checkDuplicate).onChange(value => { this.draft.checkDuplicate = value; }));
		new Setting(contentEl).setName(t('content')).setDesc(t('contentDesc')).setClass('snippet-palette-content-setting')
			.addTextArea(text => {
				text.setValue(this.draft.content).setPlaceholder(t('contentPlaceholder')).onChange(value => { this.draft.content = value; });
				text.inputEl.rows = 10;
				text.inputEl.addClass('snippet-palette-textarea');
			});
		new Setting(contentEl).addButton(button => button.setButtonText(t('cancel')).onClick(() => this.close()))
			.addButton(button => button.setButtonText(t('save')).setCta().onClick(async () => {
				if (!this.draft.name.trim()) { new Notice(t('titleRequired')); return; }
				button.setDisabled(true);
				const previous = this.plugin.settings.snippets;
				const saved = { ...this.draft, name: this.draft.name.trim() };
				this.plugin.settings.snippets = this.original
					? previous.map(snippet => snippet.id === this.original!.id ? saved : snippet)
					: [...previous, saved];
				try {
					await this.plugin.saveSettings();
					this.onSaved(); this.close();
				} catch {
					this.plugin.settings.snippets = previous;
					button.setDisabled(false);
				}
			}));
	}
	onClose() { this.contentEl.empty(); }
}

class DeleteSnippetModal extends Modal {
	constructor(app: App, private snippet: PaletteSnippet, private remove: () => Promise<void>) { super(app); }
	onOpen() {
		this.setTitle(t('deleteSnippet'));
		this.contentEl.createEl('p', { text: t('deleteConfirm', { name: this.snippet.name }) });
		new Setting(this.contentEl).addButton(button => button.setButtonText(t('cancel')).onClick(() => this.close()))
			.addButton(button => button.setButtonText(t('delete')).setWarning().onClick(async () => {
				button.setDisabled(true);
				try { await this.remove(); this.close(); } catch { button.setDisabled(false); }
			}));
	}
}

export class SnippetPaletteSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: SnippetPalettePlugin) { super(app, plugin); }
	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('snippet-palette-settings');
		const header = containerEl.createDiv({ cls: 'snippet-palette-settings-header' });
		header.createEl('h2', { text: t('settingsTitle') });
		const version = header.createSpan({ text: `v${this.plugin.manifest.version}`, cls: 'snippet-palette-version' });
		version.setAttribute('aria-label', t('version', { version: this.plugin.manifest.version }));
		new Setting(containerEl).setName(t('panel')).setDesc(t('panelDesc'))
			.addButton(button => button.setButtonText(t('open')).onClick(() => this.plugin.openPanel()));
		new Setting(containerEl).setName(t('layout')).addDropdown(dropdown => dropdown
			.addOption('wrap', t('wrap')).addOption('column', t('column')).addOption('row', t('row'))
			.setValue(this.plugin.settings.layout).onChange(async value => {
				this.plugin.settings.layout = value as typeof this.plugin.settings.layout;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName(t('showIcons')).setDesc(t('showIconsDesc'))
			.addToggle(toggle => toggle.setValue(this.plugin.settings.showIcons).onChange(async value => {
				this.plugin.settings.showIcons = value; await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName(t('legacyRibbon')).setDesc(t('legacyRibbonDesc'))
			.addToggle(toggle => toggle.setValue(this.plugin.settings.showSnippetPalette).onChange(async value => {
				this.plugin.settings.showSnippetPalette = value; await this.plugin.saveSettings();
			}));
		const toolbar = containerEl.createDiv({ cls: 'snippet-palette-manage-toolbar' });
		toolbar.createEl('h3', { text: t('snippetList') });
		const search = toolbar.createEl('input', { type: 'search', placeholder: t('searchPlaceholder') });
		search.setAttribute('aria-label', t('search'));
		const add = toolbar.createEl('button', { text: t('newSnippet'), cls: 'mod-cta' });
		add.addEventListener('click', () => new SnippetEditorModal(this.app, this.plugin, null, () => this.display()).open());
		const list = containerEl.createDiv({ cls: 'snippet-palette-settings-list' });
		let draggedId: string | null = null;
		let savingOrder = false;
		const clearDrag = () => {
			draggedId = null;
			list.querySelectorAll('.is-dragging, .drop-before, .drop-after').forEach(el => {
				el.classList.remove('is-dragging', 'drop-before', 'drop-after');
			});
		};
		const move = async (sourceId: string, targetId: string, after: boolean) => {
			if (savingOrder) return;
			const previous = this.plugin.settings.snippets;
			const reordered = reorderSnippets(previous, sourceId, targetId, after);
			if (reordered === previous) return;
			savingOrder = true;
			this.plugin.settings.snippets = reordered;
			try { await this.plugin.saveSettings(); }
			catch { this.plugin.settings.snippets = previous; }
			finally { savingOrder = false; renderList(search.value); }
		};
		const renderList = (query: string) => {
			clearDrag();
			list.empty();
			const snippets = this.plugin.settings.snippets;
			let count = 0;
			snippets.forEach((snippet, index) => {
				if (!snippet.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) return;
				count++;
				// Custom rows avoid themes turning each Setting into a spacious card.
				const row = list.createDiv({ cls: 'snippet-palette-setting-row' });
				row.dataset.snippetId = snippet.id;
				const handle = row.createEl('button', { cls: 'snippet-palette-tool snippet-palette-drag-handle' });
				handle.draggable = true;
				handle.title = t('dragToReorder');
				handle.setAttribute('aria-label', t('reorderSnippet', { name: snippet.name || t('unnamed') }));
				setIcon(handle, 'grip-vertical');
				handle.addEventListener('dragstart', event => {
					if (savingOrder || !event.dataTransfer) { event.preventDefault(); return; }
					draggedId = snippet.id;
					event.dataTransfer.effectAllowed = 'move';
					event.dataTransfer.setData('text/plain', snippet.id);
					event.dataTransfer.setDragImage(row, 16, row.offsetHeight / 2);
					row.classList.add('is-dragging');
				});
				handle.addEventListener('dragend', clearDrag);
				handle.addEventListener('keydown', async event => {
					const items = this.plugin.settings.snippets;
					const current = items.findIndex(item => item.id === snippet.id);
					let destination: number;
					if (event.key === 'Home') destination = 0;
					else if (event.key === 'End') destination = items.length - 1;
					else if (event.key === 'ArrowUp') destination = current - 1;
					else if (event.key === 'ArrowDown') destination = current + 1;
					else return;
					event.preventDefault();
					if (!items[destination]) return;
					await move(snippet.id, items[destination].id, destination > current);
					const moved = Array.from(list.children).find(el => (el as HTMLElement).dataset.snippetId === snippet.id);
					(moved?.querySelector('.snippet-palette-drag-handle') as HTMLElement | null)?.focus();
				});
				row.addEventListener('dragover', event => {
					if (!draggedId || savingOrder) return;
					event.preventDefault();
					if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
					list.querySelectorAll('.drop-before, .drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
					if (draggedId === snippet.id) return;
					const bounds = row.getBoundingClientRect();
					row.classList.add(event.clientY < bounds.top + bounds.height / 2 ? 'drop-before' : 'drop-after');
				});
				row.addEventListener('dragleave', event => {
					if (!event.relatedTarget || !row.contains(event.relatedTarget as Node)) row.classList.remove('drop-before', 'drop-after');
				});
				row.addEventListener('drop', event => {
					if (!draggedId || savingOrder) return;
					event.preventDefault();
					const sourceId = draggedId;
					const bounds = row.getBoundingClientRect();
					clearDrag();
					void move(sourceId, snippet.id, event.clientY >= bounds.top + bounds.height / 2);
				});
				const title = row.createEl('button', {
					text: snippet.name || t('unnamed'),
					cls: `snippet-palette-row-title snippet-palette-color-${snippetColor(snippet, index)}`
				});
				title.title = snippet.name || t('unnamed');
				title.addEventListener('click', () => new SnippetEditorModal(this.app, this.plugin, snippet, () => this.display()).open());
				const actions = row.createDiv({ cls: 'snippet-palette-row-actions' });
				const action = (icon: string, label: string, disabled: boolean, callback: () => void) => {
					const button = actions.createEl('button', { cls: 'snippet-palette-tool' });
					setIcon(button, icon);
					button.title = label;
					button.setAttribute('aria-label', label);
					button.disabled = disabled;
					button.addEventListener('click', callback);
				};
				for (const [offset, icon, label] of [[-1, 'arrow-up', t('moveUp')], [1, 'arrow-down', t('moveDown')]] as const) {
					action(icon, label, index + offset < 0 || index + offset >= snippets.length, async () => {
						await move(snippet.id, snippets[index + offset].id, offset > 0);
					});
				}
				action('pencil', t('edit'), false, () => {
					new SnippetEditorModal(this.app, this.plugin, snippet, () => this.display()).open();
				});
				action('trash-2', t('delete'), false, () => {
					new DeleteSnippetModal(this.app, snippet, async () => {
						const previous = this.plugin.settings.snippets;
						this.plugin.settings.snippets = previous.filter(item => item.id !== snippet.id);
						try { await this.plugin.saveSettings(); renderList(query); }
						catch (error) { this.plugin.settings.snippets = previous; throw error; }
					}).open();
				});
			});
			if (!count) list.createEl('p', { text: query ? t('noMatches') : t('emptyList'), cls: 'snippet-palette-empty' });
		};
		search.addEventListener('input', () => renderList(search.value));
		renderList('');
	}
}
