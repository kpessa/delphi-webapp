<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardFooter } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { 
    Lightbulb, 
    Wrench, 
    AlertTriangle, 
    ThumbsUp, 
    ThumbsDown, 
    MessageSquare,
    Clock
  } from "lucide-svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { voteFeedback, removeVote } from "$lib/firebase/feedback";
  import type { Feedback } from "$lib/firebase/types";

  interface Props {
    feedback: Feedback;
    onRefine?: (feedback: Feedback) => void;
    showRefineButton?: boolean;
  }

  let { feedback, onRefine, showRefineButton = true }: Props = $props();

  let isVoting = $state(false);
  let userVote = $state<'up' | 'down' | null>(null);

  // Calculate vote counts and user vote state
  const upvoteCount = $derived(feedback.upvotes.length);
  const downvoteCount = $derived(feedback.downvotes.length);
  const netVoteCount = $derived(upvoteCount - downvoteCount);

  $effect(() => {
    if (authStore.user) {
      const userId = authStore.user.uid;
      if (feedback.upvotes.includes(userId)) {
        userVote = 'up';
      } else if (feedback.downvotes.includes(userId)) {
        userVote = 'down';
      } else {
        userVote = null;
      }
    } else {
      userVote = null;
    }
  });

  const typeConfig = {
    idea: { icon: Lightbulb, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950" },
    solution: { icon: Wrench, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950" },
    concern: { icon: AlertTriangle, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950" },
    refinement: { icon: MessageSquare, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950" },
    vote: { icon: ThumbsUp, color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-950" }
  };

  const config = typeConfig[feedback.type];
  const Icon = config.icon;

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  async function handleVote(voteType: 'up' | 'down') {
    if (!authStore.user || isVoting) return;

    isVoting = true;

    try {
      if (userVote === voteType) {
        // User is clicking the same vote type - remove their vote
        await removeVote(feedback.id!, authStore.user.uid, voteType);
      } else {
        // User is either switching vote type or voting for the first time
        await voteFeedback(feedback.id!, authStore.user.uid, voteType);
      }
    } catch (error) {
      console.error('Error voting on feedback:', error);
    } finally {
      isVoting = false;
    }
  }
</script>

<Card class="w-full hover:shadow-md transition-shadow">
  <CardContent class="pt-6">
    <div class="flex items-start gap-4">
      <div class="p-2 rounded-lg {config.bgColor}">
        <Icon class="h-5 w-5 {config.color}" />
      </div>
      
      <div class="flex-1 space-y-2">
        <div class="flex items-center gap-2">
          <Badge variant="secondary" class="text-xs">
            {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
          </Badge>
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <Clock class="h-3 w-3" />
            {getRelativeTime(feedback.createdAt)}
          </span>
        </div>
        
        <p class="text-sm whitespace-pre-wrap">{feedback.content}</p>
        
        {#if feedback.parentId}
          <div class="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare class="h-3 w-3" />
            Refinement of previous feedback
          </div>
        {/if}
      </div>
    </div>
  </CardContent>
  
  <CardFooter class="pt-0 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Button
        variant={userVote === 'up' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => handleVote('up')}
        disabled={isVoting || !authStore.user}
        class="h-8 px-2"
      >
        <ThumbsUp class="h-4 w-4 mr-1" />
        {upvoteCount}
      </Button>
      
      <Button
        variant={userVote === 'down' ? 'default' : 'ghost'}
        size="sm"
        onclick={() => handleVote('down')}
        disabled={isVoting || !authStore.user}
        class="h-8 px-2"
      >
        <ThumbsDown class="h-4 w-4 mr-1" />
        {downvoteCount}
      </Button>
      
      {#if netVoteCount !== 0}
        <span class="text-sm text-muted-foreground ml-2">
          Net: {netVoteCount > 0 ? '+' : ''}{netVoteCount}
        </span>
      {/if}
    </div>
    
    {#if showRefineButton && onRefine && authStore.user}
      <Button
        variant="ghost"
        size="sm"
        onclick={() => onRefine(feedback)}
        class="h-8"
      >
        <MessageSquare class="h-4 w-4 mr-1" />
        Refine
      </Button>
    {/if}
  </CardFooter>
</Card>