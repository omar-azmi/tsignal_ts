/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/

export { Context } from "./context.ts"
export type { Context_Batch, Context_Dynamic } from "./context.ts"
export { default_equality, falsey_equality, throttlingEquals } from "./funcdefs.ts"
export type * from "./record_signal.ts"
export { RecordMemoSignal_Factory, RecordSignal_Factory, RecordStateSignal_Factory } from "./record_signal.ts"
export type * from "./signal.ts"
export { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, SimpleSignal_Factory, StateSignal_Factory } from "./signal.ts"
export type * from "./typedefs.ts"
