/** a minimal implementation of `JSX.IntrinsicElements` to get syntax highlighting in your `.jsx` and `.tsx` files. <br>
 * to use this, and banish all the red error lines under your jsx blocks, simply import this file.
 * 
 * @example
 * ```tsx
 * /// <reference path="./path/to/tsignal/jsx-runtime/global.d.ts" />
 * // OR if using "https://jsr.io"
 * /// <reference path="jsr:@oazmi/tsignal/jsx-runtime" />
 * 
 * const my_div = <div>
 * 	<span>Hello</span>
 * 	<span>World!!</span>
 * </div>
 * ```
 * 
 * @module
*/

import { Stringifyable } from "../deps.ts"
import { Accessor } from "../typedefs.ts"

type AttributeKey = string
interface Attributes {
	[key: AttributeKey]: Stringifyable | Accessor<Stringifyable>
}

type IntrinsicHTMLElements = { [tagName in keyof HTMLElementTagNameMap]: Attributes }
type IntrinsicSVGElements = { [tagName in keyof SVGElementTagNameMap]: Attributes }

// ISSUE: "https://jsr.io" does not permit global declarations, thus the end user must declare it themselves.
// declare global {
// declare namespace JSX {
type IntrinsicElements = IntrinsicHTMLElements & IntrinsicSVGElements
// }
// }

export as namespace JSX
