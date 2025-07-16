<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import TopicForm from '$lib/components/topics/TopicForm.svelte';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { createTopic } from '$lib/firebase/topics';
	import { getPanels } from '$lib/firebase/panels';
	import type { Topic, Panel } from '$lib/firebase/types';
	import { toast } from 'svelte-sonner';

	let user: AuthUser | null = null;
	let isSubmitting = false;
	let panels: Panel[] = [];
	let selectedPanelId: string = '';
	let loadingPanels = true;

	onMount(() => {
		const unsubscribe = subscribeToAuthState(async (authUser) => {
			if (!authUser) {
				goto('/auth/login');
			} else {
				user = authUser;
				await loadPanels();
			}
		});

		return unsubscribe;
	});

	async function loadPanels() {
		try {
			loadingPanels = true;
			// Get all panels where user is admin or expert
			const allPanels = await getPanels();
			
			panels = allPanels.filter(panel => {
				// Check both adminIds and creatorId for backward compatibility
				const isAdmin = panel.adminIds?.includes(user?.uid || '') || panel.creatorId === user?.uid || false;
				const isExpert = panel.expertIds?.includes(user?.uid || '') || false;
				return isAdmin || isExpert;
			});
			
			// Don't auto-select - let user choose
		} catch (error) {
			console.error('Error loading panels:', error);
			toast.error('Failed to load panels');
		} finally {
			loadingPanels = false;
		}
	}

	async function handleSubmit(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) {
		if (!user) return;
		
		// Validate panel selection
		if (!data.panelId) {
			toast.error('Please select a panel for this topic');
			return;
		}

		try {
			isSubmitting = true;
			await createTopic(data);
			toast.success('Topic created successfully');
			goto('/topics');
		} catch (error) {
			console.error('Error creating topic:', error);
			toast.error('Failed to create topic. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Topic - Delphi Platform</title>
</svelte:head>

<div class="py-6 md:py-8">
	<div class="mb-6">
		<h1 class="text-2xl md:text-3xl font-bold mb-2">Create New Topic</h1>
		<p class="text-sm md:text-base text-muted-foreground">
			Create a topic for expert discussion using AI extraction or manual entry
		</p>
	</div>

	<div class="rounded-lg bg-card p-4 md:p-6 shadow-sm border">
			{#if user}
				{#if loadingPanels}
					<div class="text-center py-6 md:py-8">
						<p class="text-muted-foreground">Loading panels...</p>
					</div>
				{:else if panels.length === 0}
					<div class="text-center py-6 md:py-8">
						<p class="text-muted-foreground mb-4">You need to be part of a panel to create topics.</p>
						<a href="/panels" class="text-primary hover:underline">View Panels</a>
					</div>
				{:else}
					<TopicForm 
						onSubmit={handleSubmit} 
						{isSubmitting} 
						panelId={selectedPanelId}
						userId={user.uid}
						{panels}
						bind:selectedPanelId
					/>
				{/if}
			{/if}
		</div>
</div>