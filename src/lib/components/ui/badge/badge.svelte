<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";
	import { badgeVariants, type Variant } from "./index.js";

	type $$Props = HTMLAttributes<HTMLDivElement> & {
		variant?: Variant;
	};

	let className: string | undefined | null = undefined;
	export { className as class };
	export let variant: Variant = "default";
</script>

<div class={cn(badgeVariants({ variant }), className)} {...$$restProps}>
	<slot />
</div>