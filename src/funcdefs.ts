/** utility functions
 * @module
*/

import { DEBUG, THROTTLE_REJECT, bind_set_delete, bind_set_has, noop, throttle } from "./deps.js"
import { EqualityCheck, EqualityFn, FROM_ID, HASHED_IDS, ID, Signal, TO_ID, UNTRACKED_ID } from "./typedefs.js"

export const default_equality = (<T>(v1: T, v2: T) => (v1 === v2)) satisfies EqualityFn<any>
export const falsey_equality = (<T>(v1: T, v2: T) => false) satisfies EqualityFn<any>
export const parseEquality = <T>(equals: EqualityCheck<T>) => (equals === false ? falsey_equality : (equals ?? default_equality)) satisfies EqualityFn<any>

/** transforms a regular equality check function ({@link SimpleSignalConfig.equals}) into a one that throttles when called too frequently. <br>
 * this means that a signal composed of this as its `equals` function will limit propagating itself further, until at least `delta_time_ms`
 * amount of time has passed since the last time it was potentially propagated.
 * 
 * @param delta_time_ms the time interval in milliseconds for throttling
 * @param base_equals use an optional customized equality checking function. otherwise the default `prev_value === new_value` comparison will be used
 * @returns a throttled version of the equality checking function which would prematurely return a `true` if called too frequently (ie within `delta_time_ms` interval since the last actual equality checking)
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
export const throttlingEquals = <T>(delta_time_ms: number, base_equals?: EqualityCheck<T>): EqualityCheck<T> => {
	const
		base_equals_fn = parseEquality(base_equals),
		throttled_equals = throttle(delta_time_ms, base_equals_fn)
	return (prev_value: T | undefined, new_value: T) => {
		const is_equal = throttled_equals(prev_value, new_value)
		return is_equal === THROTTLE_REJECT ? true : is_equal
	}
}

export const hash_ids = (ids: ID[]): HASHED_IDS => {
	const sqrt_len = ids.length ** 0.5
	return ids.reduce((sum, id) => sum + id * (id + sqrt_len), 0)
}

export const intersection_of_sets = <T>(set1: Set<T>, set2: Set<T>): Array<T> => {
	return [...set1].filter(bind_set_has(set2))
}

export const symmetric_difference_of_sets = <T>(set1: Set<T>, set2: Set<T>): [uniques1: Set<T>, uniques2: Set<T>] => {
	const
		union_arr = intersection_of_sets(set1, set2),
		uniques1 = new Set(set1),
		uniques2 = new Set(set2)
	union_arr.forEach(bind_set_delete(uniques1))
	union_arr.forEach(bind_set_delete(uniques2))
	return [uniques1, uniques2]
}

export const log_get_request = /* @__PURE__ */ DEBUG.LOG ? (all_signals_get: (id: ID) => Signal<any> | undefined, observed_id: FROM_ID, observer_id?: TO_ID | UNTRACKED_ID) => {
	const
		observed_signal = all_signals_get(observed_id)!,
		observer_signal = observer_id ? all_signals_get(observer_id)! : { name: "untracked" }
	console.log(
		"GET:\t", observed_signal.name,
		"\tby OBSERVER:\t", observer_signal.name,
		// @ts-ignore:
		"\twith VALUE\t", observed_signal.value,
	)
} : noop
