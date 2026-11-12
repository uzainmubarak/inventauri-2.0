<script>
	import { Button } from "$lib/ui/button";
	/**
	 * The page frame around a form: breadcrumb and title at the
	 * top, then the fields.
	 *
	 * Once the big header scrolls out of view, a slim bar with a smaller title
	 * and smaller buttons takes its place and stays at the top. The bar sits
	 * over the page without taking room, so showing it moves nothing.
	 *
	 * Props: `crumbs` (the breadcrumb trail after Stock; every item with an `href` is a link, the last is the page itself), `title`, `error` (shown under the
	 * header), `dirty` (true while there are unsaved changes: a save bar with
	 * Discard and Save slides in at the top and stays until one is chosen),
	 * `saving`, `saveLabel`, `ondiscard`, `nudge` (bump the number to shake the
	 * save pill once, e.g. when something is blocked until the form is saved),
	 * `actions` (optional buttons at the right of the title, e.g. Delete variant),
	 * `children` (the fields). Save submits the surrounding form.
	 * @type {{
	 *   crumbs: { label: string, href?: string }[],
	 *   title: string,
	 *   error?: string | null,
	 *   dirty?: boolean,
	 *   saving?: boolean,
	 *   saveLabel?: string,
	 *   ondiscard: () => void,
	 *   nudge?: number,
	 *   actions?: import("svelte").Snippet,
	 *   children: import("svelte").Snippet
	 * }}
	 */
	let { crumbs, title, error = null, dirty = false, saving = false, saveLabel = "Save", ondiscard, nudge = 0, actions, children } = $props();

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
			</div>
			{#if error}
				<p role={compact ? "alert" : undefined} class="bg-destructive/10 text-destructive mt-2 rounded-lg px-3 py-1.5 text-sm">
					Error: {error}
				</p>
			{/if}
		</div>
		<div
			class="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4 transition duration-200 {dirty
				? 'translate-y-0 opacity-100'
				: '-translate-y-4 opacity-0'}"
			aria-hidden={!dirty}
			inert={!dirty}
		>
			{#key nudge}
			<div class="bg-card text-foreground border-border pointer-events-auto flex items-center gap-4 rounded-full border py-1.5 pr-1.5 pl-4 shadow-lg {nudge ? 'nudge' : ''}">
				<span class="flex items-center gap-2 text-sm font-medium"><span class="bg-primary size-2 rounded-full"></span>Unsaved changes</span>
				<div class="flex items-center gap-1.5">
					<Button variant="ghost" size="sm" class="rounded-full" type="button" onclick={ondiscard} disabled={saving}>Discard</Button>
					<Button size="sm" class="rounded-full" type="submit" disabled={saving}>{saving ? "Saving…" : saveLabel}</Button>
				</div>
			</div>
			{/key}
		</div>
		<span class="sr-only" role="status">{nudge ? "Save your changes before moving on." : ""}</span>
	</div>

	<div class="px-4 pt-6 md:px-12 md:pt-10">
		<div bind:this={header} class="flex flex-wrap items-end justify-between gap-4">
			<div class="flex min-w-0 flex-col gap-2">
				<nav aria-label="Breadcrumb" class="text-muted-foreground text-[13px]">
					<ol class="flex flex-wrap items-center gap-x-1.5">
						{#each [{ label: "Stock", href: "/products" }, ...crumbs] as item, i (i)}
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
			{#if actions}{@render actions()}{/if}
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

<style>
	/* Shake once and light the border: "save first". Reduced motion gets the border only. */
	.nudge {
		animation: nudge 0.45s ease-in-out, nudge-border 1.2s ease-out;
	}
	@keyframes nudge {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-8px); }
		40% { transform: translateX(7px); }
		60% { transform: translateX(-5px); }
		80% { transform: translateX(3px); }
	}
	@keyframes nudge-border {
		0% { border-color: var(--gold); }
		100% { border-color: var(--border); }
	}
	@media (prefers-reduced-motion: reduce) {
		.nudge { animation: nudge-border 1.2s ease-out; }
	}
</style>
