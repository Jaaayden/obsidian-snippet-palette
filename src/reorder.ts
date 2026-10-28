import type { PaletteSnippet } from './model';

/** Move relative to a stable ID, including when the list is filtered. */
export function reorderSnippets(snippets: PaletteSnippet[], sourceId: string, targetId: string, after: boolean): PaletteSnippet[] {
	if (sourceId === targetId) return snippets;
	const source = snippets.find(item => item.id === sourceId);
	if (!source || !snippets.some(item => item.id === targetId)) return snippets;
	const result = snippets.filter(item => item.id !== sourceId);
	const index = result.findIndex(item => item.id === targetId);
	result.splice(index + (after ? 1 : 0), 0, source);
	return result.every((item, i) => item === snippets[i]) ? snippets : result;
}
