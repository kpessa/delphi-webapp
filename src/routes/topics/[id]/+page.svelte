<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Select } from '$lib/components/ui/select';
	import FeedbackCard from '$lib/components/feedback/FeedbackCard.svelte';
	import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
	import { getTopic } from '$lib/firebase/topics';
	import { getFeedbackByTopic, createFeedback } from '$lib/firebase/feedback';
	import type { Topic, Feedback } from '$lib/firebase/types';
	import { ArrowLeft, Wand2, Send } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let user: AuthUser | null = null;
	let topic: Topic | null = null;
	let feedbackList: Feedback[] = [];
	let loading = true;
	let submitting = false;
	
	let newFeedback = $state({
		content: '',
		type: 'idea' as Feedback['type']
	});

	onMount(() => {
		const unsubscribe = subscribeToAuthState(async (authUser) => {
			if (!authUser) {
				goto('/auth/login');
			} else {
				user = authUser;
				await loadTopic();
			}
		});

		return unsubscribe;
	});

	async function loadTopic() {
		const topicId = $page.params.id;
		
		try {
			loading = true;
			topic = await getTopic(topicId);
			
			if (!topic) {
				toast.error('Topic not found');
				goto('/topics');
				return;
			}
			
			feedbackList = await getFeedbackByTopic(topicId);
		} catch (error) {
			console.error('Error loading topic:', error);
			toast.error('Failed to load topic');
			goto('/topics');
		} finally {
			loading = false;
		}
	}

	async function submitFeedback() {
		if (!user || !topic || !newFeedback.content.trim()) return;

		try {
			submitting = true;
			await createFeedback({
				topicId: topic.id,
				panelId: topic.panelId,
				expertId: user.uid,
				roundId: topic.currentRoundId || '',
				roundNumber: topic.roundNumber,
				type: newFeedback.type,
				content: newFeedback.content.trim(),
				parentId: null,
				metadata: {}
			});
			
			toast.success('Feedback submitted successfully');
			newFeedback.content = '';
			await loadTopic(); // Reload to get new feedback
		} catch (error) {
			console.error('Error submitting feedback:', error);
			toast.error('Failed to submit feedback');
		} finally {
			submitting = false;
		}
	}

	function getStatusBadgeVariant(status: string) {
		const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
			active: 'default',
			draft: 'secondary',
			completed: 'outline'
		};
		return variants[status] || 'secondary';
	}

	const feedbackByType = $derived({
		ideas: feedbackList.filter(f => f.type === 'idea'),
		solutions: feedbackList.filter(f => f.type === 'solution'),
		concerns: feedbackList.filter(f => f.type === 'concern')
	});
</script>

<svelte:head>
	<title>{topic?.title || 'Topic'} - Delphi Platform</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<p class="text-gray-500">Loading topic...</p>
		</div>
	{:else if topic}
		<header class="bg-white shadow">
			<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<Button
							href="/topics"
							variant="ghost"
							size="sm"
							class="mb-2 -ml-2"
						>
							<ArrowLeft class="h-4 w-4 mr-2" />
							Back to Topics
						</Button>
						<h1 class="text-3xl font-bold text-gray-900">{topic.title}</h1>
						<div class="mt-2 flex items-center gap-4">
							<Badge variant={getStatusBadgeVariant(topic.status)}>
								{topic.status}
							</Badge>
							<span class="text-sm text-gray-600">Round {topic.roundNumber}</span>
							{#if topic.aiExtracted}
								<div class="flex items-center gap-1 text-sm text-gray-600">
									<Wand2 class="h-4 w-4" />
									<span>AI Extracted</span>
									{#if topic.aiConfidence}
										<span>({Math.round(topic.aiConfidence * 100)}% confidence)</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</header>

		<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="grid gap-6 lg:grid-cols-3">
				<div class="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Discussion Question</CardTitle>
						</CardHeader>
						<CardContent>
							<p class="text-lg">{topic.question}</p>
							{#if topic.description}
								<div class="mt-4">
									<h4 class="font-medium text-sm text-gray-600 mb-2">Context</h4>
									<p class="text-sm text-gray-700">{topic.description}</p>
								</div>
							{/if}
							{#if topic.rawInput && topic.aiExtracted}
								<div class="mt-4">
									<h4 class="font-medium text-sm text-gray-600 mb-2">Original Input</h4>
									<div class="p-3 bg-gray-50 rounded-md">
										<p class="text-sm text-gray-700 whitespace-pre-wrap">{topic.rawInput}</p>
									</div>
								</div>
							{/if}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Submit Feedback</CardTitle>
							<CardDescription>
								Share your thoughts, solutions, or concerns about this topic
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-4">
								<div>
									<Select bind:value={newFeedback.type} class="w-full">
										<option value="idea">💡 Idea</option>
										<option value="solution">⚡ Solution</option>
										<option value="concern">⚠️ Concern</option>
									</Select>
								</div>
								<Textarea
									bind:value={newFeedback.content}
									placeholder="Share your feedback..."
									rows={4}
								/>
								<Button
									on:click={submitFeedback}
									disabled={submitting || !newFeedback.content.trim()}
									class="w-full"
								>
									<Send class="h-4 w-4 mr-2" />
									Submit Feedback
								</Button>
							</div>
						</CardContent>
					</Card>

					<Tabs defaultValue="all" class="w-full">
						<TabsList class="grid w-full grid-cols-4">
							<TabsTrigger value="all">All ({feedbackList.length})</TabsTrigger>
							<TabsTrigger value="ideas">Ideas ({feedbackByType.ideas.length})</TabsTrigger>
							<TabsTrigger value="solutions">Solutions ({feedbackByType.solutions.length})</TabsTrigger>
							<TabsTrigger value="concerns">Concerns ({feedbackByType.concerns.length})</TabsTrigger>
						</TabsList>
						<TabsContent value="all" class="space-y-4">
							{#if feedbackList.length === 0}
								<Card>
									<CardContent class="text-center py-8">
										<p class="text-muted-foreground">No feedback yet. Be the first to contribute!</p>
									</CardContent>
								</Card>
							{:else}
								{#each feedbackList as feedback}
									<FeedbackCard {feedback} />
								{/each}
							{/if}
						</TabsContent>
						<TabsContent value="ideas" class="space-y-4">
							{#if feedbackByType.ideas.length === 0}
								<Card>
									<CardContent class="text-center py-8">
										<p class="text-muted-foreground">No ideas submitted yet.</p>
									</CardContent>
								</Card>
							{:else}
								{#each feedbackByType.ideas as feedback}
									<FeedbackCard {feedback} />
								{/each}
							{/if}
						</TabsContent>
						<TabsContent value="solutions" class="space-y-4">
							{#if feedbackByType.solutions.length === 0}
								<Card>
									<CardContent class="text-center py-8">
										<p class="text-muted-foreground">No solutions proposed yet.</p>
									</CardContent>
								</Card>
							{:else}
								{#each feedbackByType.solutions as feedback}
									<FeedbackCard {feedback} />
								{/each}
							{/if}
						</TabsContent>
						<TabsContent value="concerns" class="space-y-4">
							{#if feedbackByType.concerns.length === 0}
								<Card>
									<CardContent class="text-center py-8">
										<p class="text-muted-foreground">No concerns raised yet.</p>
									</CardContent>
								</Card>
							{:else}
								{#each feedbackByType.concerns as feedback}
									<FeedbackCard {feedback} />
								{/each}
							{/if}
						</TabsContent>
					</Tabs>
				</div>

				<div class="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Topic Details</CardTitle>
						</CardHeader>
						<CardContent class="space-y-3">
							<div>
								<span class="text-sm font-medium text-gray-600">Status</span>
								<p class="text-sm">{topic.status}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-600">Current Round</span>
								<p class="text-sm">Round {topic.roundNumber}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-600">Created</span>
								<p class="text-sm">{new Date(topic.createdAt).toLocaleDateString()}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-600">Last Updated</span>
								<p class="text-sm">{new Date(topic.updatedAt).toLocaleDateString()}</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Round Guidelines</CardTitle>
						</CardHeader>
						<CardContent>
							<ul class="space-y-2 text-sm text-gray-600">
								<li>• Review the topic question carefully</li>
								<li>• Consider other experts' feedback</li>
								<li>• Provide constructive input</li>
								<li>• Vote on feedback you find valuable</li>
								<li>• Refine ideas through discussion</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	{/if}
</div>