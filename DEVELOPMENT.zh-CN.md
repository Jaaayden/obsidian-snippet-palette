# Snippet Palette · 片段调色板

为 Obsidian 提供紧凑、可停靠的文字片段面板。基于 Mark Riechers 的 Ribbon Snippets 二次开发，保留原始 MIT 许可。

## 安装与迁移

要求 Obsidian 1.8.7 或更高版本。插件 ID 为 `snippet-palette`。

1. 将构建产物 `main.js`、`manifest.json`、`styles.css` 放入 `<仓库>/.obsidian/plugins/snippet-palette/`。
2. 从旧版迁移时，先备份原 `ribbon-snippets` 插件目录，将旧 `data.json` 复制到新目录。停用旧插件，避免重复加载。
3. 重新加载 Obsidian，在第三方插件中启用 **Snippet Palette**。
4. 点击左侧打开片段面板的入口，或运行「Snippet Palette: 打开片段面板」命令。
5. 面板默认在右侧，可拖动标签停靠到其他侧栏或分栏。

## 使用

- 先打开笔记并处于编辑模式，再点击片段标题插入。面板显示目标笔记名称。
- 默认只显示彩色标题；可以选择显示图标。每个片段可以单独选择底色。
- 支持自动换行、单列、横向滚动单行布局。
- 搜索框默认隐藏，点击放大镜展开；再次点击或按 Esc 收起，同时清除筛选。
- 标题栏中的加号新建片段。设置页使用紧凑单行列表，色点和标题在左，操作按钮在右。
- 拖动每行左侧手柄可直接调整顺序，提示线表示放置位置。聚焦手柄后，方向键上下移动，Home/End 直接置顶或置底；搜索筛选时也可以拖动。
- 点击标题或编辑图标打开编辑弹窗，保存后生效；取消或关闭弹窗不修改原有片段。
- 图标从当前 Obsidian 支持的图标库中搜索选择，搜索词使用图标英文名称，无需联网。
- 光标位置插入会替换选中文字，片段末尾自动补换行。防止重复按第一行是否已出现判断。
- 界面跟随 Obsidian 语言：简体中文、英文；其他语言回退英文。用户填写的标题和内容不会翻译。

## 开发与验证

```sh
npm ci
npm run typecheck
npm test
npm run build
```

自动化测试覆盖配置迁移、插入逻辑、图标开关、紧凑列表、搜索展开与收起、中英文翻译和保存失败处理。测试使用模拟 Obsidian API 和 DOM；真实 Obsidian 的停靠、工作区恢复及移动端交互需要另外验收。

## CI 与发布

开发环境要求 Node 22 或更高版本。PR 和 main 使用同一套检查：Linux 上 Node 22/24/26，macOS 15 Intel、Windows 上 Node 24；验证元数据、锁文件、类型、测试和构建。Linux / Node 24 上传可下载的插件安装产物，保留 14 天。`npm run package` 在本地生成 `artifacts/snippet-palette/`。

只有推送版本标签才会发布 Release。标签必须与 manifest、package、锁文件以及 versions.json 中的版本一致，并通过完整 CI；发布任务直接使用已验证的产物。普通提交不触发发布。
