import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import vm from 'node:vm';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const { document, HTMLElement } = dom.window;
Object.assign(HTMLElement.prototype, {
  empty() { this.replaceChildren(); },
  addClass(name) { this.classList.add(name); },
  setText(text) { this.textContent = text; },
  createEl(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.text) el.textContent = options.text;
    if (options.cls) el.className = options.cls;
    if (options.type) el.type = options.type;
    if (options.placeholder) el.placeholder = options.placeholder;
    this.append(el); return el;
  },
  createDiv(options) { return this.createEl('div', options); },
  createSpan(options) { return this.createEl('span', options); }
});
const notices = [];
class Plugin {
  manifest = { version: '1.1.0' };
  commands = new Map(); ribbons = [];
  constructor(app) { this.app = app; }
  addCommand(command) { this.commands.set(command.id, command); }
  removeCommand(id) { this.commands.delete(id); }
  addRibbonIcon(icon, name, callback) { const el = document.createElement('button'); this.ribbons.push(el); return el; }
  async saveData(data) { this.saved = data; }
  async loadData() { return this.data; }
  registerView() {} registerEvent() {} addSettingTab() {}
}
class MarkdownView {}
class ItemView { constructor(leaf) { this.leaf = leaf; this.app = leaf.app; this.contentEl = document.createElement('div'); } }
class Modal {
  static opened = [];
  constructor(app) { this.app = app; this.contentEl = document.createElement('div'); }
  setTitle(title) { this.title = title; }
  open() { Modal.opened.push(this); this.onOpen?.(); }
  close() { this.closed = true; this.onClose?.(); }
}
class SuggestModal extends Modal { setPlaceholder() {} setInstructions() {} }
class PluginSettingTab { constructor(app) { this.app = app; this.containerEl = document.createElement('div'); } }
class Setting {
  constructor(container) {
    this.settingEl = container.createDiv(); this.nameEl = this.settingEl.createDiv();
    this.descEl = this.settingEl.createDiv(); this.controlEl = this.settingEl.createDiv();
  }
  setName(text) { this.nameEl.textContent = text; return this; }
  setDesc(text) { this.descEl.textContent = text; return this; }
  setClass(name) { this.settingEl.classList.add(name); return this; }
  add(type, callback) {
    const tag = type === 'textArea' ? 'textarea' : type === 'dropdown' ? 'select' : ['button','extraButton'].includes(type) ? 'button' : 'input';
    const el = this.controlEl.createEl(tag);
    if (type === 'toggle') el.type = 'checkbox';
    const component = {
      inputEl: el, buttonEl: el,
      setValue(value) { if (type === 'toggle') el.checked = value; else el.value = value; return this; },
      setPlaceholder(value) { el.placeholder = value; return this; },
      setButtonText(value) { el.textContent = value; return this; },
      setIcon(value) { el.dataset.icon = value; return this; },
      setTooltip(value) { el.title = value; return this; },
      setCta() { return this; }, setWarning() { return this; },
      setDisabled(value) { el.disabled = value; return this; },
      addOption(value, label) { const option = el.createEl('option', { text: label }); option.value = value; return this; },
      onClick(handler) { el.addEventListener('click', handler); return this; },
      onChange(handler) { el.addEventListener('input', () => handler(type === 'toggle' ? el.checked : el.value)); return this; }
    };
    callback(component); return this;
  }
}
for (const type of ['Text','TextArea','Dropdown','Toggle','Button','ExtraButton','Search']) {
  Setting.prototype[`add${type}`] = function (fn) { return this.add(type[0].toLowerCase() + type.slice(1), fn); };
}
let language = 'zh';
const icons = ['file-text', 'star', 'book-open', 'bookmark', 'check', 'search', 'plus'];
const obsidian = {
  Plugin, MarkdownView, ItemView, Modal, SuggestModal, PluginSettingTab, Setting,
  getLanguage: () => language,
  Notice: class { constructor(text) { notices.push(text); } },
  getIconIds: () => icons, getIcon: name => icons.includes(name) ? document.createElement('svg') : null,
  setIcon: (el, name) => { if (icons.includes(name)) el.createEl('svg'); }
};
const bundled = await build({ stdin: {
  contents: "export {default as Plugin} from './src/main'; export * from './src/model'; export * from './src/view'; export * from './src/settings'; export * from './src/i18n'; export * from './src/reorder';",
  resolveDir: process.cwd(), loader: 'ts'
}, bundle: true, write: false, format: 'cjs', external: ['obsidian'] });
const module = { exports: {} };
vm.runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, require: () => obsidian, console });
const api = module.exports;
const snippet = (extra = {}) => ({ id: 'one', name: '示例', icon: 'star', content: 'Hello', position: 'cursor', checkDuplicate: false, ...extra });
function editor(value, selection = [0, 0]) {
  const offset = pos => value.split('\n').slice(0, pos.line).reduce((n, line) => n + line.length + 1, 0) + pos.ch;
  return {
    getValue: () => value, lastLine: () => value.split('\n').length - 1, getLine: n => value.split('\n')[n],
    replaceRange(text, pos) { const at = offset(pos); value = value.slice(0, at) + text + value.slice(at); },
    replaceSelection(text) { value = value.slice(0, selection[0]) + text + value.slice(selection[1]); }
  };
}
function fixture(items = [snippet()]) {
  const view = Object.assign(new MarkdownView(), { file: { basename: 'Note' }, editor: editor('abc', [1, 2]), getMode: () => 'source' });
  const state = { active: view, leaves: [{ view }], listener: null };
  const app = { workspace: {
    getActiveViewOfType: () => state.active,
    getLeavesOfType: () => [], iterateAllLeaves: callback => state.leaves.forEach(callback),
    on: (event, callback) => { state.listener = callback; }
  }};
  const plugin = new api.Plugin(app);
  plugin.settings = api.normalizeSettings({ snippets: items });
  return { plugin, view, state, app };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('legacy snippets survive migration; defaults are title only and wrapping', () => {
  const old = [snippet()]; const settings = api.normalizeSettings({ snippets: old });
  assert.equal(settings.snippets, old); assert.equal(settings.showIcons, false);
  assert.equal(settings.layout, 'wrap'); assert.equal(settings.showSnippetPalette, false);
  assert.equal(api.normalizeSettings({ snippets: null, layout: 'bad' }).snippets.length, 0);
});

test('cursor insertion replaces selected text', () => {
  const { plugin, view } = fixture(); plugin.insertSnippet('one');
  assert.equal(view.editor.getValue(), 'aHello\nc');
});
for (const [position, source, expected] of [
  ['top', 'abc', 'Hello\nabc'], ['top', '---\ntitle: A\n---\nabc', '---\ntitle: A\n---\nHello\nabc'],
  ['top', '---\ntitle: A\n---', '---\ntitle: A\n---\nHello\n'],
  ['bottom', 'abc', 'abc\nHello\n'], ['bottom', 'abc\n', 'abc\nHello\n']
]) test(`${position}: ${JSON.stringify(source)}`, () => {
  const { plugin, view } = fixture([snippet({ position })]); view.editor = editor(source);
  plugin.insertSnippet('one'); assert.equal(view.editor.getValue(), expected);
});

test('duplicate and empty snippets leave note unchanged', () => {
  const { plugin, view } = fixture([snippet({ checkDuplicate: true })]); view.editor = editor('Hello\nWorld');
  plugin.insertSnippet('one'); assert.equal(view.editor.getValue(), 'Hello\nWorld');
  plugin.settings.snippets[0].content = ''; plugin.insertSnippet('one'); assert.equal(view.editor.getValue(), 'Hello\nWorld');
});

test('panel focus remembers editor, closed notes and reading mode cannot be written', async () => {
  const { plugin, view, state } = fixture(); plugin.data = { snippets: [snippet()] }; await plugin.onload();
  state.active = null; state.listener({ view: {} }); plugin.insertSnippet('one');
  assert.equal(view.editor.getValue(), 'aHello\nc');
  state.leaves = []; plugin.insertSnippet('one'); assert.equal(view.editor.getValue(), 'aHello\nc');
  state.active = view; view.getMode = () => 'preview'; plugin.insertSnippet('one'); assert.equal(view.editor.getValue(), 'aHello\nc');
});

test('panel titles remain visible; icon toggle, layouts and search update DOM', async () => {
  const { plugin, app } = fixture();
  const panel = new api.SnippetsView({ app }, plugin); await panel.onOpen();
  assert.equal(panel.contentEl.querySelector('.snippet-palette-chip').textContent, '示例');
  assert.equal(panel.contentEl.querySelectorAll('.snippet-palette-chip svg').length, 0);
  plugin.settings.showIcons = true; plugin.settings.layout = 'column'; panel.render();
  assert.equal(panel.contentEl.querySelectorAll('.snippet-palette-chip svg').length, 1);
  assert.ok(panel.contentEl.querySelector('.snippet-palette-layout-column'));
  plugin.settings.layout = 'row'; panel.render(); assert.ok(panel.contentEl.querySelector('.snippet-palette-layout-row'));
  const search = panel.contentEl.querySelector('input'); search.value = 'no match'; search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(panel.contentEl.querySelectorAll('.snippet-palette-chip').length, 0);
});

test('icon picker searches only available icons and renders previews', () => {
  const { app } = fixture(); let chosen;
  const picker = new api.IconPickerModal(app, value => { chosen = value; });
  assert.deepEqual(Array.from(picker.getSuggestions('book')), ['book-open', 'bookmark']);
  assert.equal(picker.getSuggestions('imaginary-icon').length, 0);
  const row = document.createElement('div'); picker.renderSuggestion('star', row); assert.ok(row.querySelector('svg'));
  picker.onChooseSuggestion('star'); assert.equal(chosen, 'star');
});

test('settings is a compact list; canceled draft does not change saved data', () => {
  const { plugin, app } = fixture([snippet(), snippet({ id: 'two', name: '第二条' })]);
  const tab = new api.SnippetPaletteSettingTab(app, plugin); tab.display();
  assert.equal(tab.containerEl.querySelectorAll('.snippet-palette-setting-row').length, 2);
  assert.equal(tab.containerEl.querySelectorAll('textarea').length, 0);
  const modal = new api.SnippetEditorModal(app, plugin, plugin.settings.snippets[0], () => {}); modal.open();
  const input = modal.contentEl.querySelector('input'); input.value = 'Changed'; input.dispatchEvent(new dom.window.Event('input'));
  modal.close(); assert.equal(plugin.settings.snippets[0].name, '示例');
});

test('saving a draft adds exactly one snippet and refreshes command title', async () => {
  const { plugin, app } = fixture([]);
  const modal = new api.SnippetEditorModal(app, plugin, null, () => {}); modal.open();
  const input = modal.contentEl.querySelector('input'); input.value = 'New title'; input.dispatchEvent(new dom.window.Event('input'));
  Array.from(modal.contentEl.querySelectorAll('button')).find(el => el.textContent === '保存').click(); await tick();
  assert.equal(plugin.settings.snippets.length, 1); assert.equal(plugin.saved.snippets[0].name, 'New title');
  assert.equal([...plugin.commands.values()][0].name, '插入：New title'); assert.equal(modal.closed, true);
});

test('failed save keeps edit modal open and restores previous snippets', async () => {
  const { plugin, app } = fixture(); plugin.saveData = async () => { throw Error('disk full'); };
  const modal = new api.SnippetEditorModal(app, plugin, null, () => {}); modal.open();
  const input = modal.contentEl.querySelector('input'); input.value = 'New'; input.dispatchEvent(new dom.window.Event('input'));
  const save = Array.from(modal.contentEl.querySelectorAll('button')).find(el => el.textContent === '保存'); save.click(); await tick();
  assert.equal(plugin.settings.snippets.length, 1); assert.equal(modal.closed, undefined); assert.equal(save.disabled, false);
});

test('settings writes serialize snapshots', async () => {
  const { plugin } = fixture(); const seen = [];
  plugin.saveData = async data => { await tick(); seen.push(data.snippets[0].name); };
  const first = plugin.saveSettings(); plugin.settings.snippets[0].name = 'Updated'; const second = plugin.saveSettings();
  await Promise.all([first, second]); assert.deepEqual(seen, ['示例', 'Updated']);
});

test('opening the panel reuses existing leaf instead of duplicating it', async () => {
  const { plugin, app } = fixture(); let revealed; let allocated = false;
  const leaf = {};
  app.workspace.getLeavesOfType = () => [leaf];
  app.workspace.getRightLeaf = () => { allocated = true; return null; };
  app.workspace.revealLeaf = async value => { revealed = value; };
  await plugin.openPanel(); assert.equal(revealed, leaf); assert.equal(allocated, false);
});

test('panel mouse click preserves focus and inserts into selected note', async () => {
  const { plugin, view, app } = fixture(); const panel = new api.SnippetsView({ app }, plugin); await panel.onOpen();
  const button = panel.contentEl.querySelector('.snippet-palette-chip');
  const event = new dom.window.MouseEvent('mousedown', { button: 0, cancelable: true });
  button.dispatchEvent(event); assert.equal(event.defaultPrevented, true);
  button.click(); assert.equal(view.editor.getValue(), 'aHello\nc');
});

test('reorder and confirmed deletion update the saved compact list', async () => {
  const { plugin, app } = fixture([snippet(), snippet({ id: 'two', name: '第二条' })]);
  const tab = new api.SnippetPaletteSettingTab(app, plugin); tab.display();
  tab.containerEl.querySelector('button[title="下移"]').click(); await tick();
  assert.equal(plugin.saved.snippets[0].id, 'two');
  tab.containerEl.querySelector('button[title="删除"]').click();
  assert.equal(plugin.settings.snippets.length, 2);
  const modal = Modal.opened.at(-1);
  Array.from(modal.contentEl.querySelectorAll('button')).find(el => el.textContent === '删除').click(); await tick();
  assert.equal(plugin.saved.snippets.length, 1); assert.equal(plugin.saved.snippets[0].id, 'one');
});

test('panel search is hidden until toggled; closing clears filtering', async () => {
  const { plugin, app } = fixture(); const panel = new api.SnippetsView({ app }, plugin); await panel.onOpen();
  document.body.append(panel.contentEl);
  const toolbar = panel.contentEl.querySelector('.snippet-palette-toolbar');
  const toggle = panel.contentEl.querySelector('button[aria-expanded]');
  const input = toolbar.querySelector('input');
  assert.equal(toolbar.hidden, true);
  toggle.click(); assert.equal(toolbar.hidden, false); assert.equal(document.activeElement, input);
  input.value = 'no match'; input.dispatchEvent(new dom.window.Event('input'));
  assert.equal(panel.contentEl.querySelectorAll('.snippet-palette-chip').length, 0);
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(toolbar.hidden, true); assert.equal(input.value, ''); assert.equal(document.activeElement, toggle);
  assert.equal(panel.contentEl.querySelectorAll('.snippet-palette-chip').length, 1);
  toggle.click(); toggle.click(); assert.equal(toolbar.hidden, true);
  panel.contentEl.remove();
});

test('settings list uses independent single-line rows without content previews', () => {
  const { plugin, app } = fixture([snippet({ content: 'Private body not shown in list' })]);
  const tab = new api.SnippetPaletteSettingTab(app, plugin); tab.display();
  const row = tab.containerEl.querySelector('.snippet-palette-setting-row');
  assert.equal(row.classList.contains('setting-item'), false);
  assert.equal(row.querySelector('.snippet-palette-row-title').textContent, '示例');
  assert.equal(row.textContent.includes('Private body'), false);
  assert.equal(row.querySelectorAll('.snippet-palette-row-actions .snippet-palette-tool').length, 4);
  assert.ok(tab.containerEl.querySelector('.snippet-palette-manage-toolbar input[type=search]'));
});

test('translations support simplified Chinese variants and English fallback with interpolation', () => {
  for (const code of ['zh', 'zh-CN', 'zh_Hans', 'zh-SG']) assert.equal(api.translate(code, 'save'), '保存');
  for (const code of ['en', 'de', 'fr', 'zh-TW']) assert.equal(api.translate(code, 'save'), 'Save');
  assert.equal(api.translate('en', 'target', { name: '<Note>' }), 'Insert into: <Note>');
  assert.deepEqual(Object.keys(api.en).sort(), Object.keys(api.zh).sort());
});

test('English locale covers settings, modal, panel, command and notices', async () => {
  language = 'en';
  try {
    const { plugin, app } = fixture();
    const tab = new api.SnippetPaletteSettingTab(app, plugin); tab.display();
    assert.ok(tab.containerEl.textContent.includes('Show icons'));
    const modal = new api.SnippetEditorModal(app, plugin, null, () => {}); modal.open();
    assert.equal(modal.title, 'New snippet'); assert.ok(modal.contentEl.textContent.includes('Cancel'));
    const panel = new api.SnippetsView({ app }, plugin); await panel.onOpen();
    assert.equal(panel.getDisplayText(), 'Snippet Palette');
    assert.equal(panel.contentEl.querySelector('input').placeholder, 'Search by title…');
    await plugin.saveSettings(); assert.equal(plugin.commands.get('insert-snippet-one').name, 'Insert: 示例');
    plugin.insertSnippet('one'); assert.equal(notices.at(-1), 'Inserted “示例”');
  } finally { language = 'zh'; }
});

test('reordering moves last to first and first to last without mutating input', () => {
  const items = Array.from({ length: 30 }, (_, i) => snippet({ id: String(i) }));
  const first = api.reorderSnippets(items, '29', '0', false);
  assert.equal(first[0].id, '29'); assert.equal(first.length, 30); assert.equal(items[0].id, '0');
  const last = api.reorderSnippets(first, '29', '28', true);
  assert.deepEqual(Array.from(last, item => item.id), items.map(item => item.id));
  assert.equal(api.reorderSnippets(items, '0', '0', false), items);
  assert.equal(api.reorderSnippets(items, 'missing', '0', false), items);
  assert.equal(api.reorderSnippets(items, '0', '1', false), items);
});

function dragEvent(el, type, clientY = 0) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientY: { value: clientY },
    dataTransfer: { value: { setData() {}, setDragImage() {} } }
  });
  el.dispatchEvent(event); return event;
}
function reorderFixture() {
  const setup = fixture([
    snippet({ id: 'a', name: 'Visible A' }),
    snippet({ id: 'b', name: 'Hidden B' }),
    snippet({ id: 'c', name: 'Visible C' })
  ]);
  const tab = new api.SnippetPaletteSettingTab(setup.app, setup.plugin); tab.display();
  const row = id => tab.containerEl.querySelector(`[data-snippet-id="${id}"]`);
  return { ...setup, tab, row };
}

test('dragging by handle shows drop position and persists filtered order', async () => {
  const { plugin, tab, row } = reorderFixture();
  const search = tab.containerEl.querySelector('.snippet-palette-manage-toolbar input');
  search.value = 'Visible'; search.dispatchEvent(new dom.window.Event('input'));
  assert.equal(row('b'), null);
  row('a').getBoundingClientRect = () => ({ top: 0, height: 40 });
  dragEvent(row('c').querySelector('.snippet-palette-drag-handle'), 'dragstart');
  dragEvent(row('a'), 'dragover', 5); assert.equal(row('a').classList.contains('drop-before'), true);
  dragEvent(row('a'), 'drop', 5); await tick();
  assert.deepEqual(Array.from(plugin.saved.snippets, item => item.id), ['c', 'a', 'b']);
  assert.equal(search.value, 'Visible'); assert.equal(row('b'), null);
  assert.equal(tab.containerEl.querySelectorAll('.drop-before, .is-dragging').length, 0);
});

test('external and canceled drags do not change order; drop after works', async () => {
  const { plugin, row } = reorderFixture();
  dragEvent(row('a'), 'drop'); assert.equal(plugin.saved, undefined);
  const handle = row('a').querySelector('.snippet-palette-drag-handle');
  dragEvent(handle, 'dragstart'); dragEvent(handle, 'dragend'); dragEvent(row('c'), 'drop');
  assert.equal(plugin.saved, undefined);
  dragEvent(handle, 'dragstart'); dragEvent(row('c'), 'drop', 1); await tick();
  assert.deepEqual(Array.from(plugin.saved.snippets, item => item.id), ['b', 'c', 'a']);
});

test('keyboard Home/End move directly and failed saves restore order', async () => {
  const { plugin, tab, row } = reorderFixture(); document.body.append(tab.containerEl);
  row('c').querySelector('.snippet-palette-drag-handle').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home' }));
  await tick(); assert.equal(plugin.saved.snippets[0].id, 'c');
  assert.equal(document.activeElement, row('c').querySelector('.snippet-palette-drag-handle'));
  plugin.saveData = async () => { throw Error('disk full'); };
  row('c').querySelector('.snippet-palette-drag-handle').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End' }));
  await tick(); assert.equal(plugin.settings.snippets[0].id, 'c');
  assert.equal(tab.containerEl.querySelector('.snippet-palette-setting-row').dataset.snippetId, 'c');
  tab.containerEl.remove();
});


test('settings shows installed manifest version in both languages', () => {
  const { plugin, app } = fixture();
  plugin.manifest.version = '9.8.7';
  const tab = new api.SnippetPaletteSettingTab(app, plugin);
  for (const [locale, label] of [['zh', '版本 9.8.7'], ['en', 'Version 9.8.7']]) {
    language = locale;
    tab.display();
    const version = tab.containerEl.querySelector('.snippet-palette-version');
    assert.equal(version.textContent, 'v9.8.7');
    assert.equal(version.getAttribute('aria-label'), label);
  }
  language = 'zh';
});
