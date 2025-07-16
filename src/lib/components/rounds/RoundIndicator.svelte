<script lang="ts">
  import { onMount } from 'svelte';
  import { Progress } from '$lib/components/ui/progress';
  import { Badge } from '$lib/components/ui/badge';
  import { Clock, CheckCircle2, RotateCw } from 'lucide-svelte';
  import { getCurrentRound, getRoundsForTopic, type ConsensusMetrics } from '$lib/firebase/rounds';
  import type { Round, Topic } from '$lib/firebase/types';

  interface Props {
    topic: Topic;
    consensusMetrics?: ConsensusMetrics | null;
    showTimeRemaining?: boolean;
  }

  let { topic, consensusMetrics = null, showTimeRemaining = true }: Props = $props();

  let currentRound: Round | null = $state(null);
  let totalRounds: number = $state(0);
  let timeRemaining: string = $state('');
  let loading: boolean = $state(true);

  onMount(async () => {
    await loadRoundData();
    
    // Update time remaining every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    updateTimeRemaining();
    
    return () => clearInterval(interval);
  });

  async function loadRoundData() {
    try {
      loading = true;
      currentRound = await getCurrentRound(topic.id!);
      const allRounds = await getRoundsForTopic(topic.id!);
      totalRounds = allRounds.length;
    } catch (error) {
      console.error('Error loading round data:', error);
    } finally {
      loading = false;
    }
  }

  function updateTimeRemaining() {
    if (!currentRound?.startDate || !showTimeRemaining) return;
    
    // Assuming 7 days per round (can be made configurable)
    const roundDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const elapsed = Date.now() - currentRound.startDate.getTime();
    const remaining = roundDuration - elapsed;
    
    if (remaining <= 0) {
      timeRemaining = 'Round ending soon';
      return;
    }
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      timeRemaining = `${days} day${days > 1 ? 's' : ''} remaining`;
    } else {
      timeRemaining = `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    }
  }

  let statusColor = $derived(currentRound?.status === 'active' ? 'bg-green-500' : 'bg-gray-400');
  let consensusColor = $derived(getConsensusColor(consensusMetrics?.consensusLevel || 0));

  function getConsensusColor(level: number): string {
    if (level >= 80) return 'text-green-600';
    if (level >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
</script>

<div class="rounded-lg border bg-card p-6 space-y-4">
  {#if loading}
    <div class="animate-pulse space-y-2">
      <div class="h-8 bg-gray-200 rounded w-48"></div>
      <div class="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  {:else}
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <RotateCw class="h-5 w-5 text-muted-foreground" />
          <h3 class="text-2xl font-bold">
            Round {topic.roundNumber} 
            {#if totalRounds > 0}
              <span class="text-muted-foreground text-lg">of {totalRounds}</span>
            {/if}
          </h3>
        </div>
        
        <Badge variant={currentRound?.status === 'active' ? 'default' : 'secondary'}>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 rounded-full {statusColor}"></div>
            {currentRound?.status || 'No active round'}
          </div>
        </Badge>
      </div>

      {#if showTimeRemaining && timeRemaining && currentRound?.status === 'active'}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock class="h-4 w-4" />
          <span>{timeRemaining}</span>
        </div>
      {/if}
    </div>

    {#if consensusMetrics}
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Consensus Level</span>
          <span class="font-semibold {consensusColor}">
            {consensusMetrics.consensusLevel}%
          </span>
        </div>
        <Progress value={consensusMetrics.consensusLevel} class="h-2" />
        
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          {#if consensusMetrics.consensusLevel >= 80}
            <CheckCircle2 class="h-3 w-3 text-green-600" />
            <span>High consensus achieved</span>
          {:else}
            <span>Continue gathering feedback to reach consensus</span>
          {/if}
        </div>
      </div>
    {/if}

    {#if consensusMetrics?.participationRate !== undefined}
      <div class="flex items-center justify-between text-sm pt-2 border-t">
        <span class="text-muted-foreground">Participation</span>
        <span>{consensusMetrics.participationRate}% ({consensusMetrics.totalParticipants} experts)</span>
      </div>
    {/if}
  {/if}
</div>