<script lang="ts">
  interface Props {
    open?: boolean;
  }
  
  let { open = $bindable(false) }: Props = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-black/50" on:click={() => open = false}>
    <div class="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]" on:click|stopPropagation>
      <slot />
    </div>
  </div>
{/if}