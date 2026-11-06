<script>
	import { Button } from "$lib/ui/button";
	import { Input } from "$lib/ui/input";
	import { Textarea } from "$lib/ui/textarea";
	import { Label } from "$lib/ui/label";
	import { Badge } from "$lib/ui/badge";
	import { Switch } from "$lib/ui/switch";
	import * as Card from "$lib/ui/card";
</script>

<div style="padding:32px; max-width:640px; display:flex; flex-direction:column; gap:20px;">
	<Card.Root>
		<Card.Header>
			<Card.Title>Options</Card.Title>
			<Card.Description>Choices made at order time that are not stocked separately.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<div class="flex gap-2">
				<Input placeholder="Option name, e.g. Dupatta Style" />
				<Button variant="outline">Add Option</Button>
			</div>
			<div class="flex flex-wrap gap-1.5">
				<Badge variant="secondary">plain</Badge>
				<Badge variant="secondary">Hand-painted +40,000</Badge>
			</div>
			<div class="flex gap-2">
				<Input placeholder="Value, e.g. Hand-painted" />
				<Input type="number" placeholder="+PKR" class="w-28" />
				<Button variant="outline">Add Value</Button>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="d">Description</Label>
				<Textarea id="d" placeholder="Shown to customers" />
			</div>
			<div class="flex items-center gap-2">
				<Switch id="t" checked />
				<Label for="t">Track quantity</Label>
			</div>
		</Card.Content>
		<Card.Footer class="gap-2">
			<Button variant="outline">Cancel</Button>
			<Button variant="secondary">Save Draft</Button>
			<Button>Create Stock Dress</Button>
		</Card.Footer>
	</Card.Root>
</div>
