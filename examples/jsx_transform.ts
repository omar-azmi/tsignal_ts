/** a minimal implementation of JSX runtime element creation. <br>
 * to use in `esbuild`'s javascript build API, you will need to:
 * 1) import `h` and `Fragment` from this module to your JSX script:
 * ```tsx
 * import { h, Fragment } from "./path/to/jsx_transform.ts"
 * const my_elem = <div>Hello world</div>
 * const my_fragment_elems = <>
 *     <span>World<span>
 *     <span>Hello<span>
 * </>
 * const my_elem2 = <div>...my_fragment_elems</div>
 * document.body.appendChild(my_elem)
 * document.body.appendChild(my_elem2)
 * ```
 * 2) in the esbuild build options (`BuildOptions`), set `jsxFactory = "h"` and `jsxFragment = "Fragment"`:
 * ```ts
 * import { build, stop } from "https://deno.land/x/esbuild/mod.js"
 * build({
 *     entryPoints: ["./path/to/your/script.tsx"],
 *     jsxFactory: "h",
 *     jsxFragment: "Fragment",
 *     // other build options
 *     minify: true,
 * })
 * ```
 * 
 * @module
*/

import { object_entries } from "https://deno.land/x/kitchensink_ts@v0.7.3/builtin_aliases_deps.ts"
import { isPrimitive } from "https://deno.land/x/kitchensink_ts@v0.7.3/struct.ts"
const isFunction = (obj: any): obj is Function => (typeof obj === "function")

/** the `props` of an `HTMLElement` are simply their attributes */
export type ElementProps = { [attribute_key: string]: any }

/** a reactive element mutation function should implement this function signature, and should return the original element back. */
// export type ReactiveElement = <E extends Node>(element: E, props?: ElementProps) => E

export type ComponentGenerator<P = {}> = (props?: P, ...children: Node[]) => Node | string

export type ElementChild = string | Node | ComponentGenerator

/** a child of an `HTMLElement` can either be a string of text that should be injected, or it could be existing `HTMLElement`s. */
// export type ElementChildren = ElementChild[]

interface HyperScript {
	(html_tag: string, props?: ElementProps | null, ...children: ElementChild[]): HTMLElement
	<P = {}>(component: ComponentGenerator<P>, props?: P | null, ...children: ElementChild[]): Node
}

/** the `h` function transforms `JSX` to an `HTMLElement` in the DOM during runtime. */
export const h: HyperScript = (component: string | ComponentGenerator, props?: ElementProps | null, ...children: ElementChild[]): HTMLElement => {
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
