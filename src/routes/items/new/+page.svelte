<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ItemForm from '$lib/components/items/ItemForm.svelte';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { createItem } from '$lib/firebase/items';
	import type { Item } from '$lib/firebase/types';
	import { toast } from 'svelte-sonner';

	let user: AuthUser | null = null;
	let isSubmitting = false;

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

	async function handleSubmit(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
		if (!user) return;

		try {
			isSubmitting = true;
			const itemData = {
				...data,
				adminIds: [user.uid]
			};
			await createItem(itemData);
			toast.success('Item created successfully');
			goto('/items');
		} catch (error) {
			console.error('Error creating item:', error);
			toast.error('Failed to create item. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Item - Delphi Healthcare Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<h1 class="text-3xl font-bold text-gray-900">Create New Item</h1>
			<p class="mt-1 text-sm text-gray-600">
				Set up a new Delphi technique process for your healthcare system
			</p>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="rounded-lg bg-white p-6 shadow">
			<ItemForm onSubmit={handleSubmit} {isSubmitting} />
		</div>
	</main>
</div>