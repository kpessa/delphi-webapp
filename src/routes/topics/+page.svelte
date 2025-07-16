<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCaption,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { getTopicsByCreator } from '$lib/firebase/topics';
	import type { Topic } from '$lib/firebase/types';
	import { Plus, Edit, Trash2, Wand2 } from 'lucide-svelte';

	let user: AuthUser | null = null;
	let topics: Topic[] = [];
	let loading = true;

	onMount(() => {
		const unsubscribe = subscribeToAuthState(async (authUser) => {
			if (!authUser) {
				goto('/auth/login');
			} else {
				user = authUser;
				await loadTopics();
			}
		});

		return unsubscribe;
	});

	async function loadTopics() {
		if (!user) return;
		
		try {
			loading = true;
			topics = await getTopicsByCreator(user.uid);
		} catch (error) {
			console.error('Error loading topics:', error);
		} finally {
			loading = false;
		}
	}

	function getStatusBadgeVariant(status: string) {
		const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
			open: 'default',
			closed: 'secondary'
		};
		return variants[status] || 'secondary';
	}
</script>

<svelte:head>
	<title>Topics - Delphi Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Topics</h1>
					<p class="mt-1 text-sm text-gray-600">
						Manage discussion topics for expert panels using the Delphi method
					</p>
				</div>
				<Button href="/topics/new" class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					Create Topic
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500">Loading topics...</p>
			</div>
		{:else if topics.length === 0}
			<div class="rounded-lg bg-white p-8 text-center shadow">
				<h3 class="text-lg font-medium text-gray-900">No topics yet</h3>
				<p class="mt-2 text-sm text-gray-500">
					Get started by creating your first topic for expert discussion.
				</p>
				<Button href="/topics/new" class="mt-4">
					Create Your First Topic
				</Button>
			</div>
		{:else}
			<div class="rounded-lg bg-white shadow">
				<Table>
					<TableCaption>A list of your Delphi method topics</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Question</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Round</TableHead>
							<TableHead>Source</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each topics as topic}
							<TableRow>
								<TableCell class="font-medium max-w-xs">
									<a href="/topics/{topic.id}" class="hover:underline truncate block">
										{topic.title}
									</a>
								</TableCell>
								<TableCell class="max-w-md truncate">{topic.question}</TableCell>
								<TableCell>
									<Badge variant={getStatusBadgeVariant(topic.status)}>
										{topic.status}
									</Badge>
								</TableCell>
								<TableCell>{topic.roundNumber}</TableCell>
								<TableCell>
									{#if topic.aiExtracted}
										<div class="flex items-center gap-1">
											<Wand2 class="h-3 w-3" />
											<span class="text-xs">AI</span>
										</div>
									{:else}
										<span class="text-xs">Manual</span>
									{/if}
								</TableCell>
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-2">
										<Button
											href="/topics/{topic.id}"
											variant="ghost"
											size="sm"
											title="View topic"
										>
											View
										</Button>
										<Button
											href="/topics/{topic.id}/edit"
											variant="ghost"
											size="sm"
											title="Edit topic"
										>
											<Edit class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="text-destructive"
											title="Delete topic"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		{/if}
	</main>
</div>