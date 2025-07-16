<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { authStore } from '$lib/stores/auth.svelte';
</script>

<div class="py-6 md:py-8">
  <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Anonymous Group Feedback Platform</h1>
  <p class="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
    Gather honest opinions and reach consensus using the proven Delphi method
  </p>
  
  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader>
        <CardTitle>Structured Feedback</CardTitle>
        <CardDescription>
          Organize complex discussions into clear topics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Transform messy conversations into actionable questions. Our AI helps extract clear topics from emails, meeting notes, or any text.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Anonymous Participation</CardTitle>
        <CardDescription>
          Remove bias and encourage honesty
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Expert opinions are shared anonymously, eliminating hierarchy and politics. Get authentic feedback that drives real decisions.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Iterative Refinement</CardTitle>
        <CardDescription>
          Build consensus through rounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Multiple rounds allow experts to refine their views based on group feedback. Watch consensus emerge naturally.
        </p>
      </CardContent>
    </Card>
  </div>

  <div class="mt-8 md:mt-12 space-y-6 md:space-y-8">
    <div class="text-center">
      <h2 class="text-xl md:text-2xl font-semibold mb-4">How It Works</h2>
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto">
        <div class="text-center">
          <div class="text-3xl font-bold text-primary mb-2">1</div>
          <h3 class="font-semibold mb-1">Create Topic</h3>
          <p class="text-sm text-muted-foreground">Paste any text and AI extracts the key question</p>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary mb-2">2</div>
          <h3 class="font-semibold mb-1">Invite Experts</h3>
          <p class="text-sm text-muted-foreground">Add panel members who can provide valuable input</p>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary mb-2">3</div>
          <h3 class="font-semibold mb-1">Collect Feedback</h3>
          <p class="text-sm text-muted-foreground">Ideas, solutions, and concerns shared anonymously</p>
        </div>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary mb-2">4</div>
          <h3 class="font-semibold mb-1">Reach Consensus</h3>
          <p class="text-sm text-muted-foreground">Iterate until the group converges on solutions</p>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-8 md:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
    {#if authStore.isAuthenticated}
      <Button href="/dashboard">Go to Dashboard</Button>
    {:else}
      <Button href="/auth/login">Sign In</Button>
      <Button variant="outline" href="/auth/signup">Create Account</Button>
    {/if}
  </div>
</div>