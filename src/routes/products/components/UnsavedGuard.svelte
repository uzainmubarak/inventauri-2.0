<script>
	/**
	 * Stops the user leaving a form with unsaved changes. Closing the tab gets
	 * the browser's own prompt; in-app navigation gets a dialog with Stay and
	 * Leave. Props: `dirty` (true while there are unsaved changes).
	 * @type {{ dirty: boolean }}
	 */
	import { beforeNavigate, goto } from "$app/navigation";
	import * as Dialog from "$lib/ui/dialog";
	import { Button } from "$lib/ui/button";

	let { dirty } = $props();

	/** @type {URL | null} */
	let pending = null;
	let open = $state(false);
	let allowed = false;

	beforeNavigate(({ cancel, to, willUnload }) => {
		if (!dirty || allowed) return;
		cancel();
		// A tab close or reload has no URL to resume, so the browser asks.
		if (willUnload || !to) return;
		pending = to.url;
		open = true;
	});

	function leave() {
		const url = pending;
		open = false;
		allowed = true;
		if (url) goto(url);
	}
</script>

<svelte:window onbeforeunload={(e) => dirty && e.preventDefault()} />

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Leave page with unsaved changes?</Dialog.Title>
			<Dialog.Description>Leaving this page will delete all unsaved changes.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Stay</Button>
			<Button variant="destructive" onclick={leave}>Leave page</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
