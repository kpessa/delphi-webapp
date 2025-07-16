<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { Feedback, AgreementLevel } from '$lib/firebase/types';
  import { Card } from '$lib/components/ui/card';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Lightbulb, AlertCircle, ThumbsUp, MessageSquare } from 'lucide-svelte';
  import FeedbackAgreementCard from './FeedbackAgreementCard.svelte';
  import { getPreviousRoundAgreements } from '$lib/firebase/vote-continuity';

  interface Props {
    topicId: string;
    roundNumber: number;
    canVote?: boolean;
  }

  let { topicId, roundNumber, canVote = false }: Props = $props();

  let feedback: Feedback[] = $state([]);
  let loading: boolean = $state(true);
  let unsubscribe: (() => void) | null = null;
  let previousAgreements: Record<string, AgreementLevel> = $state({});

  onMount(async () => {
    // Load previous round agreements for vote continuity
    if (authStore.user && roundNumber > 1) {
      try {
        previousAgreements = await getPreviousRoundAgreements(
          topicId,
          roundNumber,
          authStore.user.uid
        );
      } catch (error) {
        console.error('Error loading previous agreements:', error);
      }
    }

    const feedbackRef = collection(db, 'feedback');
    const q = query(
      feedbackRef,
      where('topicId', '==', topicId),
      where('roundNumber', '==', roundNumber),
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

  // Sort feedback by agreement consensus (average agreement level)
  const sortedFeedback = $derived(
    [...feedback].sort((a, b) => {
      const aAgreements = Object.values(a.agreements || {});
      const bAgreements = Object.values(b.agreements || {});
      
      if (aAgreements.length === 0 && bAgreements.length === 0) return 0;
      if (aAgreements.length === 0) return 1;
      if (bAgreements.length === 0) return -1;
      
      const aAvg = aAgreements.reduce((sum, level) => sum + level, 0) / aAgreements.length;
      const bAvg = bAgreements.reduce((sum, level) => sum + level, 0) / bAgreements.length;
      
      return bAvg - aAvg; // Higher agreement first
    })
  );

  function getTypeIcon(type: string) {
    switch (type) {
      case 'idea': return Lightbulb;
      case 'concern': return AlertCircle;
      case 'solution': return ThumbsUp;
      default: return MessageSquare;
    }
  }

  let groupedFeedback = $derived(sortedFeedback.reduce((acc, item) => {
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
            <FeedbackAgreementCard
              feedback={item}
              canVote={canVote}
              showAgreementScale={canVote}
              previousRoundAgreement={previousAgreements[item.id!]}
            />
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>