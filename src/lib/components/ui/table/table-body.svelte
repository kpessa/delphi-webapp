<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	type $$Props = HTMLAttributes<HTMLTableSectionElement>;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<tbody class={cn("[&_tr:last-child]:border-0", className)} {...$$restProps}>
	<slot />
</tbody>