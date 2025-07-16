<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { voteFeedback, getRefinements } from '$lib/firebase/feedback';
	import type { Feedback } from '$lib/firebase/types';
	import { 
		Lightbulb, 
		Zap, 
		AlertTriangle, 
		ThumbsUp, 
		MessageSquare,
		ChevronUp,
		ChevronDown
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { auth } from '$lib/firebase/config';

	export let feedback: Feedback;
	export let showRefinements = true;
	export let depth = 0;

	let refinements: Feedback[] = $state([]);
	let showRefinementsList = $state(false);
	let loadingRefinements = $state(false);
	let isVoting = $state(false);
	let hasVoted = $state(feedback.votedBy.includes(auth.currentUser?.uid || ''));

	const typeIcons = {
		idea: Lightbulb,
		solution: Zap,
		concern: AlertTriangle,
		vote: ThumbsUp,
		refinement: MessageSquare
	};

	const typeColors = {
		idea: 'bg-blue-100 text-blue-800',
		solution: 'bg-green-100 text-green-800',
		concern: 'bg-yellow-100 text-yellow-800',
		vote: 'bg-purple-100 text-purple-800',
		refinement: 'bg-gray-100 text-gray-800'
	};

	async function handleVote() {
		if (!auth.currentUser) {
			toast.error('Please sign in to vote');
			return;
		}

		try {
			isVoting = true;
			await voteFeedback(feedback.id);
			hasVoted = !hasVoted;
			feedback.voteCount += hasVoted ? 1 : -1;
			toast.success(hasVoted ? 'Vote added' : 'Vote removed');
		} catch (error) {
			console.error('Error voting:', error);
			toast.error('Failed to vote. Please try again.');
		} finally {
			isVoting = false;
		}
	}

	async function loadRefinements() {
		if (loadingRefinements || refinements.length > 0) return;

		try {
			loadingRefinements = true;
			refinements = await getRefinements(feedback.id);
		} catch (error) {
			console.error('Error loading refinements:', error);
			toast.error('Failed to load refinements');
		} finally {
			loadingRefinements = false;
		}
	}

	async function toggleRefinements() {
		showRefinementsList = !showRefinementsList;
		if (showRefinementsList && refinements.length === 0) {
			await loadRefinements();
		}
	}

	const Icon = $derived(typeIcons[feedback.type]);
	const colorClass = $derived(typeColors[feedback.type]);
	const refinementCount = $derived(feedback.metadata?.refinementCount || 0);
</script>

<Card class="mb-4 {depth > 0 ? 'ml-8 border-l-2 border-gray-200' : ''}">
	<CardContent class="pt-6">
		<div class="flex items-start gap-4">
			<Avatar class="h-10 w-10">
				<AvatarFallback class={colorClass}>
					<Icon class="h-5 w-5" />
				</AvatarFallback>
			</Avatar>
			
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-2">
					<Badge variant="secondary" class={colorClass}>
						{feedback.type}
					</Badge>
					<span class="text-sm text-muted-foreground">
						Round {feedback.roundNumber}
					</span>
				</div>
				
				<p class="text-sm">{feedback.content}</p>
				
				{#if feedback.metadata?.reasoning}
					<div class="mt-2 p-3 bg-muted/50 rounded-md">
						<p class="text-sm text-muted-foreground">
							<span class="font-medium">Reasoning:</span> {feedback.metadata.reasoning}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</CardContent>
	
	<CardFooter class="flex items-center justify-between pt-0">
		<div class="flex items-center gap-4">
			<Button
				variant={hasVoted ? "default" : "outline"}
				size="sm"
				on:click={handleVote}
				disabled={isVoting}
				class="flex items-center gap-2"
			>
				<ChevronUp class="h-4 w-4" />
				{feedback.voteCount}
			</Button>
			
			{#if showRefinements && refinementCount > 0}
				<Button
					variant="ghost"
					size="sm"
					on:click={toggleRefinements}
					class="flex items-center gap-2"
				>
					<MessageSquare class="h-4 w-4" />
					{refinementCount} refinement{refinementCount === 1 ? '' : 's'}
					{#if showRefinementsList}
						<ChevronUp class="h-4 w-4" />
					{:else}
						<ChevronDown class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		</div>
		
		<span class="text-xs text-muted-foreground">
			{new Date(feedback.createdAt).toLocaleString()}
		</span>
	</CardFooter>
</Card>

{#if showRefinementsList && refinements.length > 0}
	<div class="ml-8 space-y-2">
		{#each refinements as refinement}
			<svelte:self feedback={refinement} showRefinements={false} depth={depth + 1} />
		{/each}
	</div>
{/if}