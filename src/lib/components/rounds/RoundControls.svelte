<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Slider } from '$lib/components/ui/slider';
  import { Switch } from '$lib/components/ui/switch';
  import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '$lib/components/ui/alert-dialog';
  import { Play, Square, Settings, RotateCw } from 'lucide-svelte';
  import { createNewRound, completeRound, getCurrentRound, calculateConsensus } from '$lib/firebase/rounds';
  import type { Topic, Round } from '$lib/firebase/types';
  import { toast } from 'svelte-sonner';

  interface Props {
    topic: Topic;
    isAdmin?: boolean;
    onRoundChange?: (() => void) | null;
  }

  let { topic, isAdmin = false, onRoundChange = null }: Props = $props();

  let currentRound: Round | null = $state(null);
  let loading: boolean = $state(false);
  let showSettings: boolean = $state(false);
  let showConfirmDialog: boolean = $state(false);
  let dialogAction: 'start' | 'close' = $state('start');
  
  // Settings
  let roundDuration: number = $state(7); // days
  let consensusThreshold: number = $state(80); // percentage
  let enableAutoClose: boolean = $state(true);
  let minParticipation: number = $state(50); // percentage

  $effect(async () => {
    if (topic.id) {
      currentRound = await getCurrentRound(topic.id);
    }
  });

  async function handleStartNewRound() {
    if (!isAdmin || loading) return;
    
    dialogAction = 'start';
    showConfirmDialog = true;
  }

  async function handleCloseRound() {
    if (!isAdmin || loading || !currentRound) return;
    
    dialogAction = 'close';
    showConfirmDialog = true;
  }

  async function confirmAction() {
    loading = true;
    showConfirmDialog = false;
    
    try {
      if (dialogAction === 'start') {
        await createNewRound(topic.id!);
        toast.success('New round started successfully');
      } else {
        // Check consensus before closing
        const consensus = await calculateConsensus(topic.id!, currentRound!.roundNumber);
        
        if (consensus.participationRate < minParticipation && enableAutoClose) {
          toast.error(`Minimum participation rate (${minParticipation}%) not met`);
          loading = false;
          return;
        }
        
        await completeRound(topic.id!, currentRound!.roundNumber);
        toast.success('Round closed successfully');
        
        // Auto-start new round if consensus not reached
        if (consensus.consensusLevel < consensusThreshold && enableAutoClose) {
          await createNewRound(topic.id!);
          toast.info('New round started - consensus threshold not yet reached');
        } else if (consensus.consensusLevel >= consensusThreshold) {
          toast.success(`Consensus achieved at ${consensus.consensusLevel}%!`);
        }
      }
      
      // Refresh round data
      currentRound = await getCurrentRound(topic.id!);
      onRoundChange?.();
    } catch (error) {
      console.error('Error managing round:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to manage round');
    } finally {
      loading = false;
    }
  }

  let canStartNewRound = $derived(isAdmin && !currentRound && topic.status === 'open');
  let canCloseRound = $derived(isAdmin && currentRound?.status === 'active');
</script>

{#if isAdmin}
  <Card>
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <RotateCw class="h-5 w-5" />
          Round Controls
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onclick={() => showSettings = !showSettings}
        >
          <Settings class="h-4 w-4" />
        </Button>
      </div>

      <div class="flex gap-2">
        {#if canStartNewRound}
          <Button
            onclick={handleStartNewRound}
            disabled={loading}
            class="flex-1"
          >
            <Play class="h-4 w-4 mr-2" />
            Start New Round
          </Button>
        {:else if canCloseRound}
          <Button
            variant="destructive"
            onclick={handleCloseRound}
            disabled={loading}
            class="flex-1"
          >
            <Square class="h-4 w-4 mr-2" />
            Close Current Round
          </Button>
        {:else}
          <div class="text-sm text-muted-foreground">
            {#if topic.status === 'closed'}
              Topic is closed
            {:else}
              No actions available
            {/if}
          </div>
        {/if}
      </div>

      {#if showSettings}
        <div class="border-t pt-4 space-y-4">
          <div class="space-y-2">
            <Label for="duration">Round Duration: {roundDuration} days</Label>
            <Slider
              id="duration"
              min={1}
              max={30}
              step={1}
              bind:value={[roundDuration]}
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <Label for="consensus">Consensus Threshold: {consensusThreshold}%</Label>
            <Slider
              id="consensus"
              min={50}
              max={100}
              step={5}
              bind:value={[consensusThreshold]}
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <Label for="participation">Min Participation: {minParticipation}%</Label>
            <Slider
              id="participation"
              min={0}
              max={100}
              step={10}
              bind:value={[minParticipation]}
              class="w-full"
            />
          </div>

          <div class="flex items-center justify-between">
            <Label for="autoclose" class="cursor-pointer">
              Auto-close when consensus reached
            </Label>
            <Switch
              id="autoclose"
              bind:checked={enableAutoClose}
            />
          </div>
        </div>
      {/if}

      {#if currentRound}
        <div class="border-t pt-4 text-sm text-muted-foreground">
          <p>Round {currentRound.roundNumber} started {new Date(currentRound.startDate).toLocaleDateString()}</p>
        </div>
      {/if}
    </div>
  </Card>

  <AlertDialog bind:open={showConfirmDialog}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {dialogAction === 'start' ? 'Start New Round?' : 'Close Current Round?'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {#if dialogAction === 'start'}
            This will open a new round of feedback collection for this topic. Experts will be notified to provide their input.
          {:else}
            This will close the current round and generate an AI summary of all feedback. 
            {#if enableAutoClose}
              A new round will automatically start if consensus threshold ({consensusThreshold}%) is not reached.
            {/if}
          {/if}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onclick={confirmAction}>
          {dialogAction === 'start' ? 'Start Round' : 'Close Round'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
{/if}