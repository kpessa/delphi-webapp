<script lang="ts">
  import Button from '../button/button.svelte';
  
  interface Props {
    onclick?: () => void;
  }
  
  let { onclick = () => {} }: Props = $props();
</script>

<Button variant="outline" {onclick}>
  <slot />
</Button>