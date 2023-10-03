export {
	bindMethodToSelfByName,
	bind_array_clear,
	bind_array_push,
	bind_array_pop,
	bind_map_clear,
	bind_map_get,
	bind_map_set,
	bind_set_add,
	bind_set_clear,
	bind_set_delete,
	bind_set_has
} from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/binder.ts"
export { THROTTLE_REJECT, throttle } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/browser.ts"
export { object_assign, array_isArray } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/builtin_aliases_deps.ts"
export { prototypeOfClass } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/struct.ts"
export * as typedefs from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/typedefs.ts"
export type { CallableFunctionsOf, ConstructorOf, MethodsOf } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/typedefs.ts"


export const enum DEBUG {
	LOG = 0,
}

export const {
	keys: object_keys,
	values: object_values,
} = Object

export type StaticImplements<CONSTRUCTOR extends new (...args: any[]) => any, CLASS extends CONSTRUCTOR> = InstanceType<CONSTRUCTOR>

export type SubPropertyMapper<T, PROP extends keyof T[keyof T]> = { [K in keyof T]: T[K][PROP] }
