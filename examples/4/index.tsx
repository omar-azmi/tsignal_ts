import { Context, MemoSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"
import { HyperScript_Signal } from "../jsx_transform4.ts"
// (() => { h; Fragment })() // preserving the imports

const
	ctx = new Context,
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	onInit = ctx.onInit,
	onDelete = ctx.onDelete


/** in the esbuild build options (`BuildOptions`), you must set `jsxFactory = "h"` and `jsxFragment = "Fragment"` */
export const h = ctx.addClass(HyperScript_Signal)

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
	return <div style={getStyle} >current time is: {getCount}</div>
}

