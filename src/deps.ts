
export {
	bind_array_clear,
	bind_array_push,
	bind_map_clear,
	bind_map_get,
	bind_map_set,
	bind_set_add,
	bind_set_clear,
	bind_set_delete,
	bind_set_has
} from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/binder.ts"
export * as browser from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/browser.ts"
export { prototypeOfClass } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/struct.ts"
export * as typedefs from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/typedefs.ts"
export type { ConstructorOf } from "https://raw.githubusercontent.com/omar-azmi/kitchensink_ts/main/src/typedefs.ts"


export const DEBUG = true

type BindableFunction<T, A extends any[], B extends any[], R> = ((this: T, ...args: [...A, ...B]) => R)

export const bindMethodToSelfByName = /*@__PURE__*/ <
	S extends Record<M, BindableFunction<S, A, any[], any>>,
	M extends PropertyKey,
	A extends (S[M] extends BindableFunction<S, (infer P)[], any[], R> ? P[] : never),
	R extends ReturnType<S[M]>,
>(
	self: S,
	method_name: M,
	...args: A
) => self[method_name].bind<S, A, S[M] extends BindableFunction<S, A, infer B, R> ? B : never, R>(self, ...args)
