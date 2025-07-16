<script>
  import '../app.css';
  import { ModeWatcher } from 'mode-watcher';
  import { Toaster } from 'svelte-sonner';
  import Navigation from '$lib/components/navigation.svelte';
</script>

<ModeWatcher />
<div class="min-h-screen flex flex-col">
  <Navigation />
  <main class="flex-1">
    <div class="container">
      <slot />
    </div>
  </main>
</div>
<Toaster position="top-right" />