<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    value?: number;
    max?: number;
    class?: string;
  }
  
  let { value = 0, max = 100, class: className }: Props = $props();
  
  let percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
  <div
    class="h-full w-full flex-1 bg-primary transition-all"
    style="transform: translateX(-{100 - percentage}%)"
  />
</div>