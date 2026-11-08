<script>
	import { Badge } from "$lib/ui/badge";
	import { availabilityLabel } from "$lib/stock/availability";

	/**
	 * Availability pill: a dot and a label, tinted by state. Never colour alone.
	 * Props: `state` — what availabilityState() returned.
	 * @type {{ state: import("$lib/stock/availability").AvailabilityState }}
	 */
	let { state } = $props();

	/** @type {Record<string, "success" | "info" | "destructive" | "outline" | "secondary">} */
	const VARIANT = {
		in_stock: "success",
		made_to_order: "info",
		sold_out: "destructive",
		draft: "outline",
		archived: "secondary",
	};
</script>

<Badge variant={VARIANT[state]} class="h-6 gap-1.5 px-2.5">
	<span class="size-1.5 rounded-full bg-current"></span>{availabilityLabel(state)}
</Badge>
