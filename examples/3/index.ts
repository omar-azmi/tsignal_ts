import { DOMAttrSignal_Factory, DOMTextNodeSignal_Factory } from "../../src/dom_signal.ts"
import { Context, MemoSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"
// (() => { h; Fragment })() // preserving the imports

const
	ctx = new Context,
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createText = ctx.addClass(DOMTextNodeSignal_Factory),
	createAttr = ctx.addClass(DOMAttrSignal_Factory),
	onInit = ctx.onInit,
	onDelete = ctx.onDelete

// TODO: implement `onDelete` cleanup
export const MyComponent = () => {
	const [, getCount, setCount] = createState(0)
	const [, getStyle, setStyle] = createState("background-color: red;")
	setInterval(() => {
		setCount((previous_count) => (previous_count ?? 0) + 1)
	}, 1000)
	setTimeout(() => {
		setStyle("background-color: green;")
	}, 3000)
	setTimeout(() => {
		setStyle("background-color: blue;")
	}, 6000)
	const div = document.createElement("div")
	div.appendChild(createText("current time is: ")[1]())
	div.appendChild(createText(getCount)[1]())
	div.setAttributeNode(createAttr("style", getStyle)[1]())
	return div
}

