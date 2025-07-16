<script lang="ts">
  import { cn } from '$lib/utils';
  
  let className: string | undefined = undefined;
  export { className as class };
</script>

<div
  class={cn(
    "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
    className
  )}
>
  <slot />
</div>