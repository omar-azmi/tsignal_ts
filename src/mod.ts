/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/

export { Context } from "./context.js"
export type { Context_Batch, Context_Dynamic } from "./context.js"
export { default_equality, falsey_equality, throttlingEquals } from "./funcdefs.js"
export type * from "./mapped_signal.js"
export { RecordMemoSignal_Factory, RecordSignal_Factory, RecordStateSignal_Factory } from "./mapped_signal.js"
export type * from "./signal.js"
export { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, SimpleSignal_Factory, StateSignal_Factory } from "./signal.js"
export type * from "./typedefs.js"
