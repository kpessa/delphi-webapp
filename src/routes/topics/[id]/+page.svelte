<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { Topic, Panel, Feedback, Round } from '$lib/firebase/types';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { ArrowLeft, MessageSquare, Users, TrendingUp } from 'lucide-svelte';
  
  // Import round components
  import RoundIndicator from '$lib/components/rounds/RoundIndicator.svelte';
  import RoundTimeline from '$lib/components/rounds/RoundTimeline.svelte';
  import RoundControls from '$lib/components/rounds/RoundControls.svelte';
  import RoundSummary from '$lib/components/rounds/RoundSummary.svelte';
  import { getCurrentRound, calculateConsensus, type ConsensusMetrics } from '$lib/firebase/rounds';
  
  // Import round feedback components
  import RoundFeedbackForm from '$lib/components/feedback/RoundFeedbackForm.svelte';
  import RoundFeedbackList from '$lib/components/feedback/RoundFeedbackList.svelte';

  let topic: Topic | null = $state(null);
  let panel: Panel | null = $state(null);
  let currentRound: Round | null = $state(null);
  let selectedRound: Round | null = $state(null);
  let consensusMetrics: ConsensusMetrics | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let isAdmin = $state(false);
  let isExpert = $state(false);
  let activeTab = $state('discussion');

  const topicId = $page.params.id;

  onMount(() => {
    if (!topicId) {
      goto('/topics');
      return;
    }

    loadTopic();
    
    // Set up real-time listener for topic updates
    const unsubscribe = onSnapshot(
      doc(db, 'topics', topicId),
      (doc) => {
        if (doc.exists()) {
          topic = { id: doc.id, ...doc.data() } as Topic;
          checkUserRole();
          loadCurrentRound();
        }
      },
      (err) => {
        console.error('Error listening to topic:', err);
        error = 'Failed to load topic updates';
      }
    );

    return unsubscribe;
  });

  async function loadTopic() {
    try {
      loading = true;
      
      // Load topic
      const topicDoc = await getDoc(doc(db, 'topics', topicId));
      if (!topicDoc.exists()) {
        error = 'Topic not found';
        return;
      }
      
      topic = { id: topicDoc.id, ...topicDoc.data() } as Topic;
      
      // Load panel
      if (topic.panelId) {
        const panelDoc = await getDoc(doc(db, 'panels', topic.panelId));
        if (panelDoc.exists()) {
          panel = { id: panelDoc.id, ...panelDoc.data() } as Panel;
        }
      }
      
      await checkUserRole();
      await loadCurrentRound();
      
    } catch (err) {
      console.error('Error loading topic:', err);
      error = 'Failed to load topic';
    } finally {
      loading = false;
    }
  }

  async function checkUserRole() {
    if (!authStore.user || !topic || !panel) return;
    
    isAdmin = panel.adminIds.includes(authStore.user.uid) || topic.createdBy === authStore.user.uid;
    isExpert = panel.expertIds.includes(authStore.user.uid);
  }

  async function loadCurrentRound() {
    if (!topic?.id) return;
    
    try {
      currentRound = await getCurrentRound(topic.id);
      selectedRound = currentRound;
      
      if (currentRound) {
        consensusMetrics = await calculateConsensus(topic.id, currentRound.roundNumber);
      }
    } catch (err) {
      console.error('Error loading round data:', err);
    }
  }

  async function handleRoundChange() {
    await loadCurrentRound();
  }

  function handleRoundSelect(round: Round) {
    selectedRound = round;
    if (round.status === 'active') {
      activeTab = 'discussion';
    } else {
      activeTab = 'summary';
    }
  }

  let canProvideFeedback = $derived(isExpert && topic?.status === 'open' && currentRound?.status === 'active');
  let showWaitingState = $derived(topic?.status === 'open' && !currentRound);
</script>

<svelte:head>
  <title>{topic?.title || 'Topic'} - Delphi Platform</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-7xl">
  {#if loading}
    <div class="space-y-4">
      <Skeleton class="h-8 w-64" />
      <Skeleton class="h-32 w-full" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <Skeleton class="h-96 w-full" />
        </div>
        <div>
          <Skeleton class="h-96 w-full" />
        </div>
      </div>
    </div>
  {:else if error}
    <Card class="p-8 text-center">
      <p class="text-destructive mb-4">{error}</p>
      <Button href="/topics" variant="outline">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to Topics
      </Button>
    </Card>
  {:else if topic}
    <!-- Header -->
    <div class="mb-6">
      <Button href="/topics" variant="ghost" size="sm" class="mb-4">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back to Topics
      </Button>
      
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h1 class="text-3xl font-bold mb-2">{topic.title}</h1>
          <p class="text-muted-foreground mb-4">{topic.description}</p>
          
          <div class="flex items-center gap-4 text-sm">
            <Badge variant={topic.status === 'open' ? 'default' : 'secondary'}>
              {topic.status}
            </Badge>
            {#if panel}
              <span class="flex items-center gap-1 text-muted-foreground">
                <Users class="h-4 w-4" />
                {panel.name}
              </span>
            {/if}
            {#if topic.aiExtracted}
              <Badge variant="outline">AI Extracted</Badge>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Round Indicator -->
    <div class="mb-6">
      <RoundIndicator {topic} {consensusMetrics} />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Discussion/Summary -->
      <div class="lg:col-span-2 space-y-6">
        {#if showWaitingState}
          <Card class="p-8 text-center">
            <TrendingUp class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 class="text-lg font-semibold mb-2">Waiting for First Round</h3>
            <p class="text-muted-foreground">
              The administrator will start the first round of feedback collection soon.
            </p>
          </Card>
        {:else}
          <Card>
            <Tabs bind:value={activeTab}>
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="discussion" disabled={!canProvideFeedback && selectedRound?.status === 'completed'}>
                  <MessageSquare class="h-4 w-4 mr-2" />
                  Discussion
                </TabsTrigger>
                <TabsTrigger value="summary" disabled={!selectedRound}>
                  <TrendingUp class="h-4 w-4 mr-2" />
                  Summary
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="discussion" class="p-6">
                <div class="space-y-6">
                  <div class="bg-muted/50 rounded-lg p-4">
                    <h3 class="font-semibold mb-2">Question for Round {selectedRound?.roundNumber || topic.roundNumber}</h3>
                    <p class="text-lg">{topic.question}</p>
                  </div>
                  
                  {#if canProvideFeedback && selectedRound?.status === 'active'}
                    <RoundFeedbackForm 
                      topicId={topic.id!} 
                      roundNumber={selectedRound.roundNumber}
                    />
                  {:else if selectedRound?.status === 'completed'}
                    <div class="text-center py-8 text-muted-foreground">
                      <p>This round has been closed. View the summary to see results.</p>
                    </div>
                  {:else if !isExpert}
                    <div class="text-center py-8 text-muted-foreground">
                      <p>Only panel experts can provide feedback.</p>
                    </div>
                  {/if}
                  
                  {#if selectedRound}
                    <RoundFeedbackList 
                      topicId={topic.id!} 
                      roundNumber={selectedRound.roundNumber}
                      canVote={canProvideFeedback}
                    />
                  {/if}
                </div>
              </TabsContent>
              
              <TabsContent value="summary" class="p-6">
                {#if selectedRound}
                  <RoundSummary round={selectedRound} topicId={topic.id!} />
                {:else}
                  <p class="text-center text-muted-foreground py-8">
                    No round selected
                  </p>
                {/if}
              </TabsContent>
            </Tabs>
          </Card>
        {/if}
        
        <!-- Admin Controls -->
        {#if isAdmin}
          <RoundControls 
            {topic} 
            {isAdmin} 
            onRoundChange={handleRoundChange}
          />
        {/if}
      </div>
      
      <!-- Right Column - Timeline -->
      <div>
        <RoundTimeline 
          {topic} 
          onRoundSelect={handleRoundSelect}
        />
      </div>
    </div>
  {/if}
</div>