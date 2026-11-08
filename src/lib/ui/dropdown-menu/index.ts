import { DropdownMenu as MenuPrimitive } from "bits-ui";
import Content from "./dropdown-menu-content.svelte";
import Item from "./dropdown-menu-item.svelte";

const Root = MenuPrimitive.Root;
const Trigger = MenuPrimitive.Trigger;

export {
	Root,
	Trigger,
	Content,
	Item,
	//
	Root as DropdownMenu,
	Content as DropdownMenuContent,
	Item as DropdownMenuItem,
	Trigger as DropdownMenuTrigger,
};
