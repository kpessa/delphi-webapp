<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { CheckCircle2, Circle, Clock, TrendingUp } from 'lucide-svelte';
  import { getRoundsForTopic, calculateConsensus, type ConsensusMetrics } from '$lib/firebase/rounds';
  import type { Round, Topic } from '$lib/firebase/types';

  interface Props {
    topic: Topic;
    onRoundSelect?: ((round: Round) => void) | null;
  }

  let { topic, onRoundSelect = null }: Props = $props();

  let rounds: Round[] = $state([]);
  let consensusData: Map<number, ConsensusMetrics> = $state(new Map());
  let selectedRound: number = $state(topic.roundNumber);
  let loading: boolean = $state(true);

  onMount(async () => {
    await loadRounds();
  });

  async function loadRounds() {
    try {
      loading = true;
      rounds = await getRoundsForTopic(topic.id!);
      
      // Load consensus data for completed rounds
      for (const round of rounds) {
        if (round.status === 'completed') {
          try {
            const metrics = await calculateConsensus(topic.id!, round.roundNumber);
            consensusData.set(round.roundNumber, metrics);
          } catch (error) {
            console.error(`Error loading consensus for round ${round.roundNumber}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
    } finally {
      loading = false;
    }
  }

  function handleRoundClick(round: Round) {
    selectedRound = round.roundNumber;
    onRoundSelect?.(round);
  }

  function getRoundIcon(round: Round) {
    if (round.status === 'completed') return CheckCircle2;
    if (round.status === 'active') return Clock;
    return Circle;
  }

  function getConsensusColor(level: number): string {
    if (level >= 80) return 'bg-green-500';
    if (level >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }
</script>

<Card class="h-full">
  <div class="p-4 border-b">
    <h3 class="font-semibold flex items-center gap-2">
      <TrendingUp class="h-4 w-4" />
      Round Progress
    </h3>
  </div>
  
  <ScrollArea class="h-[500px]">
    <div class="p-4">
      {#if loading}
        <div class="space-y-4">
          {#each Array(3) as _}
            <div class="animate-pulse">
              <div class="h-20 bg-gray-200 rounded"></div>
            </div>
          {/each}
        </div>
      {:else if rounds.length === 0}
        <p class="text-muted-foreground text-center py-8">
          No rounds started yet
        </p>
      {:else}
        <div class="relative">
          <!-- Timeline line -->
          <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
          
          <!-- Rounds -->
          <div class="space-y-4">
            {#each rounds as round, index}
              {@const consensus = consensusData.get(round.roundNumber)}
              {@const Icon = getRoundIcon(round)}
              {@const isSelected = selectedRound === round.roundNumber}
              
              <button
                onclick={() => handleRoundClick(round)}
                class="w-full text-left relative group"
              >
                <div class="flex gap-4">
                  <!-- Icon -->
                  <div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-background border-2 {isSelected ? 'border-primary' : 'border-border'} {round.status === 'active' ? 'ring-4 ring-primary/20' : ''}">
                    <Icon class="h-6 w-6 {round.status === 'completed' ? 'text-green-600' : round.status === 'active' ? 'text-primary' : 'text-muted-foreground'}" />
                  </div>
                  
                  <!-- Content -->
                  <div class="flex-1 pb-4">
                    <Card class="p-4 {isSelected ? 'border-primary' : ''} transition-all hover:shadow-md">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <h4 class="font-semibold">Round {round.roundNumber}</h4>
                          <span class="text-xs text-muted-foreground">
                            {new Date(round.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {#if round.status === 'active'}
                          <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span class="text-sm text-green-600 font-medium">Active</span>
                          </div>
                        {/if}
                        
                        {#if consensus}
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-muted-foreground">Consensus</span>
                              <span class="font-medium">{consensus.consensusLevel}%</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                class="h-1.5 rounded-full transition-all {getConsensusColor(consensus.consensusLevel)}"
                                style="width: {consensus.consensusLevel}%"
                              ></div>
                            </div>
                            <div class="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{consensus.totalParticipants} participants</span>
                              <span>{consensus.totalFeedback} responses</span>
                            </div>
                          </div>
                        {/if}
                        
                        {#if round.summary}
                          <p class="text-xs text-muted-foreground line-clamp-2">
                            {round.summary}
                          </p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            class="h-auto p-0 text-xs"
                          >
                            View summary →
                          </Button>
                        {/if}
                      </div>
                    </Card>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </ScrollArea>
</Card>