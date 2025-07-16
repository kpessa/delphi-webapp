<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import { Select } from "$lib/components/ui/select";
  import { Badge } from "$lib/components/ui/badge";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { 
    Lightbulb, 
    Wrench, 
    AlertTriangle, 
    ChevronDown,
    ChevronUp,
    Bell,
    Loader2
  } from "lucide-svelte";
  import FeedbackCard from "./FeedbackCard.svelte";
  import FeedbackSubmission from "./FeedbackSubmission.svelte";
  import { getFeedbackForTopic, subscribeToNewFeedback } from "$lib/firebase/feedback";
  import type { Feedback, FeedbackType } from "$lib/firebase/types";
  import type { Unsubscribe } from "firebase/firestore";

  interface Props {
    topicId: string;
    panelId: string;
    roundNumber: number;
    disabled?: boolean;
  }

  let { topicId, panelId, roundNumber, disabled = false }: Props = $props();

  let feedbackList = $state<Feedback[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let sortBy = $state<'newest' | 'votes' | 'type'>('newest');
  let collapsedSections = $state<Set<FeedbackType>>(new Set());
  let hasNewFeedback = $state(false);
  let refineFeedback = $state<Feedback | null>(null);

  let unsubscribeFeedback: Unsubscribe | null = null;
  let unsubscribeNewFeedback: Unsubscribe | null = null;

  const feedbackTypes: { type: FeedbackType; icon: any; color: string }[] = [
    { type: 'idea', icon: Lightbulb, color: 'text-blue-500' },
    { type: 'solution', icon: Wrench, color: 'text-green-500' },
    { type: 'concern', icon: AlertTriangle, color: 'text-orange-500' }
  ];

  const sortedFeedback = $derived.by(() => {
    const sorted = [...feedbackList];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'votes':
        return sorted.sort((a, b) => {
          const aNetVotes = a.upvotes.length - a.downvotes.length;
          const bNetVotes = b.upvotes.length - b.downvotes.length;
          return bNetVotes - aNetVotes;
        });
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return sorted;
    }
  });

  const groupedFeedback = $derived.by(() => {
    const groups: Record<FeedbackType, Feedback[]> = {
      idea: [],
      solution: [],
      concern: [],
      vote: [],
      refinement: []
    };

    sortedFeedback.forEach(feedback => {
      if (feedback.type in groups) {
        groups[feedback.type].push(feedback);
      }
    });

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([type, items]) => ({
        type: type as FeedbackType,
        items,
        count: items.length
      }));
  });

  function toggleSection(type: FeedbackType) {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(type)) {
      newCollapsed.delete(type);
    } else {
      newCollapsed.add(type);
    }
    collapsedSections = newCollapsed;
  }

  function handleNewFeedback(feedback: Feedback) {
    feedbackList = [feedback, ...feedbackList];
    hasNewFeedback = true;
    setTimeout(() => hasNewFeedback = false, 5000);
  }

  function handleRefine(feedback: Feedback) {
    refineFeedback = feedback;
  }

  function handleSubmitSuccess() {
    refineFeedback = null;
  }

  onMount(() => {
    loading = true;
    
    unsubscribeFeedback = getFeedbackForTopic(topicId, roundNumber, (feedback) => {
      feedbackList = feedback;
      loading = false;
      error = null;
    });

    unsubscribeNewFeedback = subscribeToNewFeedback(topicId, roundNumber, handleNewFeedback);
  });

  onDestroy(() => {
    unsubscribeFeedback?.();
    unsubscribeNewFeedback?.();
  });
</script>

<div class="space-y-4">
  {#if refineFeedback}
    <div class="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => refineFeedback = null}
        class="mb-2"
      >
        ← Back to new feedback
      </Button>
      <FeedbackSubmission
        {topicId}
        {panelId}
        {roundNumber}
        {disabled}
        parentFeedback={refineFeedback}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </div>
  {:else}
    <FeedbackSubmission
      {topicId}
      {panelId}
      {roundNumber}
      {disabled}
      onSubmitSuccess={handleSubmitSuccess}
    />
  {/if}

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <h3 class="text-lg font-semibold">Community Feedback</h3>
      {#if hasNewFeedback}
        <Badge variant="default" class="animate-pulse">
          <Bell class="h-3 w-3 mr-1" />
          New
        </Badge>
      {/if}
    </div>
    
    <Select bind:value={sortBy} class="w-40">
      <option value="newest">Newest First</option>
      <option value="votes">Most Voted</option>
      <option value="type">By Type</option>
    </Select>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  {:else if error}
    <Alert variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {:else if feedbackList.length === 0}
    <Card>
      <CardContent class="text-center py-12">
        <p class="text-muted-foreground">No feedback yet. Be the first to contribute!</p>
      </CardContent>
    </Card>
  {:else}
    <div class="space-y-4">
      {#each groupedFeedback as group}
        {@const typeConfig = feedbackTypes.find(t => t.type === group.type)}
        {@const isCollapsed = collapsedSections.has(group.type)}
        
        <Card>
          <CardHeader 
            class="cursor-pointer"
            onclick={() => toggleSection(group.type)}
          >
            <CardTitle class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                {#if typeConfig}
                  {@const IconComponent = typeConfig.icon}
                  <IconComponent class="h-5 w-5 {typeConfig.color}" />
                {/if}
                <span class="capitalize">{group.type}s</span>
                <Badge variant="secondary">{group.count}</Badge>
              </div>
              {#if isCollapsed}
                <ChevronDown class="h-5 w-5" />
              {:else}
                <ChevronUp class="h-5 w-5" />
              {/if}
            </CardTitle>
          </CardHeader>
          
          {#if !isCollapsed}
            <CardContent class="space-y-3">
              {#each group.items as feedback (feedback.id)}
                <FeedbackCard 
                  {feedback} 
                  onRefine={handleRefine}
                  showRefineButton={!disabled}
                />
              {/each}
            </CardContent>
          {/if}
        </Card>
      {/each}
    </div>
  {/if}
</div>