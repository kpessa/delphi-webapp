<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    class?: string;
  }
  
  let { class: className }: Props = $props();
</script>

<div
  class={cn(
    "grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
    className
  )}
>
  <slot />
</div>