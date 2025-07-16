<script lang="ts">
  import { cn } from '$lib/utils';
  
  interface Props {
    value?: number[];
    min?: number;
    max?: number;
    step?: number;
    class?: string;
  }
  
  let { value = $bindable([50]), min = 0, max = 100, step = 1, class: className }: Props = $props();
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = [Number(target.value)];
  }
</script>

<div class={cn("relative flex w-full touch-none select-none items-center", className)}>
  <input
    type="range"
    {min}
    {max}
    {step}
    value={value[0]}
    on:input={handleInput}
    class="w-full cursor-pointer"
  />
</div>