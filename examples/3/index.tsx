/** @jsx h */
/** @jsxFrag hf */

import { createHyperScript } from "../../src/jsx-runtime/mod.ts"
import { Context, MemoSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory)

/** in the esbuild build options (`BuildOptions`), you must set `jsxFactory = "h"` and `jsxFragment = "hf"` */
export const [h, hf, namespaceStack] = createHyperScript(ctx)

type TimeState = {
	hour: number
	minute: number
	second: number
}

const App = () => {
	const
		now_time = new Date(),
		today_midnight_epochtime = new Date(now_time.getFullYear(), now_time.getMonth(), now_time.getDate(), 0, 0, 0).getTime(),
		[, getEpochTime, setEpochTime] = createState<number>(0),
		[, seconds_since_midnight] = createMemo((id) => {
			return ((getEpochTime(id) - today_midnight_epochtime) / 1000) | 0
		})
	const [, currentTime] = createMemo<TimeState>((id) => {
		const s = seconds_since_midnight(id)
		return {
			second: s % (60),
			minute: ((s / 60) % 60) | 0,
			hour: ((s / (60 * 60)) % 12) | 0,
		}
	}, { equals: false })


	setInterval(() => setEpochTime(Date.now()), 500)

	// we must change the namespace to `svg`, so that hypescript picks up on it, and handles the newly created svg nodes appropriately.
	namespaceStack.push("svg")
	const svg_dom = <svg style="user-select: none;" width="200px" height="200px" viewbox="0 0 200 200">
		<g transform="translate(100, 100)">
			<circle r="100" fill="lightgrey" stroke="black" />
			<text text-anchor="middle" y="-25">Apple Watch XVII</text>
			<line transform={createMemo((id) => `rotate(${currentTime(id).second * 6})`)[1]} class="hand-seconds" y1="0" y2="-100" stroke="red" stroke-width={4} />
			<line transform={createMemo((id) => `rotate(${currentTime(id).minute * 6})`)[1]} class="hand-minutes" y1="0" y2="-100" stroke="green" stroke-width={4} />
			<line transform={createMemo((id) => `rotate(${currentTime(id).hour * 5 * 6})`)[1]} class="hand-hours" y1="0" y2="-100" stroke="blue" stroke-width={4} />
		</g>
	</svg>
	// declare that the svg namespace is now over, and switch back to html namespace
	namespaceStack.pop()
	return svg_dom
}

document.getElementById("root")!.append(App())
