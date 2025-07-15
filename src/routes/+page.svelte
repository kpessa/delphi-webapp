<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { authStore } from '$lib/stores/auth.svelte';
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold mb-2">Healthcare System Decision Platform</h1>
  <p class="text-lg text-muted-foreground mb-8">
    Gather expert feedback across your healthcare network using the Delphi technique
  </p>
  
  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader>
        <CardTitle>Multi-Facility Input</CardTitle>
        <CardDescription>
          Coordinate across 30+ hospitals and behavioral health facilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Collect structured feedback from clinical, operational, and administrative leaders across your entire network.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Strategic Initiatives</CardTitle>
        <CardDescription>
          Drive system-wide improvements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Launch assessments, consultations, and evaluations to inform critical healthcare decisions with data-driven insights.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Anonymous & Unbiased</CardTitle>
        <CardDescription>
          Foster honest feedback
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Remove hierarchical and political pressures through anonymous participation, ensuring authentic perspectives.
        </p>
      </CardContent>
    </Card>
  </div>

  <div class="mt-12 flex gap-4 justify-center">
    {#if authStore.isAuthenticated}
      <Button href="/dashboard">Go to Dashboard</Button>
    {:else}
      <Button href="/auth/login">Sign In</Button>
      <Button variant="outline" href="/auth/signup">Create Account</Button>
    {/if}
  </div>
</div>
