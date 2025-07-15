let theme = $state<'light' | 'dark'>('light');

// Initialize and watch for changes
if (typeof window !== 'undefined') {
	// Initial check
	theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	
	// Watch for changes
	const observer = new MutationObserver(() => {
		theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	});
	
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class']
	});
}

export const themeStore = {
	get current() {
		return theme;
	},
	get isDark() {
		return theme === 'dark';
	}
};