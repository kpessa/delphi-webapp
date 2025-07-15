<script>
  import '../app.css';
  import { ModeWatcher } from 'mode-watcher';
  import { Toaster } from 'svelte-sonner';
  import Navigation from '$lib/components/navigation.svelte';
</script>

<ModeWatcher />
<Navigation />
<main class="flex-1">
  <slot />
</main>
<Toaster position="top-right" />