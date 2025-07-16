<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = TabsPrimitive.ContentProps;

	let className: $$Props["class"] = undefined;
	export { className as class };
	export let value: $$Props["value"];
	export let asChild: $$Props["asChild"] = false;
</script>

<TabsPrimitive.Content
	class={cn(
		"mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		className
	)}
	{value}
	{asChild}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.Content>