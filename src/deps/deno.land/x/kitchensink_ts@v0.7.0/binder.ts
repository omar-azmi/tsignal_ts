/** utility functions for creating other general purpose functions that can bind their passed function's functionality to some specific object. <br>
 * those are certainly a lot of words thrown in the air with no clarity as to what am I even saying. <br>
 * just as they say, a code block example is worth a thousand assembly instructions. here's the gist of it:
 * ```ts
 * import { bindMethodFactory, bindMethodFactoryByName } from "./kitchensink_ts/binder.ts"
 * 
 * const bind_pushing_to = bindMethodFactory(Array.prototype.push) // equivalent to `bindMethodFactoryByName(Array.prototype, "push")`
 * const bind_seek_to = bindMethodFactory(Array.prototype.at, -1) // equivalent to `bindMethodFactoryByName(Array.prototype, "at", -1)`
 * const bind_splicing_to = bindMethodFactoryByName(Array.prototype, "splice") // equivalent to `bindMethodFactory(Array.prototype.splice)`
 * const bind_clear_to = bindMethodFactoryByName(Array.prototype, "splice", 0) // equivalent to `bindMethodFactory(Array.prototype.splice, 0)`
 * 
 * const my_array = [1, 2, 3, 4, 5, 6]
 * const push_my_array = bind_pushing_to(my_array)
 * const seek_my_array = bind_seek_to(my_array)
 * const splice_my_array = bind_splicing_to(my_array)
 * const clear_my_array = bind_clear_to(my_array)
 * const log_my_array = () => { console.log(my_array) }
 * 
 * push_my_array(7, 8, 9); log_my_array() // [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * console.log(seek_my_array(9)) // 9
 * splice_my_array(4, 3); log_my_array() // [1, 2, 3, 4, 8, 9]
 * clear_my_array(); log_my_array() // []
 * ```
 * you may have some amateur level questions about *why?* would anyone want to do that. here is why: <br>
 * - calling a method via property access is slower. so when you call an array `arr`'s push or pop methods a million times, having a bound function for that specific purpose will be quicker by about x1.3 times:
 * ```ts
 * let i = 1000000, j = 1000000
 * const arr = Array(777).fill(0).map(Math.random)
 * // slower way:
 * while(i--) { arr.push(Math.random); arr.pop() }
 * // faster way:
 * const push_arr = Array.prototype.push.bind(arr)
 * const pop_arr = Array.prototype.pop.bind(arr)
 * while(j--) { push_arr(Math.random); pop_arr() }
 * ```
 * - next, you may be wondering why not destructure the method or assign it to a variable?
 *   this cannot be generally done for prototype-bound methods, because it needs the context of *who* is the caller (and therefor the *this* of interest).
 *   all builtin javascript class methods are prototype-bound. meaning that for every instance of a builtin class no new functions are specifically created for that instance,
 *   and instead, the instance holds a reference to the class's prototype object's method, but applies itself as the *this* when called.
 * ```ts
 * const arr = [1, 2, 3, 4, 5, 6]
 * // prototype-bound methods need to be called via property access, otherwise they will loose their `this` context when uncoupled from their parent object
 * const { push, pop } = arr
 * push(7, 8, 9) // `TypeError: Cannot convert undefined or null to object`
 * pop() // `TypeError: Cannot convert undefined or null to object`
 * const push2 = arr.push, pop2 = arr.pop
 * push2(7, 8, 9) // `TypeError: Cannot convert undefined or null to object`
 * pop2() // `TypeError: Cannot convert undefined or null to object`
 * // but you can do the binding yourself too to make it work
 * const push3 = arr.push.bind(arr) // equivalent to `Array.prototype.push.bind(arr)`
 * const pop3 = arr.pop.bind(arr) // equivalent to `Array.prototype.pop.bind(arr)`
 * push3(7, 8, 9) // will work
 * pop3() // will work
 * // or use this submodule to do the same thing:
 * import { bind_array_pop, bind_array_push } from "./kitchensink_ts/binder.ts"
 * const push4 = bind_array_push(arr)
 * const pop4 = bind_array_pop(arr)
 * push4(7, 8, 9) // will work
 * pop4() // will work
 * ```
 * - finally, property accesses are not easily minifiable (although they do get compressed when gzipped).
 *   however, if you bind your method calls to a variable, then it will become minifiable, which is somewhat the primary motivation for this submodule.
 * 
 * with full automatic typing, you won't be compensating in any way. <br>
 * on the side note, it was figuring out the automatic typing that took me almost 16 hours just to write 3 lines of equivalent javascript code for the main 2 factory functions of this submodule. <br>
 * curse you typescript!
 * 
 * @module
*/

import { prototypeOfClass } from "./struct.js"

type BindableFunction<T, A extends any[], B extends any[], R> = ((this: T, ...args: [...A, ...B]) => R)

/** generates a factory function that binds a class-prototype-method `func` (by reference) to the passed object `S` (which should be an instance of the class).
 * @param func the method to generate the binding for
 * @param args partial tuple of the first few arguments that should be passed in by default
 * @returns a function that can bind any object `obj: S` to the said method
 * 
 * @example
 * ```ts
 * const bind_map_set = bindMethodFactory(Map.prototype.set)
 * type ID = number
 * const graph_edges = new Map<ID, Set<ID>>()
 * const set_graph_edge = bind_map_set(graph_edges) // automatic type inference will correctly assign it the type: `(key: number, value: Set<number>) => Map<number, Set<number>>`
 * const edges: [ID, ID[]][] = [[1, [1,2,3]], [2, [3,5]], [3, [4, 7]], [4, [4,5]], [5, [7]]]
 * for (const [id, adjacent_ids] of edges) { set_graph_edge(id, new Set(adjacent_ids)) }
 * ```
 * 
 * example with assigned default arguments
 * ```ts
 * const bind_queue_delete_bottom_n_elements = bindMethodFactory(Array.prototype.splice, 0)
 * const queue = [1, 2, 3, 4, 5, 6, 9, 9, 9]
 * const release_from_queue = bind_queue_delete_bottom_n_elements(queue) // automatic type inference will correctly assign it the type: `(deleteCount: number, ...items: number[]) => number[]`
 * while (queue.length > 0) { console.log(release_from_queue(3)) }
 * // will print "[1, 2, 3]", then "[4, 5, 6]", then "[9, 9, 9]"
 * ```
*/
export const bindMethodFactory = /*@__PURE__*/ <
	T,
	A extends any[],
	B extends any[],
	R,
>(
	func: BindableFunction<T, A, B, R>,
	...args: A
) => (<S extends T>(thisArg: S) => func.bind<T, A, B, R>(thisArg, ...args))

/** generates a factory function that binds a class-prototype-method (by name) to the passed object `S` (which should be an instance of the class).
 * @param instance an object containing the the method (typically a prototype object, but it doesn't have to be that) 
 * @param method_name the name of the method to generate the binding for
 * @param args partial tuple of the first few arguments that should be passed in by default
 * @returns a function that can bind any object `obj: S` to the said method
 * 
 * @example
 * ```ts
 * const bind_map_set = bindMethodFactoryByName(Map.prototype, "set")
 * type ID = number
 * const graph_edges = new Map<ID, Set<ID>>()
 * const set_graph_edge = bind_map_set(graph_edges) // automatic type inference will correctly assign it the type: `(key: number, value: Set<number>) => Map<number, Set<number>>`
 * const edges: [ID, ID[]][] = [[1, [1,2,3]], [2, [3,5]], [3, [4, 7]], [4, [4,5]], [5, [7]]]
 * for (const [id, adjacent_ids] of edges) { set_graph_edge(id, new Set(adjacent_ids)) }
 * ```
 * 
 * example with assigned default arguments
 * ```ts
 * const bind_queue_delete_bottom_n_elements = bindMethodFactoryByName(Array.prototype, "splice", 0)
 * const queue = [1, 2, 3, 4, 5, 6, 9, 9, 9]
 * const release_from_queue = bind_queue_delete_bottom_n_elements(queue) // automatic type inference will correctly assign it the type: `(deleteCount: number, ...items: number[]) => number[]`
 * while (queue.length > 0) { console.log(release_from_queue(3)) }
 * // will print "[1, 2, 3]", then "[4, 5, 6]", then "[9, 9, 9]"
 * ```
*/
export const bindMethodFactoryByName = /*@__PURE__*/ <
	T extends Record<M, BindableFunction<T, any[], unknown[], any>>,
	M extends PropertyKey,
	A extends (T[M] extends BindableFunction<T, infer P, any[], R> ? P : never),
	R extends ReturnType<T[M]>,
>(
	instance: T,
	method_name: M,
	...args: A
) => {
	return (<
		S extends T,
		SB extends (S[M] extends BindableFunction<S, A, infer P, SR> ? P : never),
		SR extends ReturnType<S[M]>,
	>(thisArg: S) => {
		return instance[method_name].bind<T, A, SB, SR>(thisArg, ...args)
	})
}

/** binds a class-prototype-method `func` (by reference) to the passed object `self` (which should be an instance of the class), and returns that bound method.
 * @param self the object to bind the method `func` to
 * @param func the prototype-method to bind (by reference)
 * @param args partial tuple of the first few arguments that should be passed in by default
 * @returns a version of the function `func` that is now bound to the object `self`, with the default first few partial arguments `args`
 * 
 * @example
 * ```ts
 * type ID = number
 * const graph_edges = new Map<ID, Set<ID>>()
 * const set_graph_edge = bindMethodToSelf(graph_edges, graph_edges.set) // automatic type inference will correctly assign it the type: `(key: number, value: Set<number>) => Map<number, Set<number>>`
 * const edges: [ID, ID[]][] = [[1, [1,2,3]], [2, [3,5]], [3, [4, 7]], [4, [4,5]], [5, [7]]]
 * for (const [id, adjacent_ids] of edges) { set_graph_edge(id, new Set(adjacent_ids)) }
 * ```
 * 
 * example with assigned default arguments
 * ```ts
 * const queue = [1, 2, 3, 4, 5, 6, 9, 9, 9]
 * const release_from_queue = bindMethodToSelf(queue, queue.splice, 0) // automatic type inference will correctly assign it the type: `(deleteCount: number, ...items: number[]) => number[]`
 * while (queue.length > 0) { console.log(release_from_queue(3)) }
 * // will print "[1, 2, 3]", then "[4, 5, 6]", then "[9, 9, 9]"
 * ```
*/
export const bindMethodToSelf = /*@__PURE__*/ <
	S,
	A extends any[],
	B extends any[],
	R,
>(
	self: S,
	func: BindableFunction<S, A, B, R>,
	...args: A
) => func.bind<S, A, B, R>(self, ...args)

/** binds a class-prototype-method (by name `method_name`) to the passed object `self` (which should be an instance of the class), and returns that bound method.
 * @param self the object to bind the method `method_name` to
 * @param method_name the name of the prototype-method to bind
 * @param args partial tuple of the first few arguments that should be passed in by default
 * @returns a version of the function `method_name` that is now bound to the object `self`, with the default first few partial arguments `args`
 * 
 * @example
 * ```ts
 * type ID = number
 * const graph_edges = new Map<ID, Set<ID>>()
 * const set_graph_edge = bindMethodToSelfByName(graph_edges, "set") // automatic type inference will correctly assign it the type: `(key: number, value: Set<number>) => Map<number, Set<number>>`
 * const edges: [ID, ID[]][] = [[1, [1,2,3]], [2, [3,5]], [3, [4, 7]], [4, [4,5]], [5, [7]]]
 * for (const [id, adjacent_ids] of edges) { set_graph_edge(id, new Set(adjacent_ids)) }
 * ```
 * 
 * example with assigned default arguments
 * ```ts
 * const queue = [1, 2, 3, 4, 5, 6, 9, 9, 9]
 * const release_from_queue = bindMethodToSelfByName(queue, "splice", 0) // automatic type inference will correctly assign it the type: `(deleteCount: number, ...items: number[]) => number[]`
 * while (queue.length > 0) { console.log(release_from_queue(3)) }
 * // will print "[1, 2, 3]", then "[4, 5, 6]", then "[9, 9, 9]"
 * ```
*/
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

const
	array_proto = /*@__PURE__*/ prototypeOfClass(Array),
	map_proto = /*@__PURE__*/ prototypeOfClass(Map),
	set_proto = /*@__PURE__*/ prototypeOfClass(Set)

// default array methods
export const
	bind_array_at = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "at"),
	bind_array_concat = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "concat"),
	bind_array_copyWithin = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "copyWithin"),
	bind_array_entries = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "entries"),
	bind_array_every = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "every"),
	bind_array_fill = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "fill"),
	bind_array_filter = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "filter"),
	bind_array_find = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "find"),
	bind_array_findIndex = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "findIndex"),
	bind_array_findLast = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "findLast"),
	bind_array_findLastIndex = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "findLastIndex"),
	bind_array_flat = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "flat"),
	bind_array_flatMap = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "flatMap"),
	bind_array_forEach = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "forEach"),
	bind_array_includes = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "includes"),
	bind_array_indexOf = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "indexOf"),
	bind_array_join = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "join"),
	bind_array_keys = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "keys"),
	bind_array_lastIndexOf = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "lastIndexOf"),
	bind_array_map = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "map"),
	bind_array_pop = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "pop"),
	bind_array_push = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "push"),
	bind_array_reduce = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "reduce"),
	bind_array_reduceRight = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "reduceRight"),
	bind_array_reverse = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "reverse"),
	bind_array_shift = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "shift"),
	bind_array_slice = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "slice"),
	bind_array_some = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "some"),
	bind_array_sort = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "sort"),
	bind_array_splice = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "splice"),
	bind_array_unshift = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "unshift"),
	bind_array_toLocaleString = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "toLocaleString"),
	bind_array_toReversed = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "toReversed"),
	bind_array_toSorted = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "toSorted"),
	bind_array_toSpliced = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "toSpliced"),
	bind_array_toString = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "toString"),
	bind_array_values = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "values"),
	bind_array_with = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "with")

// specialized array methods
export const
	bind_array_clear = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "splice", 0) as <T>(array: T[]) => ((deleteCount?: number, ...items: T[]) => T[]),
	bind_stack_seek = /*@__PURE__*/ bindMethodFactoryByName(array_proto, "at", -1)

// default set methods
export const
	bind_set_add = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "add"),
	bind_set_clear = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "clear"),
	bind_set_delete = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "delete"),
	bind_set_entries = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "entries"),
	bind_set_forEach = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "forEach"),
	bind_set_has = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "has"),
	bind_set_keys = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "keys"),
	bind_set_values = /*@__PURE__*/ bindMethodFactoryByName(set_proto, "values")

// default map methods
export const
	bind_map_clear = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "clear"),
	bind_map_delete = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "delete"),
	bind_map_entries = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "entries"),
	bind_map_forEach = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "forEach"),
	bind_map_get = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "get"),
	bind_map_has = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "has"),
	bind_map_keys = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "keys"),
	bind_map_set = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "set"),
	bind_map_values = /*@__PURE__*/ bindMethodFactoryByName(map_proto, "values")
