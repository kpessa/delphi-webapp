<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { doc, getDoc, onSnapshot } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import { subscribeTopic } from "$lib/firebase/topics";
  import type { Topic, Panel, Round } from '$lib/firebase/types';
  import type { Unsubscribe } from "firebase/firestore";
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import { ArrowLeft, MessageSquare, Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-svelte';
  
  // Import round components
  import RoundIndicator from '$lib/components/rounds/RoundIndicator.svelte';
  import RoundTimeline from '$lib/components/rounds/RoundTimeline.svelte';
  import RoundControls from '$lib/components/rounds/RoundControls.svelte';
  import RoundSummary from '$lib/components/rounds/RoundSummary.svelte';
  import { getCurrentRound, calculateConsensus, type ConsensusMetrics } from '$lib/firebase/rounds';
  
  // Import round feedback components
  import RoundFeedbackForm from '$lib/components/feedback/RoundFeedbackForm.svelte';
  import RoundFeedbackList from '$lib/components/feedback/RoundFeedbackList.svelte';
  
  // Import main's feedback component
  import FeedbackList from "$lib/components/feedback/FeedbackList.svelte";

  let topic: Topic | null = $state(null);
  let panel: Panel | null = $state(null);
  let currentRound: Round | null = $state(null);
  let selectedRound: Round | null = $state(null);
  let consensusMetrics: ConsensusMetrics | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isAdmin = $state(false);
  let isExpert = $state(false);
  let activeTab = $state('discussion');
  let unsubscribe: Unsubscribe | null = null;
  let showRoundsView = $state(true); // Toggle between rounds and simple feedback

  const topicId = $page.params.id;
  const isDisabled = $derived(topic && topic.status === 'completed' || !authStore.isAuthenticated);

  onMount(() => {
    if (!topicId) {
      goto('/topics');
      return;
    }

    // Use main's subscribeTopic for real-time updates
    unsubscribe = subscribeTopic(topicId, (topicData) => {
      topic = topicData;
      loading = false;
      
      if (!topicData) {
        error = "Topic not found";
      } else {
        error = null;
        loadAdditionalData();
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  async function loadAdditionalData() {
    if (!topic) return;
    
    // Load panel first
    if (topic.panelId) {
      const panelDoc = await getDoc(doc(db, 'panels', topic.panelId));
      if (panelDoc.exists()) {
        panel = { id: panelDoc.id, ...panelDoc.data() } as Panel;
        // Check user role after panel is loaded
        checkUserRole();
      }
    }
    
    // Load round data if rounds are enabled
    if (showRoundsView) {
      await loadCurrentRound();
    }
  }

  async function checkUserRole() {
    if (!authStore.user || !topic) return;
    
    // Check admin role - can be admin of panel or topic creator
    if (panel) {
      isAdmin = panel.adminIds?.includes(authStore.user.uid) || panel.creatorId === authStore.user.uid;
      isExpert = panel.expertIds?.includes(authStore.user.uid);
    } else {
      // If no panel loaded yet, at least check if user created the topic
      isAdmin = topic.createdBy === authStore.user.uid;
    }
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

  let canProvideFeedback = $derived(isExpert && topic && topic.status === 'active' && currentRound?.status === 'active');
  let showWaitingState = $derived(topic && topic.status === 'active' && !currentRound && showRoundsView);
</script>

<svelte:head>
  <title>{topic?.title || 'Topic'} - Delphi Platform</title>
</svelte:head>

<div class="py-6 md:py-8">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  {:else if error}
    <Card class="p-8 text-center">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Button href="/topics" variant="outline" class="mt-4">
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
          <h1 class="text-2xl md:text-3xl font-bold mb-2">{topic.title}</h1>
          <p class="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">{topic.description}</p>
          
          <div class="flex items-center gap-4 text-sm">
            <Badge variant={topic.status === 'active' ? 'default' : 'secondary'}>
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
            {#if isAdmin}
              <Button
                variant="outline"
                size="sm"
                onclick={() => showRoundsView = !showRoundsView}
              >
                {showRoundsView ? 'Simple View' : 'Rounds View'}
              </Button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    {#if !authStore.isAuthenticated}
      <Alert class="mb-6">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription>
          Please <a href="/auth/login" class="underline">sign in</a> to participate in the discussion.
        </AlertDescription>
      </Alert>
    {/if}

    {#if topic.status === 'completed'}
      <Alert class="mb-6">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Topic Completed</AlertTitle>
        <AlertDescription>
          This topic has been completed and is no longer accepting feedback.
        </AlertDescription>
      </Alert>
    {/if}

    {#if showRoundsView}
      <!-- Rounds View -->
      <!-- Round Indicator -->
      <div class="mb-6">
        <RoundIndicator {topic} {consensusMetrics} />
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
    {:else}
      <!-- Simple Feedback View (from main branch) -->
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Discussion Question</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="bg-muted p-4 rounded-lg">
              <p class="text-lg">{topic.question}</p>
            </div>
          </CardContent>
        </Card>

        <FeedbackList 
          topicId={topic.id!}
          panelId={topic.panelId}
          roundNumber={topic.roundNumber}
          disabled={isDisabled}
        />
      </div>
    {/if}
  {/if}
</div>