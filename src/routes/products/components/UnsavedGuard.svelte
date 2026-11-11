<script>
	/**
	 * Stops the user leaving a form with unsaved changes. Closing the tab gets
	 * the browser's own prompt; in-app navigation gets a dialog with Stay and
	 * Leave. Props: `dirty` (true while there are unsaved changes) and an
	 * optional `onsave` (saves the form and resolves true when it worked): with
	 * it the dialog also offers Save and leave.
	 * @type {{ dirty: boolean, onsave?: () => Promise<boolean> }}
	 */
	import { beforeNavigate, goto } from "$app/navigation";
	import * as Dialog from "$lib/ui/dialog";
	import { Button } from "$lib/ui/button";

	let { dirty, onsave } = $props();

	/** @type {URL | null} */
	let pending = null;
	let open = $state(false);
	let allowed = false;
	let saving = $state(false);

	beforeNavigate(({ cancel, to, willUnload }) => {
		if (!dirty || allowed) return;
		cancel();
		// A tab close or reload has no URL to resume, so the browser asks.
		if (willUnload || !to) return;
		pending = to.url;
		open = true;
	});

	async function saveAndLeave() {
		saving = true;
		const ok = await onsave?.();
		saving = false;
		open = false;
		if (ok) leave();
	}

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
			<Dialog.Description>
				{onsave ? "Save your changes first, or they will be lost." : "Leaving this page will delete all unsaved changes."}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Stay</Button>
			<Button variant={onsave ? "outline" : "destructive"} onclick={leave} disabled={saving}>
				{onsave ? "Leave without saving" : "Leave page"}
			</Button>
			{#if onsave}<Button onclick={saveAndLeave} disabled={saving}>{saving ? "Saving…" : "Save and leave"}</Button>{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
