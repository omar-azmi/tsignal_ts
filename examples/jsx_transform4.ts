import { StaticImplements, Stringifyable, array_isArray, isFunction, object_entries } from "../src/deps.ts"
import { DOMAttrSignal_Factory, DOMTextNodeSignal_Factory } from "../src/dom_signal.ts"
import { Context } from "../src/mod.ts"
import { Accessor } from "../src/typedefs.ts"


export type ReactiveText = Stringifyable | Accessor<Stringifyable>
/** the `props` of an `HTMLElement` are simply their attributes */
export type ElementAttrs = { [attribute_key: Attr["name"]]: ReactiveText }
export type SingleComponentGenerator<P = {}> = (props?: P) => Element
export type FragmentComponentGenerator<P = {}> = (props?: P) => Element[]
export type ComponentGenerator<P = {}> = SingleComponentGenerator<P> | FragmentComponentGenerator<P>
export type ElementChild = ReactiveText | Node
export type ElementChildren = Array<ElementChild | ElementChild[]>

interface HyperScriptInterface {
	new(): object
	create(html_tag: string, attrs?: ElementAttrs | null, ...children: ElementChildren): HTMLElement
	create<P = {}>(component: SingleComponentGenerator<P>, props?: P | null, ...children: ElementChildren): Element
	create<P = {}>(fragment_component: FragmentComponentGenerator<P>, props?: P | null, ...siblings: ElementChildren): Element[]
	create<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChildren): ReturnType<typeof component>
}

export const HyperScript_Signal = (ctx: Context) => {
	const
		createText = ctx.addClass(DOMTextNodeSignal_Factory),
		createAttr = ctx.addClass(DOMAttrSignal_Factory)
	return class HyperScript implements StaticImplements<HyperScriptInterface, typeof HyperScript> {
		constructor() { }
		static create(html_tag: string, attrs?: ElementAttrs | null, ...children: ElementChildren): HTMLElement
		static create<P = {}>(component: SingleComponentGenerator<P>, props?: P | null, ...children: ElementChildren): Element
		static create<P = {}>(fragment_component: FragmentComponentGenerator<P>, props?: P | null, ...siblings: ElementChildren): Element[]
		static create(component: string | ComponentGenerator, props?: ElementAttrs | null, ...children: ElementChild[]): Element | Element[] {
			props ??= {}
			const
				child_nodes = children.flatMap((child) => child instanceof Node
					? child
					: createText(child)[2]
				),
				is_component_generator = isFunction(component),
				component_node: Element | Element[] = is_component_generator ? component(props) : document.createElement(component)
			// now, depending on whether or not the `component_node` is a fragment (i.e. an array of nodes),
			// we append the children as child elements if the `component_node` is a single `Element`,
			// or we insert the children as siblings if the `component_node` is an array of elements (`Element[]`)
			if (!array_isArray(component_node)) {
				// we only assign the props as attributes iff the created node did not come from a component generator. this is also the behavior exhibited by ReactJS.
				if (!is_component_generator) {
					// assign the props as reactive attributes of the new element node
					for (const [attr_name, attr_value] of object_entries(props)) {
						component_node.setAttributeNode(createAttr(attr_name, attr_value)[2])
					}
				}
				component_node.append(...child_nodes)
			} else {
				component_node.push(...child_nodes as Element[])
			}
			return component_node as HTMLElement
		}
	}
}
