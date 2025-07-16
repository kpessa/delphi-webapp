<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { Feedback } from '$lib/firebase/types';
  import { Card } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { ThumbsUp, Lightbulb, AlertCircle, MessageSquare } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface Props {
    topicId: string;
    roundNumber: number;
    canVote?: boolean;
  }

  let { topicId, roundNumber, canVote = false }: Props = $props();

  let feedback: Feedback[] = $state([]);
  let loading: boolean = $state(true);
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    const feedbackRef = collection(db, 'feedback');
    const q = query(
      feedbackRef,
      where('topicId', '==', topicId),
      where('roundNumber', '==', roundNumber),
      orderBy('voteCount', 'desc'),
      orderBy('createdAt', 'desc')
    );

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        feedback = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Feedback));
        loading = false;
      },
      (error) => {
        console.error('Error loading feedback:', error);
        loading = false;
      }
    );
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  async function handleVote(feedbackId: string, hasVoted: boolean) {
    if (!canVote || !authStore.user) return;

    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      const currentFeedback = feedback.find(f => f.id === feedbackId);
      if (!currentFeedback) return;

      if (hasVoted) {
        await updateDoc(feedbackRef, {
          voteCount: currentFeedback.voteCount - 1,
          voters: arrayRemove(authStore.user.uid)
        });
      } else {
        await updateDoc(feedbackRef, {
          voteCount: currentFeedback.voteCount + 1,
          voters: arrayUnion(authStore.user.uid)
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'idea': return Lightbulb;
      case 'concern': return AlertCircle;
      case 'solution': return ThumbsUp;
      default: return MessageSquare;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'idea': return 'bg-blue-100 text-blue-800';
      case 'concern': return 'bg-red-100 text-red-800';
      case 'solution': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  let groupedFeedback = $derived(feedback.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, Feedback[]>));
</script>

<div class="space-y-6">
  {#if loading}
    <div class="space-y-3">
      {#each Array(3) as _}
        <Skeleton class="h-24 w-full" />
      {/each}
    </div>
  {:else if feedback.length === 0}
    <Card class="p-8 text-center">
      <MessageSquare class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p class="text-muted-foreground">No feedback yet. Be the first to share your thoughts!</p>
    </Card>
  {:else}
    {#each Object.entries(groupedFeedback) as [type, items]}
      {@const Icon = getTypeIcon(type)}
      <div>
        <h4 class="font-medium mb-3 flex items-center gap-2">
          <Icon class="h-4 w-4" />
          {type.charAt(0).toUpperCase() + type.slice(1)}s ({items.length})
        </h4>
        
        <div class="space-y-3">
          {#each items as item}
            {@const hasVoted = authStore.user ? item.voters.includes(authStore.user.uid) : false}
            
            <Card class="p-4">
              <div class="flex items-start gap-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" class={`${getTypeColor(item.type)} text-xs`}>
                      {item.type}
                    </Badge>
                    <span class="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p class="text-sm">{item.content}</p>
                </div>
                
                <div class="flex flex-col items-center gap-1">
                  <Button
                    variant={hasVoted ? "default" : "outline"}
                    size="sm"
                    onclick={() => handleVote(item.id!, hasVoted)}
                    disabled={!canVote}
                    class="h-auto px-2 py-1"
                  >
                    <ThumbsUp class="h-3 w-3" />
                  </Button>
                  <span class="text-xs font-medium">{item.voteCount}</span>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>