<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import TopicForm from '$lib/components/topics/TopicForm.svelte';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { createTopic } from '$lib/firebase/topics';
	import type { Topic } from '$lib/firebase/types';
	import { toast } from 'svelte-sonner';

	let user: AuthUser | null = null;
	let isSubmitting = false;
	// For now, we'll use a default panel ID. In a real app, this would come from the user's selected panel
	const DEFAULT_PANEL_ID = 'default-panel';

	onMount(() => {
		const unsubscribe = subscribeToAuthState((authUser) => {
			if (!authUser) {
				goto('/auth/login');
			} else {
				user = authUser;
			}
		});

		return unsubscribe;
	});

	async function handleSubmit(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) {
		if (!user) return;

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

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<h1 class="text-3xl font-bold text-gray-900">Create New Topic</h1>
			<p class="mt-1 text-sm text-gray-600">
				Create a topic for expert discussion using AI extraction or manual entry
			</p>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="rounded-lg bg-white p-6 shadow">
			{#if user}
				<TopicForm 
					onSubmit={handleSubmit} 
					{isSubmitting} 
					panelId={DEFAULT_PANEL_ID}
					userId={user.uid}
				/>
			{/if}
		</div>
	</main>
</div>