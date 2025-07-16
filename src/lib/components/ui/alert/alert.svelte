<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";

	type $$Props = HTMLAttributes<HTMLDivElement> & {
		variant?: "default" | "destructive";
	};

	let className: $$Props["class"] = undefined;
	export let variant: $$Props["variant"] = "default";
	export { className as class };
</script>

<div
	class={cn(
		"relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
		{
			"bg-background text-foreground": variant === "default",
			"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive": variant === "destructive",
		},
		className
	)}
	role="alert"
	{...$$restProps}
>
	<slot />
</div>