<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";

	type $$Props = HTMLAttributes<HTMLTableCaptionElement>;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<caption
	class={cn("mt-4 text-sm text-muted-foreground", className)}
	{...$$restProps}
>
	<slot />
</caption>