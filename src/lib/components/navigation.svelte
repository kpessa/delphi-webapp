<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { logOut } from '$lib/firebase/auth';
	import { goto } from '$app/navigation';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { Menu, Home, FileText, Users, LogOut } from 'lucide-svelte';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetTrigger,
	} from '$lib/components/ui/sheet';
	import { page } from '$app/stores';
	
	let mobileNavOpen = $state(false);
	
	async function handleLogout() {
		try {
			await logOut();
			goto('/auth/login');
		} catch (error) {
			console.error('Error logging out:', error);
		}
	}
	
	function closeMobileNav() {
		mobileNavOpen = false;
	}
</script>

<header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
						class="transition-colors hover:text-foreground/80 {$page.url.pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'}"
					>
						Dashboard
					</a>
					<a
						href="/topics"
						class="transition-colors hover:text-foreground/80 {$page.url.pathname.startsWith('/topics') ? 'text-foreground' : 'text-foreground/60'}"
					>
						Topics
					</a>
					<a
						href="/panels"
						class="transition-colors hover:text-foreground/80 {$page.url.pathname.startsWith('/panels') ? 'text-foreground' : 'text-foreground/60'}"
					>
						Panels
					</a>
				</nav>
			{/if}
		</div>
		
		<div class="flex items-center gap-2">
			<ThemeToggle />
			
			{#if authStore.isAuthenticated}
				<NotificationBell />
				<Button on:click={handleLogout} variant="ghost" size="sm" class="hidden md:inline-flex">
					Sign Out
				</Button>
				
				<!-- Mobile menu button -->
				<Sheet bind:open={mobileNavOpen}>
					<SheetTrigger asChild let:builder>
						<Button builders={[builder]} variant="ghost" size="icon" class="md:hidden">
							<Menu class="h-5 w-5" />
							<span class="sr-only">Toggle navigation menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="right" class="w-[300px] sm:w-[350px]">
						<SheetHeader class="mb-8">
							<div class="flex items-center gap-3">
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
								<SheetTitle class="text-xl">Delphi Platform</SheetTitle>
							</div>
							{#if authStore.user}
								<p class="text-sm text-muted-foreground mt-2">
									{authStore.user.email || authStore.user.displayName || 'User'}
								</p>
							{/if}
						</SheetHeader>
						<nav class="flex flex-col gap-2">
							<a
								href="/dashboard"
								on:click={closeMobileNav}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground {$page.url.pathname === '/dashboard' ? 'bg-accent text-accent-foreground' : 'text-foreground/70'}"
							>
								<Home class="h-5 w-5" />
								Dashboard
							</a>
							<a
								href="/topics"
								on:click={closeMobileNav}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground {$page.url.pathname.startsWith('/topics') ? 'bg-accent text-accent-foreground' : 'text-foreground/70'}"
							>
								<FileText class="h-5 w-5" />
								Topics
							</a>
							<a
								href="/panels"
								on:click={closeMobileNav}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground {$page.url.pathname.startsWith('/panels') ? 'bg-accent text-accent-foreground' : 'text-foreground/70'}"
							>
								<Users class="h-5 w-5" />
								Panels
							</a>
							<div class="mt-auto pt-6 border-t">
								<Button on:click={() => { handleLogout(); closeMobileNav(); }} variant="ghost" class="w-full justify-start gap-3" size="default">
									<LogOut class="h-5 w-5" />
									Sign Out
								</Button>
							</div>
						</nav>
					</SheetContent>
				</Sheet>
			{:else}
				<Button href="/auth/login" variant="ghost" size="sm">
					Sign In
				</Button>
			{/if}
		</div>
	</div>
</header>