<script lang="ts">
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";
  import { buttonVariants, type Variant, type Size } from "./index.js";

  type $$Props = HTMLButtonAttributes & {
    variant?: Variant;
    size?: Size;
    href?: string;
  };

  let className: string | undefined | null = undefined;
  export { className as class };
  export let variant: Variant = "default";
  export let size: Size = "default";
  export let href: string | undefined = undefined;
</script>

{#if href}
  <a
    {href}
    class={cn(buttonVariants({ variant, size, className }))}
    {...$$restProps}
  >
    <slot />
  </a>
{:else}
  <button
    class={cn(buttonVariants({ variant, size, className }))}
    type="button"
    {...$$restProps}
    on:click
    on:keydown
  >
    <slot />
  </button>
{/if}