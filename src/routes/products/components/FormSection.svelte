<script>
	/**
	 * One card of the dress form: serif title, optional help line, optional
	 * action on the right (a switch, a tag), then the fields.
	 * @type {{
	 *   title: string,
	 *   description?: string,
	 *   action?: import("svelte").Snippet,
	 *   children: import("svelte").Snippet,
	 *   class?: string
	 * }}
	 */
	let { title, description, action, children, class: className = "" } = $props();
</script>

<section class="bg-card ring-foreground/10 @container flex flex-col gap-5 rounded-xl p-6 ring-1 {className}">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h2 class="font-serif text-xl font-medium">{title}</h2>
			{#if description}
				<p class="text-muted-foreground text-[13px]">{description}</p>
			{/if}
		</div>
		{@render action?.()}
	</div>
	{@render children()}
</section>
