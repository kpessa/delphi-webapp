<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { ArrowLeft, AlertCircle, Loader2 } from "lucide-svelte";
  import FeedbackList from "$lib/components/feedback/FeedbackList.svelte";
  import { subscribeTopic } from "$lib/firebase/topics";
  import { authStore } from "$lib/stores/auth.svelte";
  import type { Topic } from "$lib/firebase/types";
  import type { Unsubscribe } from "firebase/firestore";

  let topic = $state<Topic | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let unsubscribe: Unsubscribe | null = null;

  const topicId = $derived($page.params.id);
  const isDisabled = $derived(topic?.status === 'completed' || !authStore.isAuthenticated);

  onMount(() => {
    if (!topicId) {
      error = "No topic ID provided";
      loading = false;
      return;
    }

    unsubscribe = subscribeTopic(topicId, (topicData) => {
      topic = topicData;
      loading = false;
      
      if (!topicData) {
        error = "Topic not found";
      } else {
        error = null;
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>

<svelte:head>
  <title>{topic?.title || 'Topic'} - Delphi Platform</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
  <Button href="/dashboard" variant="ghost" class="mb-4">
    <ArrowLeft class="h-4 w-4 mr-2" />
    Back to Dashboard
  </Button>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  {:else if error}
    <Alert variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  {:else if topic}
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle class="text-2xl">{topic.title}</CardTitle>
            <div class="flex items-center gap-2">
              <Badge variant={topic.status === 'active' ? 'default' : 'secondary'}>
                {topic.status}
              </Badge>
              <Badge variant="outline">
                Round {topic.roundNumber}
              </Badge>
            </div>
          </div>
          <CardDescription class="mt-2">
            {topic.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="bg-muted p-4 rounded-lg">
              <h3 class="font-semibold mb-2">Question for Discussion:</h3>
              <p class="text-lg">{topic.question}</p>
            </div>
            
            {#if topic.aiExtracted}
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" class="text-xs">
                  AI Extracted
                </Badge>
                {#if topic.aiConfidence}
                  <span>Confidence: {Math.round(topic.aiConfidence * 100)}%</span>
                {/if}
              </div>
            {/if}
          </div>
        </CardContent>
      </Card>

      {#if !authStore.isAuthenticated}
        <Alert>
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please <a href="/auth/login" class="underline">sign in</a> to participate in the discussion.
          </AlertDescription>
        </Alert>
      {/if}

      {#if topic.status === 'completed'}
        <Alert>
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Topic Completed</AlertTitle>
          <AlertDescription>
            This topic has been completed and is no longer accepting feedback.
          </AlertDescription>
        </Alert>
      {/if}

      <FeedbackList 
        topicId={topic.id!}
        panelId={topic.panelId}
        roundNumber={topic.roundNumber}
        disabled={isDisabled}
      />
    </div>
  {/if}
</div>