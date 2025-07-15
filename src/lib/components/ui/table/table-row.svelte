<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	type $$Props = HTMLAttributes<HTMLTableRowElement>;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<tr
	class={cn(
		"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
		className
	)}
	{...$$restProps}
>
	<slot />
</tr>