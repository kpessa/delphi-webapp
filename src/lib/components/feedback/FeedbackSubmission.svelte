<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Lightbulb, Wrench, AlertTriangle, MessageSquare } from "lucide-svelte";
  import { authStore } from "$lib/stores/auth.svelte";
  import { submitFeedback } from "$lib/firebase/feedback";
  import type { FeedbackType, Feedback } from "$lib/firebase/types";

  interface Props {
    topicId: string;
    panelId: string;
    roundNumber: number;
    disabled?: boolean;
    parentFeedback?: Feedback;
    onSubmitSuccess?: () => void;
  }

  let { topicId, panelId, roundNumber, disabled = false, parentFeedback, onSubmitSuccess }: Props = $props();

  let content = $state("");
  let selectedType = $state<FeedbackType>(parentFeedback ? "refinement" : "idea");
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  const MAX_CHARS = 1000;
  const remainingChars = $derived(MAX_CHARS - content.length);
  const isOverLimit = $derived(remainingChars < 0);

  const feedbackTypes = [
    { value: "idea", label: "Idea", icon: Lightbulb, color: "text-blue-500" },
    { value: "solution", label: "Solution", icon: Wrench, color: "text-green-500" },
    { value: "concern", label: "Concern", icon: AlertTriangle, color: "text-orange-500" }
  ];

  async function handleSubmit() {
    if (!authStore.user || !content.trim() || isOverLimit) return;

    isSubmitting = true;
    error = null;

    try {
      await submitFeedback(topicId, {
        topicId,
        panelId,
        roundNumber,
        expertId: authStore.user.uid,
        type: selectedType,
        content: content.trim(),
        parentId: parentFeedback?.id || null
      });

      content = "";
      success = true;
      setTimeout(() => success = false, 3000);
      
      onSubmitSuccess?.();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to submit feedback";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Card class="w-full">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      {#if parentFeedback}
        <MessageSquare class="h-5 w-5" />
        Refine Feedback
      {:else}
        Share Your Feedback
      {/if}
    </CardTitle>
    <CardDescription>
      {#if parentFeedback}
        Build upon or improve the existing feedback
      {:else}
        Contribute your ideas, solutions, or concerns anonymously
      {/if}
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if !parentFeedback}
      <Tabs bind:value={selectedType} class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          {#each feedbackTypes as type}
            <TabsTrigger value={type.value} disabled={disabled}>
              {@const IconComponent = type.icon}
              <IconComponent class="h-4 w-4 mr-2 {type.color}" />
              {type.label}
            </TabsTrigger>
          {/each}
        </TabsList>
      </Tabs>
    {:else}
      <div class="flex items-center gap-2">
        <Badge variant="secondary">
          <MessageSquare class="h-3 w-3 mr-1" />
          Refinement
        </Badge>
        <span class="text-sm text-muted-foreground">
          Refining feedback from {new Date(parentFeedback.createdAt).toLocaleDateString()}
        </span>
      </div>
    {/if}

    <div class="space-y-2">
      <Textarea
        bind:value={content}
        placeholder={selectedType === "idea" 
          ? "Share your innovative idea..." 
          : selectedType === "solution" 
          ? "Describe your solution..." 
          : selectedType === "concern"
          ? "What concerns do you have?"
          : "How would you refine this feedback?"}
        class="min-h-[120px] resize-none"
        disabled={disabled || isSubmitting}
      />
      <div class="flex justify-between items-center">
        <span class="text-sm {isOverLimit ? 'text-destructive' : 'text-muted-foreground'}">
          {remainingChars} characters remaining
        </span>
      </div>
    </div>

    {#if error}
      <Alert variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}

    {#if success}
      <Alert>
        <AlertDescription>Feedback submitted successfully!</AlertDescription>
      </Alert>
    {/if}

    <Button 
      onclick={handleSubmit}
      disabled={disabled || isSubmitting || !content.trim() || isOverLimit || !authStore.user}
      class="w-full"
    >
      {isSubmitting ? "Submitting..." : "Submit Feedback"}
    </Button>
  </CardContent>
</Card>