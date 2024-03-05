/** a minimal implementation of JSX runtime element creation. <br>
 * to use in `esbuild`'s javascript build API, you will need to do one of the following options (or do both):
 * 
 * 1) option 1 (preferred): <br>
 *   for JSX to work with your IDE's LSP, and for esbuild to automatically discover the hyperscript functions,
 *   you will need to include the following two comment lines at the top of your `.tsx` script:
 * ```tsx
 * /** \@jsx h *\/
 * /** \@jsxFrag hf *\/
 * ```
 * 
 * 2) option 2 (no LSP support): <br>
 *   in the esbuild build options (`BuildOptions`), set `jsxFactory = "h"` and `jsxFragment = "hf"`.
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
 * and now in your `.jsx` script, you should:
 * - import `createHyperScript` from this module
 * - create a reactive signal `Context`
 * - call `createHyperScript` with the signal context `ctx` as the argument
 * - the returned tuple will contain 3 elements:
 *     - the first element should be named `h` (which is the name you declare as `\@jsx h` in **option 1** or `jsxFactory = "h"` in **option 2**)
 *     - the second element should be named `hf` (which is the name you declare as `\@jsxFrag hf` in **option 1** or `jsxFragment = "hf"` in **option 2**)
 *     - the third can be named anything
 * 
 * @example
 * ```tsx
 * // the `\@jsx h` comment comes here, but I can't show multiline comments in this documentation.
 * // the `\@jsxFrag hf` comment comes here, but I can't show multiline comments in this documentation.
 * 
 * import { createHyperScript } from "./path/to/tsignal/jsx/hyperscript.ts"
 * import { Context } from "./path/to/tsignal/mod.ts"
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
 * 
 * // when creating svgs or xml, you will have to change the DOM namespace, so that the correct kinds of `Node`s are created.
 * namespaceStack.push("svg")
 * const my_svg = <svg viewBox="0 0 200 200">
 *     <g transform="translate(100, 50)">
 *         <text text-anchor="middle">SVG says Hi!</text>
 *         <text y="25" text-anchor="middle">SVG stands for "SUGOI! Vector Graphics"</text>
 *     </g>
 * </svg>
 * namespaceStack.pop()
 * ```
 * 
 * @module
*/

import { Context } from "../context.ts"
import { Stringifyable, array_isArray, bind_array_pop, bind_array_push, bind_stack_seek, isFunction, object_entries } from "../deps.ts"
import { AttrSignal_Factory, TextNodeSignal_Factory } from "../dom_signal.ts"
import { Accessor } from "../typedefs.ts"

// TODO: convert this to a standalone package named "hyperscope", in which:
// - I will implement a JSX runtime that has different scopes of behaviors, defined by the end user.
// - it will work very similar to the way our current `specialTagNameSpaces` works, but instead of being just for DOM_NameSpaces,
//   it will allow for custom runtime scopes, and different evaluation strategies based on the current scope,
//   all while still being restricted to JSX's `h()` function signature.
// - Once that package is implemented, I'll import it here and replace this portion of the code with plugins/scopes for `tsignal_ts`.


type AttributeKey = string
interface Attributes {
	[key: AttributeKey]: Stringifyable | Accessor<Stringifyable>
}

type IntrinsicHTMLElements = { [tagName in keyof HTMLElementTagNameMap]: Attributes }
type IntrinsicSVGElements = { [tagName in keyof SVGElementTagNameMap]: Attributes }

declare global {
	export namespace JSX {
		/** a minimal implementation of `JSX.IntrinsicElements` to get syntax highlighting in your `.jsx` and `.tsx` files. <br>
		 * to use this, and banish all the red error lines under your jsx blocks, simply import this file.
		 * 
		 * @example
		 * ```tsx
		 * import { } from "./path/to/tsignal/jsx/hyperscript.ts"
		 * 
		 * const my_div = <div>
		 * 	<span>Hello</span>
		 * 	<span>World!!</span>
		 * </div>
		 * ```
		*/
		export type IntrinsicElements = IntrinsicHTMLElements & IntrinsicSVGElements
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
// for example, it would become possible for you to declare that `ctx.addClass(TextNodeSignal_Factory)` should be used for creating reactive text nodes,
// and `ctx.addClass(AttrSignal_Factory)` should be used for creating attribute nodes. etc...

// TODO: make hyperscript handler for `<input />` html types (and buttons, links, etc...) that
// can fire an update cycle (such as setting a state signal, or firing an effect signal).
// essentially, being able to `ctx.runId(the_signal_id)`

/** create hyperscript functions to create elements and fragments during runtime after your JSX or TSX have been transformed. */
export const createHyperScript = (ctx: Context) => {
	const
		// TODO: add `HtmlNodeSignal_Factory` too, and test it. or maybe implement an addon style feature to add `HtmlNodeSignal_Factory`, and other custom signal classes.
		createText = ctx.addClass(TextNodeSignal_Factory),
		createAttr = ctx.addClass(AttrSignal_Factory)

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
					// we always attach the attribute node to the designated `component_node` before making it reactive,
					// because the reactivity may require the existence of a parent node (`attr.ownerElement`)
					const attr = document.createAttribute(attr_name)
					component_node.setAttributeNode(attr)
					createAttr(attr, attr_value)
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
