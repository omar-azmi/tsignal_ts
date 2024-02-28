/** this module allows one to create reactive DOM elements.
 * 
 * @module
*/

import { Context } from "./context.ts"
import { isFunction, Stringifyable } from "./deps.ts"
import { MemoSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import { Accessor, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"

type NodeValue = Node["nodeValue"]
type AttrValue = Attr["nodeValue"]
type NodeValueEqualityFn = (prev_nodeValue: NodeValue | undefined, new_nodeValue: NodeValue) => boolean
// TODO: purge the function below
// const dom_value_equality: (prev_nodeValue: NodeValue | undefined, new_nodeValue: NodeValue) => boolean = default_equality


// @ts-ignore: `equals` is incompatible with the super `MemoSignalConfig` interface.
interface DOMSignalConfig<N extends Node> extends MemoSignalConfig<N> {
	/** when the underlying dependency signal's value changes, the value of the DOM Node will also change,
	 * but you get to decide whether or not this DOM Node's observers will be notified of the update based on the `equals` function criteria,
	 * which should compare the old inner text value of the Node to the new one. <br>
	 * when left `undefined`, the default string equality check will be used (i.e. `(old_text: string | null, new_text: string | null) => old_text === new_text`)
	*/
	equals?: NodeValueEqualityFn

	/** when `false`, the DOM Node's inner text will be be evaluated and assigned immediately after the `DOMSignal` is declared. <br>
	 * `false` is the default behavior (immediately assignment) when the field is left `undefined`.
	 * this contrast's {@link MemoSignalConfig.defer | `MemoSignalConfig.defer`}'s default behavior. <br>
	 * if, however, it was assigned `true`, the DOM Node's text value assignment will not occur until another signal calls this signal's `get` method. <br>
	*/
	defer?: boolean

	/** provide an optional DOM `Node` (i.e. `HTMLElement`) which should be used as the component bound to the signal. <br>
	 * if not provided, a new one will be created for you within the `DOMSignal`'s constructor.
	*/
	value?: N
}

export const DOMSignal_Factory = (ctx: Context) => {
	return class DOMSignal<N extends Node> extends ctx.getClass(SimpleSignal_Factory)<N> {
		declare value: N
		// @ts-ignore: incompatible with super class
		declare equals: NodeValueEqualityFn

		constructor(
			value?: NodeValue,
			config?: MemoSignalConfig<N>,
		) {
			super(config?.value, config)
			// this.fn = fn
			if (config?.defer === false) { this.get() }
		}

		// @ts-ignore: signature is incompatible with super class
		set(new_value: NodeValue | Updater<NodeValue>): boolean {
			const
				node = this.value,
				old_value = node.nodeValue
			return !this.equals(old_value, (
				node.nodeValue = isFunction(new_value) ?
					(new_value as Updater<NodeValue>)(old_value) :
					new_value
			))
		}
	}
}

export const DOMTextNodeSignal_Factory = (ctx: Context) => {
	// TODO: implement ctx.onDelete
	// TODO: make this extend MemoSignal instead of SimpleSignal, or extend DOMSignal
	return class TextNodeSignal<N extends Text> extends ctx.getClass(SimpleSignal_Factory)<N> {
		declare value: N
		// @ts-ignore: incompatible with super class
		declare equals: NodeValueEqualityFn
		fn: Accessor<Stringifyable>

		constructor(
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: DOMSignalConfig<N>,
		) {
			const text_node = config?.value ?? document.createTextNode("") as N
			// config.equals = dom_value_equality as any
			super(text_node, config as any)
			this.fn = isFunction(dependency_signal) ? dependency_signal as any : (() => dependency_signal)
			if ((config?.defer ?? false) === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): N {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid).toString()) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		// @ts-ignore: signature is incompatible with super class
		set(new_value: NodeValue | Updater<NodeValue>): boolean {
			const
				node = this.value,
				old_value = node.nodeValue
			return !this.equals(old_value, (
				node.nodeValue = isFunction(new_value) ?
					(new_value as Updater<NodeValue>)(old_value) :
					new_value
			))
		}

		static create<N extends Text>(dependency_signal: Stringifyable | Accessor<Stringifyable>, config?: DOMSignalConfig<N>): [id: number, dependOnText: Accessor<N>, textNode: Text] {
			const new_signal = new this<N>(dependency_signal, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.value,
			]
		}
	}
}

export const DOMAttrSignal_Factory = (ctx: Context) => {
	return class TextNodeSignal<N extends Attr> extends ctx.getClass(SimpleSignal_Factory)<N> {
		declare value: N
		// @ts-ignore: incompatible with super class
		declare equals: NodeValueEqualityFn
		fn: Accessor<Stringifyable>

		constructor(
			attribute_node: Attr,
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: DOMSignalConfig<N> & { value: never },
		)
		constructor(
			attribute_name: Attr["name"],
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: DOMSignalConfig<N> & { value: never },
		)
		constructor(
			attribute: N | N["name"],
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: DOMSignalConfig<N> & { value: never },
		) {
			const attr_node = typeof attribute === "string" ? document.createAttribute(attribute) : attribute
			super(attr_node as N, config as any)
			this.fn = isFunction(dependency_signal) ? dependency_signal as any : (() => dependency_signal)
			if ((config?.defer ?? false) === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): N {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid).toString()) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		// @ts-ignore: signature is incompatible with super class
		set(new_value: AttrValue | Updater<AttrValue>): boolean {
			const
				attr_node = this.value,
				old_value = attr_node.nodeValue
			return !this.equals(old_value, (
				attr_node.nodeValue = isFunction(new_value) ?
					(new_value as Updater<NodeValue>)(old_value) :
					new_value
			))
		}

		static create(attribute_node: Attr, dependency_signal: Stringifyable | Accessor<Stringifyable>, config?: DOMSignalConfig<Attr> & { value: never }): [id: number, dependOnAttr: Accessor<Attr>, attrNode: Attr]
		static create(attribute_name: Attr["name"], dependency_signal: Stringifyable | Accessor<Stringifyable>, config?: DOMSignalConfig<Attr> & { value: never }): [id: number, dependOnAttr: Accessor<Attr>, attrNode: Attr]
		static create<N extends Attr>(attribute: N | N["name"], dependency_signal: Stringifyable | Accessor<Stringifyable>, config?: DOMSignalConfig<N>): [id: number, dependOnAttr: Accessor<N>, attrNode: N] {
			const new_signal = new this<N>(attribute as any, dependency_signal, config as any)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.value,
			]
		}
	}
}

