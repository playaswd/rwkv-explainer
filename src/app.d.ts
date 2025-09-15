// Extend the Window interface to include dataLayer
declare global {
	interface Window {
		dataLayer: Array<{
			event: string;
			use_cache?: boolean;
			[key: string]: string | number | boolean | undefined;
		}>;
	}
}

export {};
