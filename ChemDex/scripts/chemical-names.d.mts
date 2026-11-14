export function chemicalText(text: string, options?: {exact?: boolean}): string;
export function chemicalData<T>(value: T, field?: string): T;
export function chemicalSource(source: string, filename?: string): string;
export function chemicalHtml(source: string): string;
export function chemicalNamesPlugin(): {name: string; enforce: 'pre'; transform(source: string, id: string): {code: string; map: null} | null | undefined};
