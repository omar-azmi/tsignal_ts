/** @jsx h */
/** @jsxFrag hf */

import { createHyperScript } from "../../src/jsx/hyperscript.ts"
import { Context, StateSignal_Factory } from "../../src/mod.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	onDelete = ctx.onDelete


/** in the esbuild build options (`BuildOptions`), you must set `jsxFactory = "h"` and `jsxFragment = "hf"` */
export const [h, hf] = createHyperScript(ctx)

const CountingComponent = () => {
	const [idCount, getCount, setCount] = createState(0)
	const interval = setInterval(
		() => setCount((c) => (c as number) + 1),
		1000
	)
	onDelete(idCount, () => clearInterval(interval))
	return <div>Count value is {getCount}</div>
}

document.getElementById("root")!.append(<CountingComponent />)
