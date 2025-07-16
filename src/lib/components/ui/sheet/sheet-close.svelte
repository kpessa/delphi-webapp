<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { X } from "lucide-svelte";
  import { cn } from "$lib/utils";
  
  type $$Props = SheetPrimitive.CloseProps;
  
  let className: string | undefined | null = undefined;
  export { className as class };
  export let asChild: $$Props["asChild"] = false;
</script>

<SheetPrimitive.Close
  {asChild}
  class={cn(
    "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
    className
  )}
  {...$$restProps}
>
  {#if !asChild}
    <X class="h-4 w-4" />
    <span class="sr-only">Close</span>
  {:else}
    <slot />
  {/if}
</SheetPrimitive.Close>