<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    class?: string;
  }
  
  let { class: className }: Props = $props();
</script>

<div class={cn("relative overflow-auto", className)}>
  <slot />
</div>