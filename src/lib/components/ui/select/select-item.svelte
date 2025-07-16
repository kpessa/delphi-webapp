<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    value: string;
    class?: string;
  }
  
  let { value, class: className }: Props = $props();
</script>

<div
  class={cn(
    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none",
    "focus:bg-accent focus:text-accent-foreground",
    className
  )}
>
  <slot />
</div>