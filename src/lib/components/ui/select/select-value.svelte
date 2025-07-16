<script lang="ts">
  interface Props {
    placeholder?: string;
  }
  
  let { placeholder = '' }: Props = $props();
</script>

<span>
  <slot>{placeholder}</slot>
</span>