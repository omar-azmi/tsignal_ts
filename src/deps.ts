export {
	bindMethodToSelfByName,
	bind_array_clear,
	bind_array_pop,
	bind_array_push,
	bind_map_clear,
	bind_map_delete,
	bind_map_get,
	bind_map_set,
	bind_set_add,
	bind_set_clear,
	bind_set_delete,
	bind_set_has
} from "https://deno.land/x/kitchensink_ts@v0.7.2/binder.ts"
export { array_isArray, noop, object_assign, object_keys, object_values, promise_forever, promise_reject, promise_resolve } from "https://deno.land/x/kitchensink_ts@v0.7.2/builtin_aliases_deps.ts"
export { THROTTLE_REJECT, throttle, throttleAndTrail } from "https://deno.land/x/kitchensink_ts@v0.7.2/lambda.ts"
export { prototypeOfClass } from "https://deno.land/x/kitchensink_ts@v0.7.2/struct.ts"
export type { CallableFunctionsOf, ConstructorOf, MethodsOf, StaticImplements } from "https://deno.land/x/kitchensink_ts@v0.7.2/typedefs.ts"

export const enum DEBUG {
	LOG = 0,
}

export const object_entries = Object.entries
