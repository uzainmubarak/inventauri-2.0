<script lang="ts">
	import * as Table from "$lib/ui/table";
	import { Button } from "$lib/ui/button";
	import { Input } from "$lib/ui/input";
	import { Badge } from "$lib/ui/badge";
	import { Checkbox } from "$lib/ui/checkbox";
	import SearchIcon from "@lucide/svelte/icons/search";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import EllipsisIcon from "@lucide/svelte/icons/ellipsis";
	import ImageIcon from "@lucide/svelte/icons/image";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

	// Sample data only.
	const rows = [
		{ code: "DUP-0142", name: "Silk dupatta", status: "In stock", variant: "success", category: "Dupattas", qty: 24, price: 4500 },
		{ code: "SHL-0087", name: "Embroidered shawl", status: "Low stock", variant: "warning", category: "Shawls", qty: 3, price: 12800 },
		{ code: "SCF-0210", name: "Chiffon scarf", status: "In stock", variant: "success", category: "Scarves", qty: 41, price: 2200 },
		{ code: "LHG-0019", name: "Bridal lehenga", status: "Made to order", variant: "info", category: "Bridal", qty: null, price: 85000 },
		{ code: "KRT-0334", name: "Cotton kurta", status: "Out of stock", variant: "destructive", category: "Kurtas", qty: 0, price: 3900 },
	] as const;

	let selected = $state<string[]>([]);
	const all = $derived(selected.length === rows.length);
	const some = $derived(selected.length > 0 && !all);

	const toggle = (code: string, on: boolean) =>
		(selected = on ? [...selected, code] : selected.filter((c) => c !== code));
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
	<div class="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
		<div class="flex items-center gap-3 border-b border-border-light p-4">
			<div class="relative w-80">
				<SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
				<Input type="search" aria-label="Search items" placeholder="Search by name or code" class="pl-9" />
			</div>
			<div class="flex-1"></div>
			<Button><PlusIcon />Add item</Button>
		</div>

		<Table.Root aria-label="Sample items">
			<Table.Header>
				<Table.Row class="h-11 hover:bg-transparent">
					<Table.Head class="w-11 px-0">
						<div class="flex justify-center">
							<Checkbox
								aria-label="Select all rows"
								checked={all}
								indeterminate={some}
								onCheckedChange={(on) => (selected = on ? rows.map((r) => r.code) : [])}
							/>
						</div>
					</Table.Head>
					<Table.Head aria-sort="ascending">
						<span class="inline-flex items-center gap-1">Name<ArrowUpIcon class="size-3" /></span>
					</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head class="text-right">Qty</Table.Head>
					<Table.Head class="text-right">Price</Table.Head>
					<Table.Head class="w-16"><span class="sr-only">Actions</span></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as r (r.code)}
					<Table.Row data-state={selected.includes(r.code) ? "selected" : undefined}>
						<Table.Cell class="px-0">
							<div class="flex justify-center">
								<Checkbox
									aria-label="Select {r.name}"
									checked={selected.includes(r.code)}
									onCheckedChange={(on) => toggle(r.code, on)}
								/>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg3)] text-text-muted">
									<ImageIcon class="size-4" />
								</div>
								<div class="flex flex-col gap-0.5">
									<span class="font-medium">{r.name}</span>
									<span class="font-mono text-xs text-muted-foreground">{r.code}</span>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell><Badge variant={r.variant} class="h-6 px-2.5">{r.status}</Badge></Table.Cell>
						<Table.Cell>{r.category}</Table.Cell>
						<Table.Cell
							class="text-right font-mono text-[13px] {r.qty === 0 ? 'text-destructive' : r.variant === 'warning' ? 'text-[#7A5C10]' : ''}"
						>
							{r.qty ?? "–"}
						</Table.Cell>
						<Table.Cell class="text-right font-mono text-[13px]">
							<span class="text-muted-foreground">PKR</span> {r.price.toLocaleString("en-US")}
						</Table.Cell>
						<Table.Cell class="pr-3">
							<div class="flex justify-end opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100">
								<Button variant="ghost" size="icon" aria-label="Row actions"><EllipsisIcon /></Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="flex items-center justify-between border-t border-border-light bg-background px-4 py-3">
			<span class="text-[13px] text-muted-foreground">Showing 1 to {rows.length} of 48</span>
			<div class="flex gap-2">
				<Button variant="outline" size="icon" aria-label="Previous page" disabled><ChevronLeftIcon /></Button>
				<Button variant="outline" size="icon" aria-label="Next page"><ChevronRightIcon /></Button>
			</div>
		</div>
	</div>

	{#if selected.length}
		<div class="flex w-fit items-center gap-3 rounded-xl bg-[var(--sidebar-bg)] py-2.5 pr-3 pl-5 text-[var(--sidebar-text)] shadow-lg">
			<span class="text-sm font-medium text-white">{selected.length} selected</span>
			<span class="h-5 w-px bg-white/10"></span>
			<Button variant="ghost" class="text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white">Export</Button>
			<Button variant="ghost" class="text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white">Archive</Button>
			<Button class="bg-destructive text-white hover:bg-destructive/90">Delete</Button>
			<Button variant="ghost" size="sm" onclick={() => (selected = [])}>Clear</Button>
		</div>
	{/if}
</div>
