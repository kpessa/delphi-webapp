<script lang="ts">
  import { Dialog as SheetPrimitive } from "bits-ui";
  
  type $$Props = SheetPrimitive.TriggerProps;
  
  export let asChild: $$Props["asChild"] = false;
</script>

<SheetPrimitive.Trigger {asChild} {...$$restProps}>
  <slot />
</SheetPrimitive.Trigger>