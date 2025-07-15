<script>
  import '../app.css';
  import { ModeWatcher } from 'mode-watcher';
  import { Toaster } from 'svelte-sonner';
</script>

<ModeWatcher />
<slot />
<Toaster position="top-right" />