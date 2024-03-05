/** @jsx h */
/** @jsxFrag hf */

import { createHyperScript } from "../../src/jsx-runtime/mod.ts"
import { Context, MemoSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"

const
	ctx = new Context,
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	onInit = ctx.onInit,
	onDelete = ctx.onDelete


/** in the esbuild build options (`BuildOptions`), you must set `jsxFactory = "h"` and `jsxFragment = "hf"` */
export const [h, hf] = createHyperScript(ctx)

// TODO: implement `onDelete` cleanup
export const MyComponents = () => {
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
	return <>
		<div style={getStyle} >current time is: {getCount}</div>
		<div style={getStyle} >current time is: {getCount}</div>
	</>
}

export const MyComponent = () => {
	const component_fragment = MyComponents()
	setTimeout(() => {
		document.body.appendChild(component_fragment[0])
	}, 4000)
	return component_fragment[1]
}
