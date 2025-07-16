<script lang="ts">
  interface Props {
    value?: any;
    onValueChange?: ((value: any) => void) | undefined;
  }
  
  let { value = $bindable(undefined), onValueChange }: Props = $props();
  
  $effect(() => {
    if (onValueChange && value !== undefined) {
      onValueChange(value);
    }
  });
</script>

<div>
  <slot />
</div>