<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  import { X } from "lucide-svelte";
  import { cn } from "$lib/utils";

  type $$Props = SheetPrimitive.RootProps;

  export let open: $$Props["open"] = false;
  export let onOpenChange: $$Props["onOpenChange"] = undefined;
</script>

<SheetPrimitive.Root bind:open {onOpenChange} {...$$restProps}>
  <slot />
</SheetPrimitive.Root>