/** this module allows one to create reactive DOM elements.
 * 
 * @module
*/

import { Context } from "./context.ts"
import { Stringifyable, isFunction, isPrimitive, symbol_iterator } from "./deps.ts"
import { MemoSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import { Accessor, SignalUpdateStatus, TO_ID, UNTRACKED_ID } from "./typedefs.ts"


export type NodeValue = Stringifyable | null // Node["nodeValue"]
export type AttrValue = Stringifyable | null // Attr["nodeValue"]
type ElementCollection = Array<Element | Node> | HTMLCollection
export type HtmlInnerValue = (Element | Node) | ElementCollection | NodeValue // HTMLElement["innerHTML"]
export type NodeValueEqualityFn<V extends NodeValue = NodeValue> = (prev_nodeValue: string | null | undefined, new_nodeValue: V) => boolean
export type NodeValueUpdater<V extends NodeValue = NodeValue> = (prev_value: string | null) => V | string | null

export const default_dom_value_equality = <V extends NodeValue>(prev_nodeValue: string | null | undefined, new_nodeValue: V): boolean => {
	// we first standardize the nullability value to `undefined`
	new_nodeValue ??= undefined as any
	prev_nodeValue ??= undefined
	return prev_nodeValue === new_nodeValue?.toString()
}
const
	is_DOM_node = (obj: any): obj is Node => {
		return obj instanceof Node
	},
	as_DOM_node_array = (obj: any): undefined | Array<Element | Node> => {
		obj = is_DOM_node(obj) ? [obj] : obj
		if (isPrimitive(obj) || !(symbol_iterator in obj)) { return }
		const
			item_iterator = obj[symbol_iterator]() as IterableIterator<any>,
			first_item = item_iterator.next().value
		return is_DOM_node(first_item) ? [first_item, ...item_iterator] : undefined
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
			config.equals ??= default_dom_value_equality
			super(node, config as any)
			if (fn !== undefined) { this.fn = isFunction(fn) ? fn as any : (() => fn) }
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
			this.setNodeValue(new_value as V)
			return !this.equals(old_value, new_value as V)
		}

		protected getParentElement(): Element | null { return this.value.parentElement }
		protected removeFromParentElement(): boolean { return this.getParentElement()?.removeChild(this.value) ? true : false }
		protected appendToElement(element: Element) { element.appendChild(this.value) }
		getNodeValue() { return this.value.nodeValue }
		setNodeValue(new_value?: V | undefined): (string | null) {
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


export const TextNodeSignal_Factory = (ctx: Context) => {
	// TODO: implement ctx.onDelete
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

		// TODO: in the `set` method, think whether or not we should remove the text node if the new value is null.
		// if yes, then you should override the `this.setNodeValue` method, and call the `this.detach` method in there if the null value condition is met.

		static create<N extends Text, V extends NodeValue = NodeValue>(dependency_signal: V | Accessor<V>, config?: DOMSignalConfig<N>): [id: number, dependOnText: Accessor<N>, textNode: Text] {
			const new_signal = new this<N, V>(dependency_signal, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.value,
			]
		}
	}
}


export const AttrSignal_Factory = (ctx: Context) => {
	return class AttrNodeSignal<N extends Attr, V extends AttrValue = AttrValue> extends ctx.getClass(DOMSignal_Factory)<N, V> {
		declare fn: Accessor<V>

		constructor(
			attribute_node: Attr,
			dependency_signal: AttrValue | Accessor<AttrValue>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			attribute_name: Attr["name"],
			dependency_signal: AttrValue | Accessor<AttrValue>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			attribute: N | N["name"],
			dependency_signal: V | Accessor<V>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		) {
			const attr_node = typeof attribute === "string" ? document.createAttribute(attribute) as N : attribute
			super(attr_node, dependency_signal, config)
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		protected getParentElement(): Element | null {
			// and attribute node's `parentElement` is always null, even when attached.
			// we must use `ownerElement` to figure out the node this attribute is attached to.
			return this.value.ownerElement
		}
		protected removeFromParentElement(): boolean { return this.getParentElement()?.removeAttributeNode(this.value) ? true : false }
		protected appendToElement(element: Element): void {
			element.setAttributeNode(this.value)
		}
		setNodeValue(new_value?: V | undefined): (string | null) {
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
		static create<N extends Attr, V extends AttrValue = AttrValue>(attribute: N | N["name"], dependency_signal: V | Accessor<V>, config?: DOMSignalConfig<N>): [id: number, dependOnAttr: Accessor<N>, attrNode: N] {
			const new_signal = new this<N, V>(attribute as any, dependency_signal, config as any)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.value,
			]
		}
	}
}

// TODO: create an example and test this. moreover, maybe add it as an addon to your JSX runtime `h` function.
export const HtmlNodeSignal_Factory = (ctx: Context) => {
	return class HtmlNodeSignal<N extends HTMLElement, V extends HtmlInnerValue = HtmlInnerValue> extends ctx.getClass(DOMSignal_Factory)<N, V> {
		declare fn: Accessor<V>

		constructor(
			element: HTMLElement,
			dependency_signal: HtmlInnerValue | Accessor<HtmlInnerValue>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			element_tag: HTMLElement["tagName"],
			dependency_signal: HtmlInnerValue | Accessor<HtmlInnerValue>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		)
		constructor(
			element: N | N["tagName"],
			dependency_signal: V | Accessor<V>,
			config?: Omit<DOMSignalConfig<N>, "value">,
		) {
			const element_node = typeof element === "string" ? document.createElement(element) as N : element
			super(element_node, dependency_signal, config)
		}

		run(forced?: boolean): SignalUpdateStatus {
			return this.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		setNodeValue(new_value?: V | undefined): (string | null) {
			// TODO: for the time being, I am naively assigning the innerHTML, without considering potential side effects.
			// there might be bad consequences to that. I should look into it later.
			const
				element = this.value,
				new_value_as_node_array = as_DOM_node_array(new_value)
			if (new_value_as_node_array) {
				element.replaceChildren(...new_value_as_node_array)
				return null
			}
			const is_null = new_value === null || new_value === undefined
			return (element.innerHTML = (is_null ? "" : new_value.toString()))
		}

		static create(element: HTMLElement, dependency_signal: HtmlInnerValue | Accessor<HtmlInnerValue>, config?: DOMSignalConfig<HTMLElement> & { value: never }): [id: number, dependOnElement: Accessor<HTMLElement>, elementNode: HTMLElement]
		static create(element_tag: HTMLElement["tagName"], dependency_signal: HtmlInnerValue | Accessor<HtmlInnerValue>, config?: DOMSignalConfig<HTMLElement> & { value: never }): [id: number, dependOnElement: Accessor<HTMLElement>, elementNode: HTMLElement]
		static create<N extends HTMLElement, V extends HtmlInnerValue = HtmlInnerValue>(element: N | N["tagName"], dependency_signal: V | Accessor<V>, config?: DOMSignalConfig<N>): [id: number, dependOnElement: Accessor<N>, elementNode: N] {
			const new_signal = new this<N, V>(element as any, dependency_signal, config as any)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.value,
			]
		}
	}
}

// TODO: implement this after you've implemented hyperscript scopes
// export const EventStateSignal_Factory = (ctx: Context) => {
// 	return class EventStateSignal extends ctx.getClass(SimpleSignal_Factory) {
// 	}
// }
// // EventListener || EventListenerOrEventListenerObject
// const a = new Image()
// a.addEventListener("", (s: Event): void => { }, {})
