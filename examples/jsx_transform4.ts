/** a minimal implementation of JSX runtime element creation. <br>
 * to use in `esbuild`'s javascript build API, you will need to:
 * 0) for the sake of IDE LSP, you will need to include the following two comment lines at the top of your `.tsx` script:
 * ```tsx
 * /** \@jsx h *\/
 * /** \@jsxFrag hf *\/
 * ```
 * 1) import `createHyperScript` from this module to your JSX script, call it, and name the outputs what you named them in step 0:
 * ```tsx
 * // the `\@jsx h` comment comes here, but I can't show multiline comments in this documentation.
 * // the `\@jsxFrag hf` comment comes here, but I can't show multiline comments in this documentation.
 * 
 * import { createHyperScript } from "./path/to/jsx_transform.ts"
 * import { Context } from "./path/to/tsignal_ts/mod.ts"
 * 
 * const ctx = new Context()
 * const [h, hf] = createHyperScript(ctx)
 * 
 * const my_elem = <div>Hello world</div>
 * const my_fragment_elems = <>
 *     <span>World<span>
 *     <span>Hello<span>
 * </>
 * const my_elem2 = <div>...my_fragment_elems</div>
 * document.body.appendChild(my_elem)
 * document.body.appendChild(my_elem2)
 * ```
 * 2) in the esbuild build options (`BuildOptions`), set `jsxFactory = "h"` and `jsxFragment = "hf"`,
 *   which is the name of the functions that you assigned in step 0 and step 1 (`const [h, hf] = createHyperScript(ctx)`)
 * ```ts
 * import { build, stop } from "https://deno.land/x/esbuild/mod.js"
 * build({
 *     entryPoints: ["./path/to/your/script.tsx"],
 *     jsxFactory: "h",
 *     jsxFragment: "Fragment",
 *     // other build options
 *     minify: true,
 * })
 * stop()
 * ```
 * 
 * @module
*/

import { Stringifyable, array_isArray, isFunction, object_entries } from "../src/deps.ts"
import { DOMAttrSignal_Factory, DOMTextNodeSignal_Factory } from "../src/dom_signal.ts"
import { Context } from "../src/mod.ts"
import { Accessor } from "../src/typedefs.ts"

declare global {
	namespace JSX {
		// TODO: the commented interface below should be used if we were to abide by strict typing. but we currently don't.
		// interface IntrinsicElements extends HTMLElementTagNameMap { }
		interface IntrinsicElements { [tag_name: string]: any }
	}
}

export type ReactiveText = Stringifyable | Accessor<Stringifyable>
/** the `props` of an `HTMLElement` are simply their attributes */
export type ElementAttrs = { [attribute_key: Attr["name"]]: ReactiveText }
export type SingleComponentGenerator<P = {}> = (props?: P) => Element
export type FragmentComponentGenerator<P = {}> = (props?: P) => Element[]
export type ComponentGenerator<P = {}> = SingleComponentGenerator<P> | FragmentComponentGenerator<P>
export type ElementChild = ReactiveText | Node
export type ElementChildren = Array<ElementChild | ElementChild[]>
export type HyperScript_CreateFragment = (props: object, ...elements: Node[]) => (typeof elements)
export interface HyperScript_CreateElement {
	(html_tag: string, attrs?: ElementAttrs | null, ...children: ElementChildren): HTMLElement
	<P = {}>(component: SingleComponentGenerator<P>, props?: P | null, ...children: ElementChildren): Element
	<P = {}>(fragment_component: FragmentComponentGenerator<P>, props?: P | null, ...siblings: ElementChildren): Element[]
	<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChildren): ReturnType<typeof component>
}


// TODO: think of how to make `createHyperScript` extendable via add-on style plugins.
// for example, it would become possible for you to declare that `ctx.addClass(DOMTextNodeSignal_Factory)` should be used for creating reactive text nodes,
// and `ctx.addClass(DOMAttrSignal_Factory)` should be used for creating attribute nodes. etc...

// TODO: make hyperscript handler for `<input />` html types (and buttons, links, etc...) that
// can fire an update cycle (such as setting a state signal, or firing an effect signal).
// essentially, being able to `ctx.runId(the_signal_id)`

/** create hyperscript functions to create elements and fragments during runtime after your JSX or TSX have been transformed. */
export const createHyperScript = (ctx: Context): [createElement: HyperScript_CreateElement, createFragment: HyperScript_CreateFragment] => {
	const
		createText = ctx.addClass(DOMTextNodeSignal_Factory),
		createAttr = ctx.addClass(DOMAttrSignal_Factory)

	const createElement = (component: undefined | string | ComponentGenerator, props?: ElementAttrs | null, ...children: ElementChild[]): Element | Element[] => {
		props ??= {}
		const
			child_nodes = children.flatMap((child) => child instanceof Node
				? child
				: createText(child)[2]
			),
			is_component_generator = isFunction(component),
			component_node: Element | Element[] = is_component_generator
				? component(props)
				: component === undefined
					? [] as Element[]
					: document.createElement(component)
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

	const createFragment = createElement.bind(undefined, undefined)

	return [createElement as HyperScript_CreateElement, createFragment as HyperScript_CreateFragment]
}
