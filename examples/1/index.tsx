import { Context, ID, MemoSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"
import { Fragment, h } from "../jsx_transform.ts"
(() => { h; Fragment })() // preserving the imports

const
	ctx = new Context,
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	onInit = ctx.onInit,
	onDelete = ctx.onDelete

interface HTMLSignalComponent {
	component: HTMLElement
	[key: string]: any
}


export const MyComponent2 = () => {
	const [, getCount, setCount] = createState(0)
	setInterval(() => {
		setCount((previous_count) => (previous_count ?? 0) + 1)
	}, 1000)
	return <div>current time is: {getCount}</div>
}


export const [, MyComponent] = createMemo(function (this: HTMLSignalComponent, id: ID) {
	console.log("recomputing MyComponent")

	this.component ??= onInit(id, () => {
		const [, getCount, setCount] = createState(0)
		this.interval_time = setInterval(
			() => setCount((previous_count) => (previous_count ?? 0) + 1),
			1000
		)
		const mutateElement = (elem: Text) => {
			// elem.data = getCount(id).toString()
			return elem
		}
		// this.getCount = getCount
		return <div>current time is: {mutateElement}</div>
	})
	onDelete(id, () => {
		clearInterval(this.interval_time)
		this.component.remove()
	})
	// this.component.textContent = "current time is: " + this.getCount(id).toString()

	return this.component
}, { equals: false })

export const AnotherComponent = <MyComponent2 />
