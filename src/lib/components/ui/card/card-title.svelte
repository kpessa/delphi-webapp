<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  type $$Props = HTMLAttributes<HTMLHeadingElement>;

  let className: string | undefined | null = undefined;
  export { className as class };
</script>

<h3
  class={cn("text-2xl font-semibold leading-none tracking-tight", className)}
  {...$$restProps}
>
  <slot />
</h3>