<script lang="ts">
	import type { HTMLSelectAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	type $$Props = HTMLSelectAttributes;

	let className: string | undefined | null = undefined;
	export { className as class };
	export let value: $$Props["value"] = undefined;
</script>

<select
	class={cn(
		"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	bind:value
	on:change
	{...$$restProps}
>
	<slot />
</select>