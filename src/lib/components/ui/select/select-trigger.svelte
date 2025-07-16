<script lang="ts">
  import { cn } from '$lib/utils';
  
  let className: string | undefined = undefined;
  export { className as class };
</script>

<button
  type="button"
  class={cn(
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
    "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
>
  <slot />
</button>