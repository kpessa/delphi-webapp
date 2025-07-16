<script lang="ts">
  import { getContext } from 'svelte';
  
  interface Props {
    open?: boolean;
  }
  
  // In a real implementation, this would get the open state from context
  let { open = true }: Props = $props();
</script>

{#if open}
  <div>
    <slot />
  </div>
{/if}