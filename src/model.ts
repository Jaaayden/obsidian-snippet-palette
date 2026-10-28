export const SNIPPET_COLORS = ['auto', 'neutral', 'blue', 'green', 'orange', 'pink', 'purple'] as const;
export type SnippetColor = typeof SNIPPET_COLORS[number];
export interface RibbonSnippet {
	id: string;
	name: string;
	icon: string;
	content: string;
	position: 'top' | 'cursor' | 'bottom';
	checkDuplicate: boolean;
	color?: SnippetColor;
}
export interface RibbonSnippetsSettings {
	snippets: RibbonSnippet[];
	layout: 'wrap' | 'column' | 'row';
	showIcons: boolean;
	showRibbonSnippets: boolean;
}
export const DEFAULT_SETTINGS: RibbonSnippetsSettings = {
	snippets: [], layout: 'wrap', showIcons: false, showRibbonSnippets: false
};
export function normalizeSettings(data: Partial<RibbonSnippetsSettings> | null): RibbonSnippetsSettings {
	return {
		...DEFAULT_SETTINGS, ...data,
		snippets: Array.isArray(data?.snippets) ? data.snippets : [],
		layout: ['wrap', 'column', 'row'].includes(data?.layout ?? '') ? data!.layout! : 'wrap',
		showIcons: data?.showIcons === true,
		showRibbonSnippets: data?.showRibbonSnippets === true
	};
}
export function snippetColor(snippet: RibbonSnippet, index: number): string {
	return snippet.color && snippet.color !== 'auto' && SNIPPET_COLORS.includes(snippet.color)
		? snippet.color : SNIPPET_COLORS[2 + index % 5];
}
