/** utility functions
 * @module
*/
import { DEBUG, THROTTLE_REJECT, noop, throttle } from "./deps.js";
export const default_equality = ((v1, v2) => (v1 === v2));
export const falsey_equality = ((v1, v2) => false);
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
export const throttlingEquals = (delta_time_ms, base_equals) => {
    const base_equals_fn = base_equals === false ? falsey_equality : (base_equals ?? default_equality), throttled_equals = throttle(delta_time_ms, base_equals_fn);
    return (prev_value, new_value) => {
        const is_equal = throttled_equals(prev_value, new_value);
        return is_equal === THROTTLE_REJECT ? true : is_equal;
    };
};
export const hash_ids = (ids) => {
    const sqrt_len = ids.length ** 0.5;
    return ids.reduce((sum, id) => sum + id * (id + sqrt_len), 0);
};
export const log_get_request = /* @__PURE__ */ DEBUG.LOG ? (all_signals_get, observed_id, observer_id) => {
    const observed_signal = all_signals_get(observed_id), observer_signal = observer_id ? all_signals_get(observer_id) : { name: "untracked" };
    console.log("GET:\t", observed_signal.name, "\tby OBSERVER:\t", observer_signal.name, 
    // @ts-ignore:
    "\twith VALUE\t", observed_signal.value);
} : noop;
