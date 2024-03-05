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
	bind_set_has,
	bind_stack_seek
} from "https://deno.land/x/kitchensink_ts@v0.7.5/binder.ts"
export { array_isArray, noop, object_assign, object_entries, object_keys, object_values, promise_forever, promise_reject, promise_resolve, symbol_iterator } from "https://deno.land/x/kitchensink_ts@v0.7.5/builtin_aliases_deps.ts"
export { THROTTLE_REJECT, throttle, throttleAndTrail } from "https://deno.land/x/kitchensink_ts@v0.7.5/lambda.ts"
export { isFunction, isPrimitive, prototypeOfClass } from "https://deno.land/x/kitchensink_ts@v0.7.5/struct.ts"
export type { CallableFunctionsOf, ConstructorOf, MethodsOf, StaticImplements } from "https://deno.land/x/kitchensink_ts@v0.7.5/typedefs.ts"

export const enum DEBUG {
	LOG = 0,
}

export type Stringifyable = { toString(): string }

// TODO: add multiple logging options: such as one for `Signal.get` logging, and one for `Context.updateFireCycle`, etc...
// TODO: add a link to license in `readme.md`
