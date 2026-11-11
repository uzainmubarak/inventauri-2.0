<script>
	import * as Table from "$lib/ui/table";
	import { Checkbox } from "$lib/ui/checkbox";
	import { Button } from "$lib/ui/button";
	import * as DropdownMenu from "$lib/ui/dropdown-menu";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import ImageIcon from "@lucide/svelte/icons/image";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import { goto } from "$app/navigation";
	import StatusBadge from "./StatusBadge.svelte";

	/**
	 * The stock list as a table.
	 * Props: `rows` (each { dress, ...summariseDress(dress) }), `selected`
	 * (bindable list of dress ids), `sort` ({ key, dir } or null), `onSort(key)`,
	 * `onOpen(dress)`, `onArchive(dress)`.
	 * @type {{
	 *   rows: any[],
	 *   selected?: string[],
	 *   sort?: { key: string, dir: "asc" | "desc" } | null,
	 *   onSort: (key: string) => void,
	 *   onOpen: (dress: any) => void,
	 *   onArchive: (dress: any) => void
	 * }}
	 */
	let { rows, selected = $bindable([]), sort = null, onSort, onOpen, onArchive } = $props();

	const ids = $derived(rows.map((r) => r.dress.id));
	const allSelected = $derived(ids.length > 0 && ids.every((id) => selected.includes(id)));
	const someSelected = $derived(!allSelected && ids.some((id) => selected.includes(id)));

	/** @param {boolean} on */
	function toggleAll(on) {
		selected = on ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id));
	}

	/** @param {string} id @param {boolean} on */
	function toggle(id, on) {
		selected = on ? [...selected, id] : selected.filter((s) => s !== id);
	}

	/** @param {string} key */
	function ariaSort(key) {
		if (sort?.key !== key) return undefined;
		return sort.dir === "asc" ? "ascending" : "descending";
	}

	/** @param {string} value */
	const label = (value) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
	/** @param {number | string} n */
	const money = (n) => Number(n).toLocaleString();
</script>

{#snippet sortButton(/** @type {string} */ key, /** @type {string} */ text)}
	<button type="button" class="inline-flex items-center gap-1" onclick={() => onSort(key)}>
		{text}
		{#if sort?.key === key}
			{#if sort.dir === "asc"}<ArrowUpIcon class="size-3" />{:else}<ArrowDownIcon class="size-3" />{/if}
		{/if}
	</button>
{/snippet}

<Table.Root aria-label="Stock dresses">
	<Table.Header>
		<Table.Row class="h-11 hover:bg-transparent">
			<Table.Head class="w-11 px-0">
				<div class="flex justify-center">
					<Checkbox
						aria-label="Select all rows"
						checked={allSelected}
						indeterminate={someSelected}
						onCheckedChange={toggleAll}
					/>
				</div>
			</Table.Head>
			<Table.Head aria-sort={ariaSort("name")}>{@render sortButton("name", "Design")}</Table.Head>
			<Table.Head class="w-40">Category</Table.Head>
			<Table.Head class="w-48">Availability</Table.Head>
			<Table.Head class="w-28 text-right" aria-sort={ariaSort("quantity")}>
				<div class="flex justify-end">{@render sortButton("quantity", "In stock")}</div>
			</Table.Head>
			<Table.Head class="w-36 text-right" aria-sort={ariaSort("price")}>
				<div class="flex justify-end">{@render sortButton("price", "Price")}</div>
			</Table.Head>
			<Table.Head class="w-14"><span class="sr-only">Actions</span></Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each rows as r (r.dress.id)}
			{@const dress = r.dress}
			<Table.Row
				data-state={selected.includes(dress.id) ? "selected" : undefined}
				class={r.state === "archived" ? "opacity-70" : ""}
			>
				<Table.Cell class="px-0">
					<div class="flex justify-center">
						<Checkbox
							aria-label="Select {dress.name}"
							checked={selected.includes(dress.id)}
							onCheckedChange={(on) => toggle(dress.id, on)}
						/>
					</div>
				</Table.Cell>
				<Table.Cell>
					<button type="button" class="flex w-full min-w-0 items-center gap-3 text-left" onclick={() => onOpen(dress)}>
						<span class="bg-[var(--bg3)] text-text-muted flex aspect-[3/4] h-11 shrink-0 items-center justify-center overflow-hidden rounded-lg">
							{#if r.image}
								<img src={r.image.image_url} alt="" class="size-full object-cover" />
							{:else}
								<ImageIcon class="size-4" />
							{/if}
						</span>
						<span class="flex min-w-0 flex-col gap-0.5">
							<span class="truncate font-medium">{dress.name}</span>
							<span class="text-muted-foreground text-xs">
								<span class="font-mono">{dress.sku}</span> · {dress.garment_type}
							</span>
						</span>
					</button>
				</Table.Cell>
				<Table.Cell>
					<div class="flex flex-col gap-0.5">
						<span>{label(dress.category)}</span>
						{#if dress.subcategory}
							<span class="text-muted-foreground text-xs">{label(dress.subcategory)}</span>
						{/if}
					</div>
				</Table.Cell>
				<Table.Cell><StatusBadge state={r.state} /></Table.Cell>
				<Table.Cell>
					<div class="flex flex-col items-end gap-0.5">
						{#if dress.track_quantity}
							<span
								class="font-mono text-[13px] {r.state === 'sold_out' ? 'text-destructive' : r.quantity === 0 ? 'text-muted-foreground' : ''}"
								>{r.quantity}</span
							>
							{#if r.variantCount > 0}
								<span class="text-muted-foreground text-xs">
									{r.variantCount} {r.variantCount === 1 ? "variant" : "variants"}
								</span>
							{/if}
						{:else}
							<span class="text-muted-foreground font-mono text-[13px]">–</span>
						{/if}
					</div>
				</Table.Cell>
				<Table.Cell>
					<div class="flex flex-col items-end gap-0.5">
						<span class="font-mono text-[13px] whitespace-nowrap">
							<span class="text-muted-foreground">{r.priceVaries ? "from " : ""}PKR</span> {money(r.price)}
						</span>
						{#if dress.compare_at_price}
							<span class="text-muted-foreground font-mono text-xs line-through">{money(dress.compare_at_price)}</span>
						{/if}
					</div>
				</Table.Cell>
				<Table.Cell class="pr-3">
					<div class="flex justify-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button
										variant="ghost"
										size="icon"
										aria-label="Actions for {dress.name}"
										class="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
										{...props}
									>
										<EllipsisIcon />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item onSelect={() => onOpen(dress)}>View details</DropdownMenu.Item>
								<DropdownMenu.Item onSelect={() => goto(`/products/${dress.id}/edit`)}>Edit</DropdownMenu.Item>
								<DropdownMenu.Item
									variant="destructive"
									disabled={dress.status === "archived"}
									onSelect={() => onArchive(dress)}>Archive</DropdownMenu.Item
								>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
