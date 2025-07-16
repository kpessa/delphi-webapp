<script lang="ts">
  import { updateDoc, doc } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import AgreementScale from './AgreementScale.svelte';
  import { Lightbulb, AlertCircle, ThumbsUp, MessageSquare, Clock, BarChart3 } from 'lucide-svelte';
  import type { Feedback, AgreementLevel } from '$lib/firebase/types';
  import { toast } from 'svelte-sonner';

  interface Props {
    feedback: Feedback;
    canVote?: boolean;
    showAgreementScale?: boolean;
    previousRoundAgreement?: AgreementLevel; // For vote continuity
  }

  let { 
    feedback, 
    canVote = false, 
    showAgreementScale = false,
    previousRoundAgreement
  }: Props = $props();

  let isVoting = $state(false);

  const typeConfig = {
    idea: { icon: Lightbulb, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950" },
    solution: { icon: ThumbsUp, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950" },
    concern: { icon: AlertCircle, color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950" },
    refinement: { icon: MessageSquare, color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950" },
    vote: { icon: ThumbsUp, color: "text-gray-500", bgColor: "bg-gray-50 dark:bg-gray-950" }
  };

  const config = typeConfig[feedback.type];
  const Icon = config.icon;

  // Get current user's agreement level
  const currentAgreement = $derived(
    authStore.user && feedback.agreements?.[authStore.user.uid] as AgreementLevel | undefined
  );

  // Calculate agreement statistics
  const agreementStats = $derived(() => {
    const agreements = Object.values(feedback.agreements || {});
    if (agreements.length === 0) return null;

    const counts = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
    agreements.forEach(level => {
      counts[level.toString() as keyof typeof counts]++;
    });

    const total = agreements.length;
    const average = agreements.reduce((sum, level) => sum + level, 0) / total;
    const stronglyAgree = counts['2'] + counts['1'];
    const stronglyDisagree = counts['-2'] + counts['-1'];
    const consensusLevel = Math.max(stronglyAgree, stronglyDisagree) / total;

    return {
      total,
      average: Math.round(average * 100) / 100,
      consensusLevel: Math.round(consensusLevel * 100),
      distribution: counts,
      stronglyAgree,
      stronglyDisagree
    };
  });

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  function getAgreementColor(average: number): string {
    if (average >= 1) return 'text-green-600';
    if (average >= 0.5) return 'text-green-500';
    if (average > -0.5) return 'text-gray-600';
    if (average > -1) return 'text-red-500';
    return 'text-red-600';
  }

  async function handleAgreementChange(level: AgreementLevel) {
    if (!canVote || !authStore.user || isVoting) return;

    isVoting = true;
    
    try {
      const feedbackRef = doc(db, 'feedback', feedback.id!);
      const newAgreements = {
        ...feedback.agreements,
        [authStore.user.uid]: level
      };

      await updateDoc(feedbackRef, {
        agreements: newAgreements
      });

      toast.success('Agreement level updated');
    } catch (error) {
      console.error('Error updating agreement:', error);
      toast.error('Failed to update agreement');
    } finally {
      isVoting = false;
    }
  }
</script>

<Card class="w-full hover:shadow-md transition-shadow">
  <CardContent class="pt-6">
    <div class="flex items-start gap-4">
      <div class="p-2 rounded-lg {config.bgColor}">
        <Icon class="h-5 w-5 {config.color}" />
      </div>
      
      <div class="flex-1 space-y-3">
        <div class="flex items-center gap-2">
          <Badge variant="secondary" class="text-xs">
            {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
          </Badge>
          <span class="text-xs text-muted-foreground flex items-center gap-1">
            <Clock class="h-3 w-3" />
            {getRelativeTime(feedback.createdAt)}
          </span>
        </div>
        
        <p class="text-sm whitespace-pre-wrap">{feedback.content}</p>
        
        {#if feedback.parentId}
          <div class="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare class="h-3 w-3" />
            Refinement of previous feedback
          </div>
        {/if}

        <!-- Agreement Statistics -->
        {#if agreementStats}
          <div class="bg-gray-50 rounded-lg p-3 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <BarChart3 class="h-4 w-4" />
              <span class="font-medium">Expert Agreement</span>
            </div>
            <div class="grid grid-cols-3 gap-4 text-xs">
              <div class="text-center">
                <div class="font-medium {getAgreementColor(agreementStats.average)}">
                  {agreementStats.average > 0 ? '+' : ''}{agreementStats.average}
                </div>
                <div class="text-muted-foreground">Average</div>
              </div>
              <div class="text-center">
                <div class="font-medium text-green-600">
                  {agreementStats.stronglyAgree}/{agreementStats.total}
                </div>
                <div class="text-muted-foreground">Agree</div>
              </div>
              <div class="text-center">
                <div class="font-medium">
                  {agreementStats.consensusLevel}%
                </div>
                <div class="text-muted-foreground">Consensus</div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Agreement Scale for Voting -->
        {#if showAgreementScale && canVote}
          <div class="border-t pt-4">
            <AgreementScale
              currentAgreement={currentAgreement}
              previousAgreement={previousRoundAgreement}
              showPrevious={previousRoundAgreement !== undefined}
              disabled={isVoting}
              onAgreementChange={handleAgreementChange}
            />
          </div>
        {/if}
      </div>
    </div>
  </CardContent>
</Card>