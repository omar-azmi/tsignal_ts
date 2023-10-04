export {
	bindMethodToSelfByName,
	bind_array_clear,
	bind_array_pop,
	bind_array_push,
	bind_map_clear,
	bind_map_get,
	bind_map_set,
	bind_set_add,
	bind_set_clear,
	bind_set_delete,
	bind_set_has
} from "https://deno.land/x/kitchensink_ts@v0.7.0/binder.ts"
export { THROTTLE_REJECT, throttle } from "https://deno.land/x/kitchensink_ts@v0.7.0/browser.ts"
export { array_isArray, noop, object_assign, object_keys, object_values } from "https://deno.land/x/kitchensink_ts@v0.7.0/builtin_aliases_deps.ts"
export { prototypeOfClass } from "https://deno.land/x/kitchensink_ts@v0.7.0/struct.ts"
export * as typedefs from "https://deno.land/x/kitchensink_ts@v0.7.0/typedefs.ts"
export type { CallableFunctionsOf, ConstructorOf, MethodsOf, StaticImplements } from "https://deno.land/x/kitchensink_ts@v0.7.0/typedefs.ts"


export const enum DEBUG {
	LOG = 0,
}
