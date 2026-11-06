<script>
	import { Button } from "$lib/ui/button";
</script>

<div style="padding:40px; display:flex; flex-direction:column; gap:20px;">
	<h1 class="font-serif" style="font-size:28px;">Component probe</h1>

	<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
		<Button>Create Stock Dress</Button>
		<Button variant="secondary">Save Draft</Button>
		<Button variant="outline">Cancel</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="destructive">Archive</Button>
		<Button variant="link">Link</Button>
	</div>

	<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
		<Button size="xs">xs</Button>
		<Button size="sm">sm</Button>
		<Button>default</Button>
		<Button size="lg">lg</Button>
		<Button disabled>disabled</Button>
	</div>
</div>
