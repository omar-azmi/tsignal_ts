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
 * import { createHyperScript } from "./path/to/tsignal_ts/jsx/hyperscript.ts"
 * import { Context } from "./path/to/tsignal_ts/mod.ts"
 * 
 * const ctx = new Context()
 * const [h, hf, namespaceStack] = createHyperScript(ctx)
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

import { Context } from "../context.ts"
import { Stringifyable, array_isArray, bind_array_pop, bind_array_push, bind_stack_seek, isFunction, object_entries } from "../deps.ts"
import { DOMAttrSignal_Factory, DOMTextNodeSignal_Factory } from "../dom_signal.ts"
import { Accessor } from "../typedefs.ts"

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

const specialTagNameSpaces = {
	"svg": "http://www.w3.org/2000/svg"
} as const

type NameSpaceURI = typeof specialTagNameSpaces

// TODO: think of how to make `createHyperScript` extendable via add-on style plugins.
// for example, it would become possible for you to declare that `ctx.addClass(DOMTextNodeSignal_Factory)` should be used for creating reactive text nodes,
// and `ctx.addClass(DOMAttrSignal_Factory)` should be used for creating attribute nodes. etc...

// TODO: make hyperscript handler for `<input />` html types (and buttons, links, etc...) that
// can fire an update cycle (such as setting a state signal, or firing an effect signal).
// essentially, being able to `ctx.runId(the_signal_id)`

/** create hyperscript functions to create elements and fragments during runtime after your JSX or TSX have been transformed. */
export const createHyperScript = (ctx: Context) => {
	const
		createText = ctx.addClass(DOMTextNodeSignal_Factory),
		createAttr = ctx.addClass(DOMAttrSignal_Factory)

	const
		namespace_stack: (keyof NameSpaceURI)[] = [],
		namespace_stack_push = bind_array_push(namespace_stack),
		namespace_stack_pop = bind_array_pop(namespace_stack),
		namespace_stack_seek = bind_stack_seek(namespace_stack)

	const createElement = (component: undefined | string | ComponentGenerator, props?: ElementAttrs | null, ...children: ElementChild[]): Element | Element[] => {
		props ??= {}
		const current_namespace_tag = namespace_stack_seek()
		if (current_namespace_tag) {
			return createElementNS(specialTagNameSpaces[current_namespace_tag], component as string, props, ...children)
		}
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

	const createElementNS = (namespace_uri: NameSpaceURI[keyof NameSpaceURI], component: string, props?: ElementAttrs | null, ...children: ElementChild[]): Element | Element[] => {
		props ??= {}
		const
			component_node = document.createElementNS(namespace_uri, component),
			child_nodes = children.flatMap((child) => child instanceof Node
				? child
				: createText(child)[2]
			)
		// assign the props as reactive attributes of the new element node
		for (const [attr_name, attr_value] of object_entries(props)) {
			// svg doesn't work when their attributes are made with a namespaceURI (i.e. createAttributeNS doesn't work for svgs). strange.
			// const attr = document.createAttributeNS(namespace_uri, attr_name)
			component_node.setAttributeNode(createAttr(attr_name, attr_value)[2])
		}
		component_node.append(...child_nodes)
		return component_node
	}

	const namespaceStack = {
		push: namespace_stack_push,
		pop: namespace_stack_pop,
		seek: namespace_stack_seek,
	}

	const createFragment = createElement.bind(undefined, undefined)

	return [
		createElement as HyperScript_CreateElement,
		createFragment as HyperScript_CreateFragment,
		namespaceStack
	] as const
}
