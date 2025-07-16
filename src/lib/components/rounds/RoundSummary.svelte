<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '$lib/components/ui/collapsible';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { 
    FileText, 
    Users, 
    MessageSquare, 
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Download,
    Lightbulb,
    AlertCircle,
    ThumbsUp
  } from 'lucide-svelte';
  import { calculateConsensus, type ConsensusMetrics } from '$lib/firebase/rounds';
  import { collection, query, where, getDocs } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import type { Round, Feedback } from '$lib/firebase/types';

  interface Props {
    round: Round;
    topicId: string;
  }

  let { round, topicId }: Props = $props();

  let consensus: ConsensusMetrics | null = $state(null);
  let feedback: Feedback[] = $state([]);
  let loading: boolean = $state(true);
  let detailsExpanded: boolean = $state(false);

  // Group feedback by type
  let groupedFeedback = $derived(() => {
    const groups: Record<string, Feedback[]> = {};
    feedback.forEach(f => {
      if (!groups[f.type]) groups[f.type] = [];
      groups[f.type].push(f);
    });
    return groups;
  });

  onMount(async () => {
    await loadRoundData();
  });

  async function loadRoundData() {
    try {
      loading = true;
      
      // Load consensus metrics
      consensus = await calculateConsensus(topicId, round.roundNumber);
      
      // Load feedback
      const feedbackRef = collection(db, 'feedback');
      const q = query(
        feedbackRef,
        where('topicId', '==', topicId),
        where('roundNumber', '==', round.roundNumber)
      );
      const snapshot = await getDocs(q);
      feedback = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Feedback));
      
      // Sort by vote count
      feedback.sort((a, b) => b.voteCount - a.voteCount);
    } catch (error) {
      console.error('Error loading round data:', error);
    } finally {
      loading = false;
    }
  }

  function exportRoundReport() {
    // Generate CSV or PDF report
    const reportData = {
      round: round.roundNumber,
      summary: round.summary,
      consensus: consensus?.consensusLevel,
      participation: consensus?.participationRate,
      feedback: feedback.map(f => ({
        type: f.type,
        content: f.content,
        votes: f.voteCount
      }))
    };
    
    // Convert to CSV
    const csv = [
      ['Round Report', `Round ${round.roundNumber}`],
      ['Date', new Date(round.startDate).toLocaleDateString()],
      ['Consensus Level', `${consensus?.consensusLevel}%`],
      ['Participation', `${consensus?.participationRate}%`],
      [''],
      ['Type', 'Content', 'Votes'],
      ...reportData.feedback.map(f => [f.type, f.content, f.votes])
    ].map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `round-${round.roundNumber}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
</script>

<Card>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <FileText class="h-5 w-5" />
        Round {round.roundNumber} Summary
      </h3>
      <Button variant="outline" size="sm" onclick={exportRoundReport}>
        <Download class="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>

    {#if loading}
      <div class="space-y-3">
        <Skeleton class="h-20 w-full" />
        <Skeleton class="h-16 w-full" />
        <Skeleton class="h-16 w-full" />
      </div>
    {:else}
      <!-- AI Summary -->
      {#if round.summary}
        <div class="bg-muted/50 rounded-lg p-4">
          <p class="text-sm leading-relaxed">{round.summary}</p>
        </div>
      {/if}

      <!-- Key Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary">{consensus?.consensusLevel || 0}%</div>
          <div class="text-sm text-muted-foreground">Consensus</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold">{consensus?.totalParticipants || 0}</div>
          <div class="text-sm text-muted-foreground">Participants</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold">{consensus?.totalFeedback || 0}</div>
          <div class="text-sm text-muted-foreground">Responses</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold">{consensus?.participationRate || 0}%</div>
          <div class="text-sm text-muted-foreground">Participation</div>
        </div>
      </div>

      <!-- Key Themes -->
      <div class="space-y-2">
        <h4 class="font-medium text-sm text-muted-foreground">Key Themes</h4>
        <div class="flex flex-wrap gap-2">
          {#each Object.entries(groupedFeedback) as [type, items]}
            {@const Icon = getTypeIcon(type)}
            <Badge variant="secondary" class="{getTypeColor(type)}">
              <Icon class="h-3 w-3 mr-1" />
              {type} ({items.length})
            </Badge>
          {/each}
        </div>
      </div>

      <!-- Detailed Feedback -->
      <Collapsible bind:open={detailsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            class="w-full justify-between"
          >
            <span>View detailed feedback</span>
            {#if detailsExpanded}
              <ChevronUp class="h-4 w-4" />
            {:else}
              <ChevronDown class="h-4 w-4" />
            {/if}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="mt-4 space-y-4">
            {#each Object.entries(groupedFeedback) as [type, items]}
              {@const Icon = getTypeIcon(type)}
              <div>
                <h5 class="font-medium mb-2 capitalize flex items-center gap-2">
                  <Icon class="h-4 w-4" />
                  {type}s
                </h5>
                <div class="space-y-2">
                  {#each items.slice(0, 5) as item}
                    <Card class="p-3">
                      <div class="flex items-start justify-between gap-2">
                        <p class="text-sm flex-1">{item.content}</p>
                        <Badge variant="outline" class="shrink-0">
                          <ThumbsUp class="h-3 w-3 mr-1" />
                          {item.voteCount}
                        </Badge>
                      </div>
                    </Card>
                  {/each}
                  {#if items.length > 5}
                    <p class="text-sm text-muted-foreground text-center">
                      ...and {items.length - 5} more
                    </p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </CollapsibleContent>
      </Collapsible>
    {/if}
  </div>
</Card>