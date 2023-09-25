import { DEBUG } from "./deps.ts"
import { EqualityFn, FROM_ID, HASHED_IDS, ID, Signal, SignalSelfID, TO_ID, UNTRACKED_ID } from "./typedefs.ts"

export const default_equality = (<T>(v1: T, v2: T) => (v1 === v2)) satisfies EqualityFn<any>
export const falsey_equality = (<T>(v1: T, v2: T) => false) satisfies EqualityFn<any>

export const hash_ids = (ids: ID[]): HASHED_IDS => {
	const sqrt_len = ids.length ** 0.5
	return ids.reduce((sum, id) => sum + id * (id + sqrt_len), 0)
}

export const assign_id_name_to_object = <OBJ extends any>(obj: OBJ, id: ID, name?: string): OBJ & SignalSelfID => {
	// @ts-ignore: we are assigning new properties to `obj`
	obj.id = obj.rid = id
	// @ts-ignore: we are assigning new properties to `obj`
	if (name) { obj.name = name }
	return obj as OBJ & SignalSelfID
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

export const log_get_request = DEBUG ? (all_signals_get: (id: ID) => Signal<any> | undefined, observed_id: FROM_ID, observer_id?: TO_ID | UNTRACKED_ID) => {
	const
		observed_signal = all_signals_get(observed_id)!,
		observer_signal = observer_id ? all_signals_get(observer_id)! : { name: "untracked" }
	console.log(
		"GET:\t", observed_signal.name,
		"\tby OBSERVER:\t", observer_signal.name,
		"\twith VALUE\t", observed_signal.value,
	)
} : () => { }
