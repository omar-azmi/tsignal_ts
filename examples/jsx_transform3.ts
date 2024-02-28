import { isFunction } from "../src/deps.ts"
import { Accessor } from "../src/typedefs.ts"

const enum NodeKind {
	/** `Node.ELEMENT_NODE`   */ ELEMENT_NODE = 1,
	/** `Node.ATTRIBUTE_NODE` */ ATTRIBUTE_NODE = 2,
	/** `Node.TEXT_NODE`      */ TEXT_NODE = 3,
}

/** virtual `TextNode` initialization description. */
interface VirtualText {
	kind: NodeKind.TEXT_NODE
	value: Text["nodeValue"] | Accessor<string>
	/** the processed values of each child element will get concatenated into the final `text_node.nodeValue` of this text node. */
	// children: Array<string | Accessor<string>>
}

/** virtual `Attr` initialization description. */
interface VirtualAttribute {
	kind: NodeKind.ATTRIBUTE_NODE
	name: Attr["name"] // | Accessor<string> // TODO: test whether or not changing attribute name dynamically is possible (without destroying the original attribute DOM object)
	value?: Attr["value"] | Accessor<string>
}

/** virtual `HTMLElement` initialization description. */
interface VirtualElement {
	kind: NodeKind.ELEMENT_NODE
	tag: keyof HTMLElementTagNameMap
	// props?: null | { [attribute_name: string]: any }
	attrs?: Array<VirtualAttribute>
	children?: Array<VirtualText["value"] | Element>
}

// TODO: make it customizable via plugin like add-ons. use a `Map<NodeKind, createComponent_NodeKind_Factory>` for this task
const createComponent = (vnode: VirtualElement | VirtualAttribute | VirtualText) => {
	switch (vnode.kind) {
		case NodeKind.ELEMENT_NODE: { return createComponent_Element(vnode) }
		default:
			break
	}
}


/** the `props` of an `HTMLElement` are simply their attributes */
export type ElementAttrs = { [attribute_key: string]: any }

/** a reactive element mutation function should implement this function signature, and should return the original element back. */
// export type ReactiveElement = <E extends Node>(element: E, props?: ElementProps) => E

export type ComponentGenerator<P = {}> = (props?: P, ...children: Node[]) => Node | string

export type ElementChild = string | Node | ComponentGenerator

/** a child of an `HTMLElement` can either be a string of text that should be injected, or it could be existing `HTMLElement`s. */
// export type ElementChildren = ElementChild[]

interface HyperScript {
	(html_tag: string, props?: ElementAttrs | null, ...children: ElementChild[]): HTMLElement
	<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChild[]): Node
}

/** the `h` function transforms `JSX` to an `HTMLElement` in the DOM during runtime. */
export const h: HyperScript = (component: string | ComponentGenerator, props?: ElementAttrs | null, ...children: ElementChild[]): HTMLElement => {
	props ??= {}
	const child_nodes = children
		.map((child) => isFunction(child)
			? child()
			: child
		)
		.map((child) => isPrimitive(child)
			? document.createTextNode(child)
			: child
		)
	const element = typeof component === "function"
		? component(props, ...child_nodes) as HTMLElement
		: document.createElement(component)
	// assign each prop as an attribute to the newly created element
	for (let [attr, attr_value] of object_entries(props)) {
		element.setAttribute(attr, attr_value)
	}
	// append the children elements
	child_nodes.forEach((node) => element.appendChild(node))
	return element
}

/** a fragment is declared as `<> ... </>` in JSX, which provides a way to inline DOM elements. */
export const Fragment = (...children: ElementChild[]): Array<ElementChild> => { return children }



const createComponent_Element = (vnode: VirtualElement): HTMLElement => {
	const
		{ attrs = [], children = [], tag } = vnode,
		elem = document.createElement(tag)
	for (const attr_vnode of attrs) { /** call `createComponent_Attr`, then assign the real nodes to this element */ }
	for (const child_node of children) {
		elem.appendChild(child_node instanceof Element ?
			child_node :
			createComponent_Text({ kind: NodeKind.TEXT_NODE, value: child_node })
		)
	}
	return elem
}

const createComponent_Text = (vnode: VirtualText): Text => {
	const
		value = vnode.value ?? "",
		value_is_signal = isFunction(value),
		text_node = document.createTextNode(value_is_signal ? "" : value)
	if (isFunction(value)) {
		// createTextNodeSignal(text_node, value)
	}
}
