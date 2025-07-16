<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { getPanels, type Panel } from '$lib/firebase/panels';
	import { Users, FileText } from 'lucide-svelte';
	
	let user: AuthUser | null = null;
	let panels: Panel[] = [];
	let loading = true;
	
	onMount(() => {
		const unsubscribe = subscribeToAuthState(async (authUser) => {
			if (!authUser) {
				// Redirect to login if not authenticated
				goto('/auth/login');
			} else {
				user = authUser;
				await loadStats();
			}
		});
		
		return unsubscribe;
	});
	
	async function loadStats() {
		try {
			panels = await getPanels();
		} catch (error) {
			console.error('Error loading stats:', error);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Delphi Platform</title>
</svelte:head>

<div class="py-8">
		<h1 class="text-3xl font-bold mb-6">Dashboard</h1>
		
		{#if user}
			<div class="rounded-lg bg-card p-6 shadow-sm border">
				<h2 class="text-lg font-medium">Welcome!</h2>
				<p class="mt-1 text-muted-foreground">
					Signed in as: {user.email || user.displayName || 'User'}
				</p>
				<p class="mt-1 text-sm text-muted-foreground">
					User ID: {user.uid}
				</p>
			</div>
			
			<div class="mt-6 grid gap-6 md:grid-cols-3">
				<div class="rounded-lg bg-card p-6 shadow-sm border">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium text-muted-foreground">Expert Panels</h3>
						<Users class="h-4 w-4 text-muted-foreground" />
					</div>
					<div class="mt-2">
						<p class="text-2xl font-bold">
							{loading ? '...' : panels.length}
						</p>
						<p class="text-xs text-muted-foreground">Active panels</p>
					</div>
					<Button href="/panels" variant="link" class="mt-4 p-0 h-auto">
						View all panels →
					</Button>
				</div>
				
				<div class="rounded-lg bg-card p-6 shadow-sm border">
					<h3 class="text-lg font-medium">Quick Actions</h3>
					<div class="mt-4 space-y-2">
						<Button href="/topics" variant="outline" class="w-full justify-start">
							View All Topics
						</Button>
						<Button href="/topics/new" class="w-full justify-start">
							Create New Topic
						</Button>
					</div>
				</div>
				
				<div class="rounded-lg bg-primary/5 p-6 border border-primary/10">
					<h3 class="text-lg font-medium">Next Steps</h3>
					<ul class="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
						<li>Create topics from meeting notes or email threads using AI</li>
						<li>Invite experts to join discussion panels</li>
						<li>Collect feedback through multiple rounds</li>
						<li>Monitor consensus building in real-time</li>
					</ul>
				</div>
			</div>
		{/if}
</div>