import { DEBUG, THROTTLE_REJECT, throttle } from "./deps.ts"
import { EqualityCheck, EqualityFn, FROM_ID, HASHED_IDS, ID, Signal, TO_ID, UNTRACKED_ID } from "./typedefs.ts"

export const default_equality = (<T>(v1: T, v2: T) => (v1 === v2)) satisfies EqualityFn<any>
export const falsey_equality = (<T>(v1: T, v2: T) => false) satisfies EqualityFn<any>

/** transforms a regular equality check function ({@link BaseSignalConfig.equals}) into a one that throttles when called too frequently. <br>
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
export const throttlingEquals = <T>(delta_time_ms: number, base_equals?: EqualityCheck<T>): EqualityCheck<T> => {
	const
		base_equals_fn = base_equals === false ? falsey_equality : (base_equals ?? default_equality),
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

export const assign_id_name_to_object = <OBJ extends any>(obj: OBJ, id: ID, name?: string): OBJ => {
	// @ts-ignore: we are assigning new properties to `obj`
	obj.id = obj.rid = id
	// @ts-ignore: we are assigning new properties to `obj`
	if (name) { obj.name = name }
	return obj as OBJ
}

export const assign_equals_to_object = <OBJ extends any, T>(obj: OBJ, equals: EqualityFn<T>): OBJ & { equals: typeof equals } => {
	// @ts-ignore: we are assigning new properties to `obj`
	obj.equals = equals
	return obj as OBJ & { equals: typeof equals }
}

export const assign_fn_to_object = <OBJ extends any, FN extends CallableFunction>(obj: OBJ, fn: FN): OBJ & { fn: typeof fn } => {
	// @ts-ignore: we are assigning new properties to `obj`
	obj.fn = fn
	return obj as OBJ & { fn: typeof fn }
}

export const noop = /* @__PURE__ */ () => { }

export const log_get_request = /* @__PURE__ */ DEBUG.LOG ? (all_signals_get: (id: ID) => Signal<any> | undefined, observed_id: FROM_ID, observer_id?: TO_ID | UNTRACKED_ID) => {
	const
		observed_signal = all_signals_get(observed_id)!,
		observer_signal = observer_id ? all_signals_get(observer_id)! : { name: "untracked" }
	console.log(
		"GET:\t", observed_signal.name,
		"\tby OBSERVER:\t", observer_signal.name,
		"\twith VALUE\t", observed_signal.value,
	)
} : noop
