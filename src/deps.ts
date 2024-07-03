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
} from "jsr:@oazmi/kitchensink@0.7.5/binder"
export { array_isArray, noop, object_assign, object_entries, object_keys, object_values, promise_forever, promise_reject, promise_resolve, symbol_iterator } from "jsr:@oazmi/kitchensink@0.7.5/builtin_aliases_deps"
export { THROTTLE_REJECT, throttle, throttleAndTrail } from "jsr:@oazmi/kitchensink@0.7.5/lambda"
export { isFunction, isPrimitive, prototypeOfClass } from "jsr:@oazmi/kitchensink@0.7.5/struct"
export type { CallableFunctionsOf, ConstructorOf, MethodsOf, StaticImplements } from "jsr:@oazmi/kitchensink@0.7.5/typedefs"

export const enum DEBUG {
	LOG = 0,
}

export type Stringifyable = { toString(): string }

// TODO: add multiple logging options: such as one for `Signal.get` logging, and one for `Context.updateFireCycle`, etc...
// TODO: add a link to license in `readme.md`

// TODO: import the following from the newer version of `kitchensink`
import { bind_map_delete, bind_map_get, bind_map_set } from "jsr:@oazmi/kitchensink@0.7.5/binder"
import { array_from } from "jsr:@oazmi/kitchensink@0.7.5/builtin_aliases_deps"
import { max, modulo } from "jsr:@oazmi/kitchensink@0.7.5/numericmethods"


/** a very simple python-like `List`s class, that allows for in-between insertions, deletions, and replacements, to keep the list compact. */
export class List<T> extends Array<T> {
	/** inserts an item at the specified index, shifting all items ahead of it one position to the front. <br>
	 * negative indices are also supported for indicating the position of the newly added item _after_ the array's length has incremented.
	 * 
	 * @example
	 * ```ts
	 * const arr = new List(0, 1, 2, 3, 4)
	 * arr.insert(-1, 5) // === [0, 1, 2, 3, 4, 5] // similar to pushing
	 * arr.insert(-2, 4.5) // === [0, 1, 2, 3, 4, 4.5, 5]
	 * arr.insert(1, 0.5) // === [0, 0.5, 1, 2, 3, 4, 4.5, 5]
	 * ```
	*/
	insert(index: number, item: T): void {
		const i = modulo(index, this.length) + (index < 0 ? 1 : 0)
		this.splice(i, 0, item)
	}

	/** deletes an item at the specified index, shifting all items ahead of it one position to the back. <br>
	 * negative indices are also supported for indicating the deletion index from the end of the array.
	 * 
	 * @example
	 * ```ts
	 * const arr = new List(0, 0.5, 1, 2, 3, 4, 4.5, 5)
	 * arr.delete(-1) // === [0, 0.5, 1, 2, 3, 4, 4.5] // similar to popping
	 * arr.delete(-2) // === [0, 0.5, 1, 2, 3, 4.5]
	 * arr.delete(1) // === [0, 1, 2, 3, 4.5]
	 * ```
	*/
	delete(index: number): T | undefined {
		return this.splice(index, 1)[0]
	}

	/** swap the position of two items by their index. <br>
	 * if any of the two indices is out of bound, then appropriate number of _empty_ elements will be created to fill the gap;
	 * similar to how index-based assignment works (i.e. `my_list[off_bound_index] = "something"` will increase `my_list`'s length).
	*/
	swap(index1: number, index2: number): void {
		// destructured assignment at an array index is possible. see "https://stackoverflow.com/a/14881632".
		[this[index2], this[index1]] = [this[index1], this[index2]]
	}

	/** the `map` array method needs to have its signature corrected, because apparently, javascript internally creates a new instance of `this`, instead of a new instance of an `Array`.
	 * the signature of the map method in typescript is misleading, because:
	 * - it suggests:      `map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]`
	 * - but in actuality: `map<U>(callbackfn: (value: T, index: number, array: typeof this<T>) => U, thisArg?: any): typeof this<U>`
	 * 
	 * meaning that in our case, `array` is of type `List<T>` (or a subclass thereof), and the return value is also `List<U>` (or a subclass) instead of `Array<U>`. <br>
	 * in addition, it also means that a _new_ instance of this collection (`List`) is created, in order to fill it with the return output. <br>
	 * this is perhaps the desired behavior for many uses, but for my specific use of "reference counting" and "list-like collection of signals",
	 * this feature does not bode well, as I need to be able to account for each and every single instance.
	 * surprise instances of this class are not welcomed, since it would introduce dead dependencies in my "directed acyclic graphs" for signals.
	*/
	map<U>(callbackfn: (value: T, index: number, array: typeof this) => U, thisArg?: any): List<U> { return super.map(callbackfn as any, thisArg) as any }

	/** see the comment on {@link map} to understand why the signature of this function needs to be corrected from the standard typescript definition. */
	flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: typeof this) => U | readonly U[], thisArg?: This | undefined): List<U> {
		return super.flatMap(callback as any, thisArg) as any
	}

	/** see the comment on {@link map} to understand the necessity for this method, instead of the builtin array `map` method. */
	mapToArray<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { return [...this].map(callbackfn, thisArg) }

	/** see the comment on {@link map} to understand the necessity for this method, instead of the builtin array `flatMap` method. */
	flatMapToArray<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] { return [...this].flatMap(callbackfn, thisArg) }

	/** get an item at the specified `index`. <br>
	 * this is equivalent to using index-based getter: `my_list[index]`.
	*/
	get(index: number): T | undefined { return this[index] }

	/** sets the value at the specified index. <br>
	 * prefer using this method instead of index-based assignment, because subclasses may additionally cary out more operations with this method.
	 * and for attaining compatibility between `List` and its subclasses, it would be in your best interest to use the `set` method.
	 * - **not recommended**: `my_list[index] = "hello"`
	 * - **preferred**: `my_list.set(index, "hello")`
	*/
	set(index: number, value: T): T { return (this[index] = value) }

	static from<T, U = T>(arrayLike: ArrayLike<T>, mapfn?: (v: T, k: number) => U, thisArg?: any): List<U> {
		const new_list = new this<U>()
		new_list.push(...array_from(arrayLike, mapfn!, thisArg))
		return new_list
	}

	static of<T>(...items: T[]): List<T> {
		return this.from<T>(items)
	}
}

/** a specialized list that keeps track of the number of duplicates of each item in the list, similar to a reference counter.
 * 
 * this class automatically updates the reference counter on any mutations to the list at `O(log(n))`, where `n` is the number of unique items. <br>
 * note that you __must__ use the {@link set} method for index-based assignment, otherwise the class will not be able track the changes made.
 * - **don't do**: `my_list[index] = "hello"`
 * - **do**: `my_list.set(index, "hello")`
 * 
 * @example
 * ```ts
 * class TrackedList<T> extends RcList<T> {
 * 	public onAdded(item: T): void {
 * 		console.log(`new item introduced: ${item}`)
 * 	}
 * 
 * 	public onDeleted(item: T): void {
 * 		console.log(`item completely removed: ${item}`)
 * 	}
 * }
 * 
 * const list = new TrackedList<number>()
 * list.push(1, 2, 2, 3)
 * // logs: "new item introduced: 1", "new item introduced: 2", "new item introduced: 3"
 * 
 * list.pop() // removes 3
 * // logs: "item completely removed: 3"
 * 
 * list.splice(0, 1) // removes 1
 * // logs: "item completely removed: 1"
 * 
 * list.unshift(4, 4, 5)
 * // logs: "new item introduced: 4", "new item introduced: 5"
 * 
 * list.shift() // removes 4
 * // logs: "item completely removed: 4"
 * 
 * list.set(0, 6) // replaces 2 with 6
 * // logs: "item completely removed: 2", "new item introduced: 6"
 * 
 * list.set(99, 9999) // `list[99] = 9999`, in addition to extending the length of the list to `100`
 * // logs: "new item introduced: 99"
 * // the reference counter of `undefined` is now `95`, because the length of the list was extended by `96` elements,
 * // and the final element (index `99`) was assigned the value of `9999`.
 * // note that `onAdded` is not called for `undefined` elements that are introduced as a consequence of the list extending after assignment.
 * // but `onAdded` will be called when the user _actually_ inserts an `undefined` element via direct mutation methods.
 * ```
*/
export class RcList<T> extends List<T> {
	/** the reference counting `Map`, that bookkeeps the multiplicity of each item in the list. */
	protected readonly rc: Map<T, number> = new Map()

	/** get the reference count (multiplicity) of a specific item in the list. */
	readonly getRc = bind_map_get(this.rc)

	/** set the reference count of a specific item in the list. */
	protected readonly setRc = bind_map_set(this.rc)

	/** delete the reference counting of a specific item in the list. a `true` is returned if the item did exist in {@link rc}, prior to deletion. */
	protected readonly delRc = bind_map_delete(this.rc)

	constructor(...args: ConstructorParameters<typeof List<T>>) {
		super(...args)
		this.incRcs(...this)
	}

	/** this overridable method gets called when a new unique item is determined to be added to the list. <br>
	 * this method is called _before_ the item is actually added to the array, but it is executed right _after_ its reference counter has incremented to `1`. <br>
	 * avoid accessing or mutating the array itself in this method's body (consider it an undefined behavior).
	 * 
	 * @param item the item that is being added.
	*/
	protected onAdded(item: T): void { }

	/** this overridable method gets called when a unique item (reference count of 1) is determined to be removed from the list. <br>
	 * this method is called _before_ the item is actually removed from the array, but it is executed right _after_ its reference counter has been deleted. <br>
	 * avoid accessing or mutating the array itself in this method's body (consider it an undefined behavior).
	 * 
	 * @param item the item that is being removed.
	*/
	protected onDeleted(item: T): void { }

	/** increments the reference count of each item in the provided array of items.
	 * 
	 * @param items the items whose counts are to be incremented.
	*/
	protected incRcs(...items: T[]) {
		const { getRc, setRc } = this
		items.forEach((item) => {
			const new_count = (getRc(item) ?? 0) + 1
			setRc(item, new_count)
			if (new_count === 1) { this.onAdded(item) }
		})
	}

	/** decrements the reference count of each item in the provided array of items.
	 * 
	 * @param items the items whose counts are to be decremented.
	*/
	protected decRcs(...items: T[]) {
		const { getRc, setRc, delRc } = this
		items.forEach((item) => {
			const new_count = (getRc(item) ?? 0) - 1
			if (new_count > 0) {
				setRc(item, new_count)
			} else {
				delRc(item)
				this.onDeleted(item)
			}
		})
	}

	push(...items: T[]): number {
		const return_value = super.push(...items)
		this.incRcs(...items)
		return return_value
	}

	pop(): T | undefined {
		const
			previous_length = this.length,
			item = super.pop()
		if (this.length < previous_length) { this.decRcs(item as T) }
		return item
	}

	shift(): T | undefined {
		const
			previous_length = this.length,
			item = super.shift()
		if (this.length < previous_length) { this.decRcs(item as T) }
		return item
	}

	unshift(...items: T[]): number {
		const return_value = super.unshift(...items)
		this.incRcs(...items)
		return return_value
	}

	splice(start: number, deleteCount?: number, ...items: T[]): T[] {
		const removed_items = super.splice(start, deleteCount as number, ...items)
		this.incRcs(...items)
		this.decRcs(...removed_items)
		return removed_items
	}

	swap(index1: number, index2: number): void {
		const max_index = max(index1, index2)
		if (max_index >= this.length) {
			// run the `this.set` method to extend the array, while reference counting the new gap filling insertions (of `undefined` elements).
			this.set(max_index, undefined as T)
		}
		super.swap(index1, index2)
	}

	/** sets the value at the specified index, updating the counter accordingly. <br>
	 * always use this method instead of index-based assignment, because the latter is not interceptable (except when using proxies):
	 * - **don't do**: `my_list[index] = "hello"`
	 * - **do**: `my_list.set(index, "hello")`
	*/
	set(index: number, value: T): T {
		const
			old_value = super.get(index),
			old_length = this.length,
			increase_in_array_length = (index + 1) - old_length
		if (increase_in_array_length === 1) {
			// we handle this special case separately, because it would be more performant this way,
			// and the `onDelete` method will not get called (due to `this.decRcs(old_value)`) for the just recently added `undefined` element (which is also immediately deleted)
			this.push(value)
		} else if ((value !== old_value) || (increase_in_array_length > 1)) {
			value = super.set(index, value)
			this.incRcs(value)
			if (increase_in_array_length > 0) {
				// if the array's length has extended due to the assignment,
				// then we shall increment the count of `undefined` items, by the amount the array was extended by.
				const { getRc, setRc } = this
				setRc(undefined as T, (getRc(undefined as T) ?? 0) + increase_in_array_length)
			}
			this.decRcs(old_value as T)
		}
		return value
	}

	declare static from: <T, U = T>(arrayLike: ArrayLike<T>, mapfn?: (v: T, k: number) => U, thisArg?: any) => RcList<U>
	declare static of: <T>(...items: T[]) => RcList<T>
}
