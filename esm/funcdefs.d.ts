/** utility functions
 * @module
*/
import { EqualityCheck, FROM_ID, HASHED_IDS, ID, Signal, TO_ID, UNTRACKED_ID } from "./typedefs.js";
export declare const default_equality: <T>(v1: T, v2: T) => boolean;
export declare const falsey_equality: <T>(v1: T, v2: T) => false;
/** transforms a regular equality check function ({@link SimpleSignalConfig.equals}) into a one that throttles when called too frequently. <br>
 * this means that a singal composed of this as its `equals` function will limit propagating itself further, until at least `delta_time_ms`
 * amount of time has passed since the last time it was potentially propagated.
 *
 * @param delta_time_ms the time interval in milliseconds for throttling
 * @param base_equals use an optional customized equality checking function. otherwise the default `prev_value === new_value` comparison will be used
 * @returns a throttled version of the equality checking function which would prematurely return a `true` if called too frequently (ie within `delta_time_ms` interval since the last actual equality cheking)
 *
 * @example
 * ```ts
 * const { createState, createMemo, createEffect } = createContext()
 * const [A, setA] = createState(0)
 * const B = createMemo((id) => {
 * 	return A(id) ** 0.5
 * }, { equals: throttlingEquals(500) }) // at least 500ms must pass before `B` propagates itself onto `C`
 * const [C, fireC] = createEffect((id) => {
 * 	// SOME EXPENSIVE COMPUTATION OR EFFECT //
 * 	console.log("C says Hi!, and B is of the value:", B(id))
 * }, { defer: false })
 * // it is important that you note that `B` will be recomputed each time `setA(...)` is fired.
 * // it is only that `B` won't propagate to `C` (even if it changes in value) if at least 500ms have not passed
 * setInterval(() => setA(A() + 1), 10)
 * ```
*/
export declare const throttlingEquals: <T>(delta_time_ms: number, base_equals?: EqualityCheck<T>) => EqualityCheck<T>;
export declare const hash_ids: (ids: ID[]) => HASHED_IDS;
export declare const log_get_request: (all_signals_get: (id: ID) => Signal<any> | undefined, observed_id: FROM_ID, observer_id?: TO_ID | UNTRACKED_ID) => void;