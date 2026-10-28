import { App, Modal, Notice, PluginSettingTab, Setting, SuggestModal, getIconIds, getIcon, setIcon } from 'obsidian';
import type RibbonSnippetsPlugin from './main';
import { RibbonSnippet, SNIPPET_COLORS, SnippetColor, snippetColor } from './model';

const COLOR_NAMES = ['自动配色', '中性', '蓝色', '绿色', '橙色', '粉色', '紫色'];

export class IconPickerModal extends SuggestModal<string> {
	private icons = getIconIds();
	constructor(app: App, private select: (icon: string) => void) {
		super(app);
		this.setPlaceholder('搜索图标名称，如 star、book、check…');
		this.setInstructions([{ command: '↑ ↓', purpose: '选择' }, { command: '↵', purpose: '确认' }, { command: 'esc', purpose: '取消' }]);
		this.limit = 60;
	}
	getSuggestions(query: string): string[] {
		const terms = query.trim().toLowerCase().split(/\s+/);
		return this.icons.filter(icon => terms.every(term => icon.toLowerCase().includes(term))).slice(0, 60);
	}
	renderSuggestion(icon: string, el: HTMLElement) {
		el.addClass('ribbon-snippets-icon-option');
		setIcon(el.createSpan({ cls: 'ribbon-snippets-icon' }), icon);
		el.createSpan({ text: icon });
	}
	onChooseSuggestion(icon: string) { this.select(icon); }
}

export class SnippetEditorModal extends Modal {
	private draft: RibbonSnippet;
	constructor(app: App, private plugin: RibbonSnippetsPlugin, private original: RibbonSnippet | null, private onSaved: () => void) {
		super(app);
		this.draft = original ? { ...original } : {
			id: plugin.generateId(), name: '', icon: 'file-text', content: '',
			position: 'cursor', checkDuplicate: false, color: 'auto'
		};
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('ribbon-snippets-editor');
		this.setTitle(this.original ? '编辑片段' : '新建片段');
		new Setting(contentEl).setName('标题').setDesc('直接显示在片段面板中')
			.addText(text => text.setPlaceholder('例如：文献笔记').setValue(this.draft.name).onChange(value => { this.draft.name = value; }));
		const iconSetting = new Setting(contentEl).setName('图标').setDesc('从当前 Obsidian 支持的图标中选择；面板是否显示图标由全局开关控制。');
		const preview = iconSetting.controlEl.createSpan({ cls: 'ribbon-snippets-icon' });
		const updatePreview = () => {
			preview.empty();
			setIcon(preview, getIcon(this.draft.icon) ? this.draft.icon : 'file-text');
		};
		updatePreview();
		iconSetting.addButton(button => button.setButtonText('搜索选择…').onClick(() => {
			new IconPickerModal(this.app, icon => { this.draft.icon = icon; updatePreview(); }).open();
		}));
		new Setting(contentEl).setName('底色').addDropdown(dropdown => {
			SNIPPET_COLORS.forEach((color, index) => dropdown.addOption(color, COLOR_NAMES[index]));
			dropdown.setValue(this.draft.color ?? 'auto').onChange(value => { this.draft.color = value as SnippetColor; });
		});
		new Setting(contentEl).setName('插入位置').addDropdown(dropdown => dropdown
			.addOption('cursor', '光标位置（替换选中文字）').addOption('top', '笔记开头（属性之后）').addOption('bottom', '笔记末尾')
			.setValue(this.draft.position).onChange(value => { this.draft.position = value as RibbonSnippet['position']; }));
		new Setting(contentEl).setName('防止重复').setDesc('如果笔记已经包含片段的第一行，则跳过插入。')
			.addToggle(toggle => toggle.setValue(this.draft.checkDuplicate).onChange(value => { this.draft.checkDuplicate = value; }));
		new Setting(contentEl).setName('内容').setDesc('支持 Markdown 和代码块').setClass('ribbon-snippets-content-setting')
			.addTextArea(text => {
				text.setValue(this.draft.content).setPlaceholder('输入要插入的内容…').onChange(value => { this.draft.content = value; });
				text.inputEl.rows = 10;
				text.inputEl.addClass('ribbon-snippet-textarea');
			});
		new Setting(contentEl).addButton(button => button.setButtonText('取消').onClick(() => this.close()))
			.addButton(button => button.setButtonText('保存').setCta().onClick(async () => {
				if (!this.draft.name.trim()) { new Notice('请输入片段标题。'); return; }
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
	constructor(app: App, private snippet: RibbonSnippet, private remove: () => Promise<void>) { super(app); }
	onOpen() {
		this.setTitle('删除片段');
		this.contentEl.createEl('p', { text: `确定删除「${this.snippet.name}」及其内容吗？` });
		new Setting(this.contentEl).addButton(button => button.setButtonText('取消').onClick(() => this.close()))
			.addButton(button => button.setButtonText('删除').setWarning().onClick(async () => {
				button.setDisabled(true);
				try { await this.remove(); this.close(); } catch { button.setDisabled(false); }
			}));
	}
}

export class RibbonSnippetsSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: RibbonSnippetsPlugin) { super(app, plugin); }
	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('ribbon-snippets-settings');
		containerEl.createEl('h2', { text: 'Ribbon Snippets · 片段面板' });
		new Setting(containerEl).setName('独立片段面板').setDesc('像文件列表一样拖动面板标签，即可放到左侧、右侧或其他分栏。')
			.addButton(button => button.setButtonText('打开面板').onClick(() => this.plugin.openPanel()));
		new Setting(containerEl).setName('布局').addDropdown(dropdown => dropdown
			.addOption('wrap', '紧凑标签 · 自动换行').addOption('column', '单列列表').addOption('row', '单行 · 横向滚动')
			.setValue(this.plugin.settings.layout).onChange(async value => {
				this.plugin.settings.layout = value as typeof this.plugin.settings.layout;
				await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName('显示图标').setDesc('关闭时只显示标题，开启时显示图标和标题。')
			.addToggle(toggle => toggle.setValue(this.plugin.settings.showIcons).onChange(async value => {
				this.plugin.settings.showIcons = value; await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName('保留每个片段的左侧快捷图标').setDesc('默认关闭；左侧只保留一个打开面板的入口。')
			.addToggle(toggle => toggle.setValue(this.plugin.settings.showRibbonSnippets).onChange(async value => {
				this.plugin.settings.showRibbonSnippets = value; await this.plugin.saveSettings();
			}));
		new Setting(containerEl).setName('片段列表').addButton(button => button.setButtonText('新建片段').setCta()
			.onClick(() => new SnippetEditorModal(this.app, this.plugin, null, () => this.display()).open()));
		const list = containerEl.createDiv();
		const renderList = (query: string) => {
			list.empty();
			const snippets = this.plugin.settings.snippets;
			let count = 0;
			snippets.forEach((snippet, index) => {
				if (!snippet.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) return;
				count++;
				const row = new Setting(list).setClass('ribbon-snippets-setting-row');
				const title = row.nameEl.createEl('button', {
					text: snippet.name || '未命名片段',
					cls: `ribbon-snippets-chip ribbon-snippets-color-${snippetColor(snippet, index)}`
				});
				title.addEventListener('click', () => new SnippetEditorModal(this.app, this.plugin, snippet, () => this.display()).open());
				row.setDesc(snippet.content.split('\n')[0].slice(0, 80) || '暂无内容');
				for (const [offset, icon, label] of [[-1, 'arrow-up', '上移'], [1, 'arrow-down', '下移']] as const) {
					row.addExtraButton(button => button.setIcon(icon).setTooltip(label).setDisabled(index + offset < 0 || index + offset >= snippets.length)
						.onClick(async () => {
							[snippets[index], snippets[index + offset]] = [snippets[index + offset], snippets[index]];
							await this.plugin.saveSettings(); renderList(query);
						}));
				}
				row.addExtraButton(button => button.setIcon('pencil').setTooltip('编辑').onClick(() => {
					new SnippetEditorModal(this.app, this.plugin, snippet, () => this.display()).open();
				}));
				row.addExtraButton(button => button.setIcon('trash-2').setTooltip('删除').onClick(() => {
					new DeleteSnippetModal(this.app, snippet, async () => {
						const previous = this.plugin.settings.snippets;
						this.plugin.settings.snippets = previous.filter(item => item.id !== snippet.id);
						try { await this.plugin.saveSettings(); renderList(query); }
						catch (error) { this.plugin.settings.snippets = previous; throw error; }
					}).open();
				}));
			});
			if (!count) list.createEl('p', { text: query ? '没有匹配的片段' : '点击「新建片段」添加第一条片段。', cls: 'ribbon-snippets-empty' });
		};
		const search = new Setting(containerEl).setName('搜索片段').addSearch(input => input.setPlaceholder('按标题搜索…').onChange(renderList));
		containerEl.insertBefore(search.settingEl, list);
		renderList('');
	}
}
