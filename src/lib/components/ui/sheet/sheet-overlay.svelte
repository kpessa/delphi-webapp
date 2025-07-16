<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { cn } from "$lib/utils";
  
  type $$Props = SheetPrimitive.OverlayProps;
  
  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<SheetPrimitive.Overlay
  class={cn(
    "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    className
  )}
  {...$$restProps}
/>