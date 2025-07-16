<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Card } from '$lib/components/ui/card';
  import { Label } from '$lib/components/ui/label';
  import { Lightbulb, AlertCircle, ThumbsUp, MessageSquare } from 'lucide-svelte';
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { FeedbackType } from '$lib/firebase/types';
  import { toast } from 'svelte-sonner';

  interface Props {
    topicId: string;
    roundNumber: number;
  }

  let { topicId, roundNumber }: Props = $props();

  let content: string = $state('');
  let type: FeedbackType = $state('idea');
  let submitting: boolean = $state(false);

  const feedbackTypes = [
    { type: 'idea' as FeedbackType, label: 'Idea', icon: Lightbulb, description: 'Share a new idea or suggestion' },
    { type: 'solution' as FeedbackType, label: 'Solution', icon: ThumbsUp, description: 'Propose a solution or approach' },
    { type: 'concern' as FeedbackType, label: 'Concern', icon: AlertCircle, description: 'Raise a concern or potential issue' }
  ];

  async function handleSubmit() {
    if (!content.trim() || !authStore.user) return;

    submitting = true;
    try {
      const feedbackData = {
        topicId,
        roundNumber,
        expertId: authStore.user.uid,
        type,
        content: content.trim(),
        upvotes: [],
        downvotes: [],
        agreements: {}, // Initialize empty agreements object
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'feedback'), feedbackData);
      
      toast.success('Feedback submitted successfully');
      content = '';
      type = 'idea';
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      submitting = false;
    }
  }

  function getTypeIcon(feedbackType: FeedbackType) {
    switch (feedbackType) {
      case 'idea': return Lightbulb;
      case 'concern': return AlertCircle;
      case 'solution': return ThumbsUp;
      default: return MessageSquare;
    }
  }
</script>

<Card class="p-6">
  <Tabs bind:value={type} class="space-y-4">
    <div>
      <Label class="text-base font-medium">Choose Feedback Type</Label>
      <TabsList class="grid w-full grid-cols-3 mt-2">
        {#each feedbackTypes as feedbackType}
          {@const Icon = feedbackType.icon}
          <TabsTrigger value={feedbackType.type} class="flex items-center gap-2">
            <Icon class="h-4 w-4" />
            {feedbackType.label}
          </TabsTrigger>
        {/each}
      </TabsList>
    </div>

    {#each feedbackTypes as feedbackType}
      <TabsContent value={feedbackType.type} class="space-y-4">
        <div class="p-3 bg-muted/50 rounded-lg">
          <p class="text-sm text-muted-foreground">{feedbackType.description}</p>
        </div>
        
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
          <div>
            <Label for="content-{feedbackType.type}">Your {feedbackType.label}</Label>
            <Textarea
              id="content-{feedbackType.type}"
              bind:value={content}
              placeholder="Share your {feedbackType.label.toLowerCase()}..."
              rows={4}
              class="resize-none"
            />
          </div>

          <Button 
            type="submit" 
            disabled={!content.trim() || submitting}
            class="w-full"
          >
            {#if submitting}
              Submitting...
            {:else}
              Submit {feedbackType.label}
            {/if}
          </Button>
        </form>
      </TabsContent>
    {/each}
  </Tabs>
</Card>