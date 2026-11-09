<script>
	/**
	 * The page frame around a form: breadcrumb and title with the actions at the
	 * top, then the fields.
	 *
	 * Once the big header scrolls out of view, a slim bar with a smaller title
	 * and smaller buttons takes its place and stays at the top. The bar sits
	 * over the page without taking room, so showing it moves nothing.
	 *
	 * Props: `crumbs` (the breadcrumb trail after Stock; every item with an `href` is a link, the last is the page itself), `title`, `error` (shown under the
	 * header, and in the slim bar too), `note` (quiet text next to the buttons,
	 * such as "Unsaved changes"), `children` (the fields), `actions` (the
	 * buttons; called with `true` for the slim bar so they can shrink).
	 * @type {{
	 *   crumbs: { label: string, href?: string }[],
	 *   title: string,
	 *   error?: string | null,
	 *   note?: string,
	 *   children: import("svelte").Snippet,
	 *   actions: import("svelte").Snippet<[boolean]>
	 * }}
	 */
	let { crumbs, title, error = null, note = "", children, actions } = $props();

	/** @type {HTMLElement | undefined} */
	let scroller = $state();
	/** @type {HTMLElement | undefined} */
	let header = $state();
	let compact = $state(false);

	$effect(() => {
		if (!scroller || !header) return;
		const observer = new IntersectionObserver(([entry]) => (compact = !entry.isIntersecting), {
			root: scroller,
		});
		observer.observe(header);
		return () => observer.disconnect();
	});
</script>

{#snippet noteText()}
	{#if note}
		<span class="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
			<span class="bg-primary size-1.5 rounded-full"></span>{note}
		</span>
	{/if}
{/snippet}

<div bind:this={scroller} class="relative flex-1 overflow-y-auto">
	<div class="sticky top-0 z-20 h-0">
		<div
			class="border-border bg-background/90 absolute inset-x-0 top-0 border-b px-4 py-2.5 backdrop-blur-md transition duration-200 md:px-12 {compact
				? 'translate-y-0 opacity-100'
				: 'pointer-events-none -translate-y-2 opacity-0'}"
			aria-hidden={!compact}
			inert={!compact}
		>
			<div class="flex items-center justify-between gap-3">
				<span class="min-w-0 truncate font-serif text-xl leading-tight font-semibold">{title}</span>
				<div class="flex shrink-0 items-center gap-2">
					{@render noteText()}
					{@render actions(true)}
				</div>
			</div>
			{#if error}
				<p role={compact ? "alert" : undefined} class="bg-destructive/10 text-destructive mt-2 rounded-lg px-3 py-1.5 text-sm">
					Error: {error}
				</p>
			{/if}
		</div>
	</div>

	<div class="px-4 pt-6 md:px-12 md:pt-10">
		<div bind:this={header} class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex min-w-0 flex-col gap-2">
				<nav aria-label="Breadcrumb" class="text-muted-foreground text-[13px]">
					<ol class="flex flex-wrap items-center gap-x-1.5">
						{#each [{ label: "Stock", href: "/stock" }, ...crumbs] as item, i (i)}
							{#if i > 0}<li aria-hidden="true">/</li>{/if}
							<li>
								{#if item.href}
									<a href={item.href} class="hover:text-foreground underline-offset-2 hover:underline">{item.label}</a>
								{:else}
									<span aria-current="page" class="text-foreground">{item.label}</span>
								{/if}
							</li>
						{/each}
					</ol>
				</nav>
				<h1 class="font-serif text-4xl leading-tight font-semibold">{title}</h1>
			</div>
			<div class="flex items-center gap-3">
				{@render noteText()}
				{@render actions(false)}
			</div>
		</div>
		{#if error}
			<p role={compact ? undefined : "alert"} class="bg-destructive/10 text-destructive mt-4 rounded-lg px-3 py-2 text-sm">
				Error: {error}
			</p>
		{/if}
	</div>

	<div class="px-4 pt-7 pb-20 md:px-12 md:pb-10">
		{@render children()}
	</div>
</div>
