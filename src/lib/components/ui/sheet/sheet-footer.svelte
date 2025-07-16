<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";
  
  type $$Props = HTMLAttributes<HTMLDivElement>;
  
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<div
  class={cn(
    "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
    className
  )}
  {...$$restProps}
>
  <slot />
</div>