<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeToAuthState, logOut, type AuthUser } from '$lib/firebase/auth';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	
	let user: AuthUser | null = null;
	
	onMount(() => {
		const unsubscribe = subscribeToAuthState((authUser) => {
			if (!authUser) {
				// Redirect to login if not authenticated
				goto('/auth/login');
			} else {
				user = authUser;
			}
		});
		
		return unsubscribe;
	});
	
	async function handleLogout() {
		try {
			await logOut();
			goto('/auth/login');
		} catch (error) {
			console.error('Error logging out:', error);
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
				<Button on:click={handleLogout} variant="outline">
					Sign Out
				</Button>
			</div>
		</div>
	</header>
	
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if user}
			<div class="rounded-lg bg-white p-6 shadow">
				<h2 class="text-lg font-medium">Welcome!</h2>
				<p class="mt-1 text-gray-600">
					Signed in as: {user.email || user.displayName || 'User'}
				</p>
				<p class="mt-1 text-sm text-gray-500">
					User ID: {user.uid}
				</p>
			</div>
			
			<div class="mt-6 grid gap-6 md:grid-cols-2">
				<div class="rounded-lg bg-white p-6 shadow">
					<h3 class="text-lg font-medium">Quick Actions</h3>
					<div class="mt-4 space-y-2">
						<Button href="/items" variant="outline" class="w-full justify-start">
							View All Items
						</Button>
						<Button href="/items/new" class="w-full justify-start">
							Create New Item
						</Button>
					</div>
				</div>
				
				<div class="rounded-lg bg-blue-50 p-6">
					<h3 class="text-lg font-medium text-blue-900">Next Steps</h3>
					<ul class="mt-2 list-inside list-disc space-y-1 text-blue-800">
						<li>Create items (initiatives, assessments, consultations)</li>
						<li>Invite facility leaders and subject matter experts</li>
						<li>Configure voting rounds and questions</li>
						<li>Monitor real-time feedback from participants</li>
					</ul>
				</div>
			</div>
		{/if}
	</main>
</div>