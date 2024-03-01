/** this module allows one to create reactive DOM elements.
 * 
 * @module
*/

import { Context } from "./context.ts"
import { isFunction, Stringifyable } from "./deps.ts"
import { MemoSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import { Accessor, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"

type NodeValue = Stringifyable | null // Node["nodeValue"]
type AttrValue = Stringifyable | null // Attr["nodeValue"]
type NodeValueEqualityFn<V extends NodeValue = NodeValue> = (prev_nodeValue: string | null | undefined, new_nodeValue: V) => boolean
type NodeValueUpdater<V extends NodeValue = NodeValue> = (prev_value: string | null) => V | string | null

const dom_value_equality = <V extends NodeValue>(prev_nodeValue: string | null | undefined, new_nodeValue: V): boolean => {
	// we first standardize the nullability value to `undefined`
	new_nodeValue ??= undefined as any
	prev_nodeValue ??= undefined
	return prev_nodeValue === new_nodeValue?.toString()
}


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
	return class DOMSignal<N extends Node, V extends NodeValue> extends ctx.getClass(SimpleSignal_Factory)<N> {
		declare value: N
		// @ts-ignore: incompatible with super class
		declare equals: NodeValueEqualityFn<V>
		declare fn?: Accessor<V>
		/** the previous parent element is stored in case this node is {@link detach | detached}, followed by a request to {@link reattach}. */
		protected prev_parent: Element | null = null

		constructor(
			node: N,
			fn?: V | Accessor<V>,
			config: Omit<DOMSignalConfig<N>, "value"> = {},
		) {
			config.equals ??= dom_value_equality
			super(node, config as any)
			// the previous parent must be assigned before `this.fn` gets executed if `config.defer` is `false` (or `undefined`) (via `this.get()`, followed by `this.run()`).
			// this is because the reactivity function `this.fn` may rely-on/expect the `node` to be already attached to a parent, and my set a value which would ultimately result in the detachment of the `node` from its parent.
			// but then during reattachment, it will not have any info about what to reattach to.
			if (fn !== undefined) { this.fn = isFunction(fn) ? fn as any : (() => fn) }
			this.prev_parent = this.getParentElement()
			if ((config?.defer ?? false) === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): N {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		// @ts-ignore: signature is incompatible with super class
		set(new_value: V | NodeValueUpdater<V>): boolean {
			const
				node = this.value,
				old_value = node.nodeValue
			new_value = isFunction(new_value) ? new_value(old_value) : new_value
			this.setNodeValue(new_value)
			return !this.equals(old_value, new_value as V)
		}

		getParentElement(): Element | null { return this.value.parentElement }
		removeFromParentElement(): boolean { return this.getParentElement()?.removeChild(this.value) ? true : false }
		appendToElement(element: Element) { element.appendChild(this.value) }
		getNodeValue() { return this.value.nodeValue }
		setNodeValue(new_value?: Stringifyable | null | undefined): (string | null) {
			const is_null = new_value === null || new_value === undefined
			return (this.value.nodeValue = (is_null ? null : new_value.toString()))
		}

		/** detach the DOM Node from its parent.
		 * the most recent parent will be remembered when you call the {@link reattach | `reattach`} method.
		*/
		detach(): boolean {
			const current_parent_elem = this.getParentElement()
			if (current_parent_elem) {
				this.prev_parent = current_parent_elem
				this.removeFromParentElement()
				return true
			}
			return false
		}

		/** reattach the element back to its original parent node.
		 * if the parent node is not available, an optional `fallback_element` will be used.
		 * otherwise, this signal's node won't get attached, and a `false` will be returned.
		*/
		reattach(fallback_element?: Element | null): boolean {
			const element = this.prev_parent ?? fallback_element
			if (element) {
				this.appendToElement(element)
				return true
			}
			return false
		}
	}
}

export const DOMTextNodeSignal_Factory = (ctx: Context) => {
	// TODO: implement ctx.onDelete
	// TODO: make this extend MemoSignal instead of SimpleSignal, or extend DOMSignal
	const onDelete = ctx.onDelete

	return class TextNodeSignal<N extends Text, V extends NodeValue = NodeValue> extends ctx.getClass(DOMSignal_Factory)<N, V> {
		declare fn: Accessor<V>

		constructor(
			dependency_signal: V | Accessor<V>,
			config?: DOMSignalConfig<N>,
		) {
			const text_node = config?.value ?? document.createTextNode("") as N
			super(text_node, dependency_signal, config)
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		set(new_value: V | NodeValueUpdater<V>): boolean {
			// TODO think whether or not we should remove the text node if the new value is null.
			// if yes, then you should override the `this.setNodeValue` method, and call the `this.detach` method in there if the null value condition is met.
			return super.set(new_value)
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
	return class AttrNodeSignal<N extends Attr, V extends AttrValue = AttrValue> extends ctx.getClass(DOMSignal_Factory)<N, V> {
		declare fn: Accessor<V>

		constructor(
			attribute_node: Attr,
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			attribute_name: Attr["name"],
			dependency_signal: Stringifyable | Accessor<Stringifyable>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			attribute: N | N["name"],
			dependency_signal: V | Accessor<V>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		) {
			const attr_node = typeof attribute === "string" ? document.createAttribute(attribute) : attribute
			// the previous parent must be assigned before `this.fn` runs.
			// so we must defer the potential initial immediate execution by setting `config.defer` to `undefined`,
			// and then later on acting upon whether the `original_defer` was true or not.
			// const original_defer = config.defer ?? false
			// config.defer = undefined
			super(attr_node as N, dependency_signal, config)
			// this.prev_parent = this.getParentElement()
			// if (!original_defer) { this.get() }
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		getParentElement(): Element | null {
			// and attribute node's `parentElement` is always null, even when attached.
			// we must use `ownerElement` to figure out the node this attribute is attached to.
			return this.value.ownerElement
		}
		removeFromParentElement(): boolean { return this.getParentElement()?.removeAttributeNode(this.value) ? true : false }
		appendToElement(element: Element): void {
			element.setAttributeNode(this.value)
		}
		setNodeValue(new_value?: Stringifyable | null | undefined): (string | null) {
			// we remove the attribute if the `new_value` is `undefined` or `null`.
			// otherwise, we stringify the result.
			// note that an empty string (`""`) will keep the attribute, but without the equals sign.
			const
				current_parent_elem = this.getParentElement(),
				// remember that empty string is also falsey, so we cannot rely on ternary expression
				should_remove_attr = new_value === undefined || new_value === null
			if (should_remove_attr) {
				super.detach()
			} else if (!current_parent_elem) {
				// the attribute is currently not attached, but the new value is not null,
				// so we attach it back to its previous most recent parent.
				this.reattach()
			}
			return super.setNodeValue(new_value)
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
