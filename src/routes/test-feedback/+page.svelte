<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { createTopic } from "$lib/firebase/topics";
  import { authStore } from "$lib/stores/auth.svelte";
  import { goto } from "$app/navigation";

  let isCreating = $state(false);
  let error = $state<string | null>(null);

  async function createTestTopic() {
    if (!authStore.user) {
      error = "Please sign in first";
      return;
    }

    isCreating = true;
    error = null;

    try {
      const topicId = await createTopic({
        title: "Healthcare AI Implementation Strategy",
        description: "Exploring the best approaches for implementing AI solutions across our healthcare facilities to improve patient outcomes and operational efficiency.",
        question: "What are the most critical considerations and potential challenges we should address when implementing AI solutions in our healthcare system?",
        panelId: "test-panel",
        creatorId: authStore.user.uid,
        status: "active",
        roundNumber: 1,
        aiExtracted: false
      });

      await goto(`/topics/${topicId}`);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to create topic";
      isCreating = false;
    }
  }
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <Card>
    <CardHeader>
      <CardTitle>Test Feedback System</CardTitle>
      <CardDescription>
        Create a test topic to explore the feedback submission and display system
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      {#if !authStore.isAuthenticated}
        <p class="text-muted-foreground">
          Please <a href="/auth/login" class="underline">sign in</a> to create a test topic.
        </p>
      {:else}
        <p class="text-sm text-muted-foreground">
          Click the button below to create a sample healthcare topic and start testing the feedback system.
        </p>
        
        {#if error}
          <p class="text-sm text-destructive">{error}</p>
        {/if}

        <Button 
          onclick={createTestTopic} 
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Test Topic"}
        </Button>
      {/if}
    </CardContent>
  </Card>
</div>