import { Dialog as SheetPrimitive } from "bits-ui";
import Content from "./sheet-content.svelte";
import Header from "./sheet-header.svelte";
import Title from "./sheet-title.svelte";
import Description from "./sheet-description.svelte";

const Root = SheetPrimitive.Root;
const Trigger = SheetPrimitive.Trigger;
const Close = SheetPrimitive.Close;

export {
	Root,
	Trigger,
	Close,
	Content,
	Header,
	Title,
	Description,
	//
	Root as Sheet,
	Content as SheetContent,
	Header as SheetHeader,
	Title as SheetTitle,
	Description as SheetDescription,
	Trigger as SheetTrigger,
	Close as SheetClose,
};
