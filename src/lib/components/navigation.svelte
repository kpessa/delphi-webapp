<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { logOut } from '$lib/firebase/auth';
	import { goto } from '$app/navigation';
	import { themeStore } from '$lib/stores/theme.svelte';
	
	async function handleLogout() {
		try {
			await logOut();
			goto('/auth/login');
		} catch (error) {
			console.error('Error logging out:', error);
		}
	}
</script>

<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-14 items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/" class="flex items-center gap-2">
				{#if themeStore.isDark}
					<img 
						src="/brand-dark.png" 
						alt="Delphi Logo" 
						class="h-8 w-auto"
					/>
				{:else}
					<img 
						src="/brand-light.png" 
						alt="Delphi Logo" 
						class="h-8 w-auto"
					/>
				{/if}
				<span class="font-semibold">Delphi Platform</span>
			</a>
			
			{#if authStore.isAuthenticated}
				<nav class="hidden md:flex items-center gap-4 text-sm">
					<a
						href="/dashboard"
						class="transition-colors hover:text-foreground/80 text-foreground/60"
					>
						Dashboard
					</a>
					<a
						href="/topics"
						class="transition-colors hover:text-foreground/80 text-foreground/60"
					>
						Topics
					</a>
					<a
						href="/panels"
						class="transition-colors hover:text-foreground/80 text-foreground/60"
					>
						Panels
					</a>
				</nav>
			{/if}
		</div>
		
		<div class="flex items-center gap-2">
			<ThemeToggle />
			
			{#if authStore.isAuthenticated}
				<Button on:click={handleLogout} variant="ghost" size="sm">
					Sign Out
				</Button>
			{:else}
				<Button href="/auth/login" variant="ghost" size="sm">
					Sign In
				</Button>
			{/if}
		</div>
	</div>
</header>