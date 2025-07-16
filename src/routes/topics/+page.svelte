<script lang="ts">
  import { onMount } from 'svelte';
  import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
  import { db } from '$lib/firebase/config';
  import { authStore } from '$lib/stores/auth.svelte';
  import { getPanels } from '$lib/firebase/panels';
  import type { Topic, Panel } from '$lib/firebase/types';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Plus, MessageSquare, TrendingUp, Clock, Users } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  let topics: Topic[] = $state([]);
  let panels: Panel[] = $state([]);
  let loading: boolean = $state(true);
  let unsubscribe: (() => void) | null = null;
  
  // Create a map for quick panel lookup
  let panelMap = $derived(
    panels.reduce((map, panel) => {
      if (panel.id) map[panel.id] = panel;
      return map;
    }, {} as Record<string, Panel>)
  );

  onMount(async () => {
    // Load panels first
    try {
      panels = await getPanels();
    } catch (error) {
      console.error('Error loading panels:', error);
    }
    
    const topicsRef = collection(db, 'topics');
    const q = query(topicsRef, orderBy('createdAt', 'desc'));

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        topics = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        } as Topic));
        loading = false;
      },
      (error) => {
        console.error('Error loading topics:', error);
        loading = false;
      }
    );

    return () => unsubscribe?.();
  });

  function navigateToTopic(topicId: string) {
    goto(`/topics/${topicId}`);
  }
</script>

<svelte:head>
  <title>Topics - Delphi Platform</title>
</svelte:head>

<div class="py-6 md:py-8">
  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Topics</h1>
      <p class="text-muted-foreground">
        Explore and contribute to strategic discussions
      </p>
    </div>
    
    {#if authStore.user}
      <Button href="/topics/new">
        <Plus class="h-4 w-4 mr-2" />
        New Topic
      </Button>
    {/if}
  </div>

  {#if loading}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <Skeleton class="h-48" />
      {/each}
    </div>
  {:else if topics.length === 0}
    <Card class="p-8 md:p-12 text-center">
      <MessageSquare class="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
      <h3 class="text-lg md:text-xl font-semibold mb-2">No topics yet</h3>
      <p class="text-muted-foreground mb-6">
        Start a new discussion to gather expert insights
      </p>
      {#if authStore.user}
        <Button href="/topics/new">
          <Plus class="h-4 w-4 mr-2" />
          Create First Topic
        </Button>
      {/if}
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each topics as topic}
        <Card 
          class="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onclick={() => navigateToTopic(topic.id!)}
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold line-clamp-2">{topic.title}</h3>
              <Badge variant={topic.status === 'active' ? 'default' : 'secondary'}>
                {topic.status}
              </Badge>
            </div>
            
            <p class="text-sm text-muted-foreground line-clamp-3">
              {topic.description}
            </p>
            
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              {#if panelMap[topic.panelId]}
                <span class="flex items-center gap-1">
                  <Users class="h-3 w-3" />
                  {panelMap[topic.panelId].name}
                </span>
              {/if}
              <span class="flex items-center gap-1">
                <TrendingUp class="h-3 w-3" />
                Round {topic.roundNumber}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {new Date(topic.updatedAt).toLocaleDateString()}
              </span>
            </div>
            
            {#if topic.aiExtracted}
              <Badge variant="outline" class="text-xs">
                AI Generated
              </Badge>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>