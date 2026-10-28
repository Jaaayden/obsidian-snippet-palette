export const SNIPPET_COLORS = ['auto', 'neutral', 'blue', 'green', 'orange', 'pink', 'purple'] as const;
export type SnippetColor = typeof SNIPPET_COLORS[number];
export interface PaletteSnippet {
	id: string;
	name: string;
	icon: string;
	content: string;
	position: 'top' | 'cursor' | 'bottom';
	checkDuplicate: boolean;
	color?: SnippetColor;
}
export interface SnippetPaletteSettings {
	snippets: PaletteSnippet[];
	layout: 'wrap' | 'column' | 'row';
	showIcons: boolean;
	showSnippetPalette: boolean;
}
export const DEFAULT_SETTINGS: SnippetPaletteSettings = {
	snippets: [], layout: 'wrap', showIcons: false, showSnippetPalette: false
};
export function normalizeSettings(data: Partial<SnippetPaletteSettings> | null): SnippetPaletteSettings {
	return {
		...DEFAULT_SETTINGS, ...data,
		snippets: Array.isArray(data?.snippets) ? data.snippets : [],
		layout: ['wrap', 'column', 'row'].includes(data?.layout ?? '') ? data!.layout! : 'wrap',
		showIcons: data?.showIcons === true,
		showSnippetPalette: data?.showSnippetPalette === true
	};
}
export function snippetColor(snippet: PaletteSnippet, index: number): string {
	return snippet.color && snippet.color !== 'auto' && SNIPPET_COLORS.includes(snippet.color)
		? snippet.color : SNIPPET_COLORS[2 + index % 5];
}
