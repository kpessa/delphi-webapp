<script lang="ts">
  interface Props {
    open?: boolean;
  }
  
  let { open = $bindable(false) }: Props = $props();
</script>

<div>
  <slot />
</div>