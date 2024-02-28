import { StaticImplements, Stringifyable, isFunction, object_entries } from "../src/deps.ts"
import { DOMAttrSignal_Factory, DOMTextNodeSignal_Factory } from "../src/dom_signal.ts"
import { Context } from "../src/mod.ts"
import { Accessor } from "../src/typedefs.ts"


export type ReactiveText = Stringifyable | Accessor<Stringifyable>
/** the `props` of an `HTMLElement` are simply their attributes */
export type ElementAttrs = { [attribute_key: Attr["name"]]: ReactiveText }
export type ComponentGenerator<P = {}> = (props?: P) => Element
export type ElementChild = ReactiveText | Node

interface HyperScriptInterface {
	new(): object
	create(html_tag: string, attrs?: ElementAttrs | null, ...children: ElementChild[]): HTMLElement
	create<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChild[]): Node
}

export const HyperScript_Signal = (ctx: Context) => {
	const
		createText = ctx.addClass(DOMTextNodeSignal_Factory),
		createAttr = ctx.addClass(DOMAttrSignal_Factory)
	return class HyperScript implements StaticImplements<HyperScriptInterface, typeof HyperScript> {
		constructor() { }
		static create(html_tag: string, attrs?: ElementAttrs | null, ...children: ElementChild[]): HTMLElement
		static create<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChild[]): Node
		static create(component: string | ComponentGenerator, props?: ElementAttrs | null, ...children: ElementChild[]): HTMLElement {
			props ??= {}
			const
				is_component_generator = isFunction(component),
				component_node: Element = is_component_generator ? component(props) : document.createElement(component)
			// we only assign the props as attributes iff the created node did not come from a component generator. this is also the behavior exhibited by ReactJS.
			if (!is_component_generator) {
				// assign the props as reactive attributes of the new element node
				for (const [attr_name, attr_value] of object_entries(props)) {
					component_node.setAttributeNode(createAttr(attr_name, attr_value)[2])
				}
			}
			children.forEach((child) => {
				component_node.appendChild(child instanceof Node
					? child
					: createText(child)[2]
				)
			})
			return component_node as HTMLElement
		}
	}
}
