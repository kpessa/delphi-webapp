<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon } from 'lucide-svelte';
	
	function handleToggle() {
		toggleMode();
	}
</script>

<Button
	on:click={handleToggle}
	variant="ghost"
	size="icon"
	class="relative h-9 w-9"
	aria-label="Toggle theme"
>
	<Sun class="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
	<Moon class="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
</Button>