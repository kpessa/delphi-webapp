<script lang="ts">
  interface Builder {
    action: (node: HTMLElement) => void;
  }
  
  interface Props {
    asChild?: boolean;
    builders?: Builder[];
  }
  
  let { asChild = false, builders = [] }: Props = $props();
</script>

<slot {builders} />