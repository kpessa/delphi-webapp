<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = TabsPrimitive.Props;

	export let value: $$Props["value"] = undefined;
	export let onValueChange: $$Props["onValueChange"] = undefined;
	export let orientation: $$Props["orientation"] = "horizontal";
	export let dir: $$Props["dir"] = undefined;
	export let asChild: $$Props["asChild"] = false;

	let className: $$Props["class"] = undefined;
	export { className as class };
</script>

<TabsPrimitive.Root
	bind:value
	{onValueChange}
	{orientation}
	{dir}
	{asChild}
	class={cn(className)}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.Root>