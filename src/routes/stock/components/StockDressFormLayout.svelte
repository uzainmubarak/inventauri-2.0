<script>
	/**
	 * The page frame around the dress form: breadcrumb and title with the
	 * actions at the top, the fields, and the same actions again in a bar that
	 * stays at the bottom of the screen. Errors show in that bar.
	 * Props: `crumb` (last breadcrumb), `title`, `error`, `children` (the
	 * fields), `actions` (the buttons, drawn twice).
	 * @type {{
	 *   crumb: string,
	 *   title: string,
	 *   error?: string | null,
	 *   children: import("svelte").Snippet,
	 *   actions: import("svelte").Snippet
	 * }}
	 */
	let { crumb, title, error = null, children, actions } = $props();
</script>

<div class="flex-1 overflow-y-auto px-4 py-6 pb-20 md:px-12 md:py-10 md:pb-10">
	<div class="mb-7 flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-2">
			<nav aria-label="Breadcrumb" class="text-muted-foreground text-[13px]">
				<a href="/stock" class="hover:text-foreground">Stock</a> / {crumb}
			</nav>
			<h1 class="font-serif text-4xl leading-tight font-semibold">{title}</h1>
		</div>
		<div class="flex items-center gap-3">{@render actions()}</div>
	</div>

	<div class="flex flex-col gap-6">
		{@render children()}

		<div class="bg-card ring-foreground/10 sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl px-5 py-3.5 shadow-lg ring-1">
			<p class="min-w-0 flex-1 text-sm {error ? 'text-destructive' : ''}" role={error ? "alert" : undefined}>
				{error ? `Error: ${error}` : ""}
			</p>
			{@render actions()}
		</div>
	</div>
</div>
