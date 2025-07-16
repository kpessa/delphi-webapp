<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
  import { Card } from '$lib/components/ui/card';
  import { Label } from '$lib/components/ui/label';
  import { Lightbulb, AlertCircle, ThumbsUp, MessageSquare } from 'lucide-svelte';
  // import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  // import { db } from '$lib/firebase/config';
  // import { authStore } from '$lib/stores/auth.svelte';
  const authStore = { user: { uid: 'test' } }; // Temporary replacement
  import type { FeedbackType } from '$lib/firebase/types';
  // import { toast } from 'svelte-sonner';
  const toast = { success: console.log, error: console.error }; // Temporary replacement

  interface Props {
    topicId: string;
    roundNumber: number;
  }

  let { topicId, roundNumber }: Props = $props();

  let content: string = $state('');
  let type: FeedbackType = $state('idea');
  let submitting: boolean = $state(false);

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
        voteCount: 0,
        voters: [],
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
  <form onsubmit|preventDefault={handleSubmit} class="space-y-4">
    <div>
      <Label for="type">Feedback Type</Label>
      <Select bind:value={type}>
        <SelectTrigger id="type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="idea">
            <div class="flex items-center gap-2">
              <Lightbulb class="h-4 w-4" />
              Idea
            </div>
          </SelectItem>
          <SelectItem value="solution">
            <div class="flex items-center gap-2">
              <ThumbsUp class="h-4 w-4" />
              Solution
            </div>
          </SelectItem>
          <SelectItem value="concern">
            <div class="flex items-center gap-2">
              <AlertCircle class="h-4 w-4" />
              Concern
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label for="content">Your Feedback</Label>
      <Textarea
        id="content"
        bind:value={content}
        placeholder="Share your thoughts, ideas, or concerns..."
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
        Submit Feedback
      {/if}
    </Button>
  </form>
</Card>