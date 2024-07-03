/** this module contains signals that are composed of a collection of other sinal {@link Accessor}s. <br>
 * all signals in here are capable of dynamically adding new dependency `Accessor`s, and removing previous ones. <br>
 * but in order to work, the collection signal needs to know the `id` of the signal accessor it consumes (i.e. it must be {@link Identifiable}). <br>
 * as such, the signal `Accessor`s provided to each collection __must__ be of {@link Accessor} function type, rather than of a {@link PureAccessor} type.
 * 
 * @module
*/

import type { Context } from "./context.ts"
import { List, RcList, object_assign, type ConstructorOf } from "./deps.ts"
import { MemoSignal_Factory, type MemoFn, type MemoSignalConfig, type SimpleSignalConfig } from "./signal.ts"
import type { Accessor, ID, Identifiable, PureAccessor, UNTRACKED_ID } from "./typedefs.ts"

/** this information is needed by the proxy-like data-structures that run signals when they are mutated. <br>
 * see {@link UnisetCollection} and {@link ListCollection} for an example.
*/
interface BoundSignalInfo {
	id: ID
	ctx: Context
}

/** a unique set of {@link Accessor | Accessors}, that implements all builtin `Set` class methods, and fires a signal update upon mutation. */
export class UnisetCollection<A extends Accessor<any>> extends Set<A> implements Identifiable<{}> {
	declare public readonly id: number
	declare protected readonly ctx: Context

	constructor(config: BoundSignalInfo, items: Iterable<A> = []) {
		// we do not pass `items` to the super constructor, because it internally uses `this.add` to add the items,
		// and as we know, since that method is overloaded here, and requires the `config` to be assigned to `this` before being used,
		// and we can't assign `config` to `this` before calling the super constructor,
		// so the only way out is by not adding the initial items via the super constructor, and instead adding them manually, one by one later on.
		super()
		object_assign(this, config)
		const { id, ctx: { addEdge } } = config
		// the initial items are added as a dependency, but they will NOT trigger an update cycle via `runId`.
		// this is because we want the user of this class to decide whether or not it should fire initially.
		// the default behavior is similar to `defer`ing
		for (const item of items) {
			super.add(item)
			addEdge(item.id, id)
		}
	}

	addItems(...items: A[]): void {
		const { id, ctx: { addEdge, runId } } = this
		let mutated = false
		items.forEach((item) => {
			if (!super.has(item)) {
				super.add(item)
				addEdge(item.id, id)
				mutated = true
			}
		})
		if (mutated) { runId(id) }
	}

	delItems(...items: A[]): void {
		const { id, ctx: { delEdge, runId } } = this
		let mutated = false
		items.forEach((item) => {
			if (super.delete(item)) {
				delEdge(item.id, id)
				mutated = true
			}
		})
		if (mutated) { runId(id) }
	}

	add(value: A): this {
		this.addItems(value)
		return this
	}

	delete(value: A): boolean {
		const item_exists = super.has(value)
		this.delItems(value)
		return item_exists
	}

	clear(): void {
		// the following is not an efficient implementation.
		// it could have been faster if I had exposed `fmap` and `rmap` from the `Context`, but I don't want to do that.
		this.delItems(...this)
	}
}

// @ts-ignore: I don't know why typescript is complaining about the signatures of the static `from` and `of` methods being incompatible with the super class.
export class ListCollection<A extends Accessor<any>> extends RcList<A> implements Identifiable<{}> {
	declare public readonly id: number
	declare protected readonly ctx: Context
	private disabled: boolean = true

	constructor(config: BoundSignalInfo, items: Iterable<A> = []) {
		super()
		object_assign(this, config)
		// the `super.push` method will consequently call `this.incRc`, and then `this.onAdded`.
		// but that will result in the firing of an update cycle due to `runID` in `this.onAdded`,
		// which is not what we want initially to happen (since it will defy the `defer` config option).
		// thus we introduce the `this.disabled` member to take of not allowing `runId` to get executed in the first run.
		// but the dependency of this list on the `item: A` will still get added to the dependency graph via `addEdge` in `this.onAdded`.
		this.push(...items)
		this.disabled = false
	}

	protected onAdded(item: A): void {
		this.ctx.addEdge(item.id, this.id)
	}

	protected onDeleted(item: A): void {
		this.ctx.delEdge(item.id, this.id)
	}

	protected incRcs(...items: A[]): void {
		super.incRcs(...items)
		// important detail: in the constructor, when `super()` is called, it consequently calls `this.incRcs`, which is this method.
		// this happens before we assign `ctx`, `id`, etc... to `this` (via the `object_assign(this, config)` line in the constructor).
		// as a result, on the very first call to `this.incRcs`, `this.ctx` and `this.id` are undefined.
		// which is why we put the optional chaining operator in it (i.e. `this.ctx?.runId` and `this.disabled ?? true`).
		if (!(this.disabled ?? true) && items.length > 0) { this.ctx?.runId(this.id) }
	}

	protected decRcs(...items: A[]): void {
		super.decRcs(...items)
		if (!(this.disabled ?? true) && items.length > 0) { this.ctx?.runId(this.id) }
	}

	splice(start: number, deleteCount?: number | undefined, ...items: A[]): A[] {
		let return_value: A[]
		this.ctx.batch.scopedBatching(() => { return_value = super.splice(start, deleteCount, ...items) })
		return return_value!
	}

	swap(index1: number, index2: number): void {
		if (index1 === index2) { return }
		const { id, ctx: { batch, runId } } = this
		batch.scopedBatching(() => {
			super.swap(index1, index2)
			runId(id)
		})
	}

	set(index: number, value: A): A {
		let return_value: A
		this.ctx.batch.scopedBatching(() => { return_value = super.set(index, value) })
		return return_value!
	}

	declare static from: <T, A extends Accessor<any>>(arrayLike: ArrayLike<T>, mapfn?: (v: T, k: number) => A, thisArg?: any) => ListCollection<A>
	declare static of: <A extends Accessor<any>>(...items: A[]) => ListCollection<A>
}

// TODO: consider whether or not `CollectionSignalConfig` should contain an `fn: MemoFn<V>` member which should describe how to convert `dataClass<Accessor<T>>` to `valueClass<T>`
//       and then remove the need for the `fn` function in `CollectionSignal` when calling its `super` constructor.

/** // TODO: I'm too sleepy */
export interface CollectionSignalConfig<D, V> {
	dataClass: ConstructorOf<D, [config: BoundSignalInfo, items?: Iterable<any>]>
	valueClass: ConstructorOf<V>
}

/** a generalized signal class factory, capable of holding a collection of {@link Accessor | Accessors} in its data structure {@link D},
 * which then transforms into a collection of values held inside of data structure {@link V}, when this signal's accessor (value getter) is called. <br>
 * this factory can adapt to many common collection data structure, such as `Set`, `Array`, `Map`, and other custom collections.
 * but you will need to write an appropriate {@link data_structure_class_config["dataClass"]} class for it, which would fire an update when mutations occur its collection of {@link Accessor | Accessors}.
 * 
 * for instance, if you ultimately wish to create signals that are "set-like collection of accessors", then you'd want:
 * - `D = dataClass = Set // of type Set<Accessor<T>>`
 * - `V = valueClass = Set // of type Set<T>`
 * 
 * @param data_structure_class_config this object should contain the class of the collection datatype when the `Accessor` is called,
 *   and also the class of the collection datatype which stores a collection of `Accessor` functions to retrieve from.
 *   see {@link CollectionSignalConfig} for more information and examples.
 * @param ctx the signal context on which this data structure will function in.
 *   it is needed by the data structure in order to fire update cycles natively.
 * @returns the signal constructing class that is adapted to your provided collection data structures.
 *   in order to use it, you will need to extend it, and call the `super` constructor with the appropriate `fn` memo function
 *   that converts `dataClass<Accessor<T>>` to `valueClass<T>`
*/
export const CollectionSignal_Factory = <D, V>(data_structure_class_config: CollectionSignalConfig<D, V>, ctx: Context) => {
	const { dataClass, valueClass } = data_structure_class_config

	return class CollectionSignal extends ctx.getClass(MemoSignal_Factory)<V> {
		declare readonly data: D
		declare readonly value: V

		constructor(
			fn: MemoFn<V>,
			config?: Omit<MemoSignalConfig<Iterable<any>>, "equals">,
		) {
			super(fn, { ...config, value: new valueClass(), defer: true, equals: false })
			const id = this.id
			this.data = new dataClass({ id, ctx }, config?.value)
			if (config?.defer === false) { super.run() }
		}

		// the signature of the actual `static create` method is incomplatible with the super method, due to the generics used.
		// in addition we need to relax the typing of this static method, since its derived subclasses will be using a different signature.
		// as such, we introduce the alternate generic signature `static create(...args: any[]): any` to allow for for this flexibility.
		static create(...args: any[]): any
		static create(
			fn: MemoFn<V>,
			config?: Omit<MemoSignalConfig<Iterable<any>>, "equals">,
		): [
				id: number,
				getValue: Accessor<V>,
				data: D,
			] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.data
			]
		}
	}
}

/** creates a signal that internally maintains a `Set` collection of {@link Accessor | `Accessors\<T\>`}, but returns a `Set<T>` when accessed (via the getter function). <br>
 * this signal will fire an update whenever one of its constituent signal items fires an update. <br>
 * this signal also fires independently when either _new_ {@link Accessor} item(s) are added (via the {@link UnisetSignal.data.addItems}), or when _old_ item(s) are removed (via the {@link UnisetSignal.data.delItems}).
*/
export const UnisetSignal_Factory = (ctx: Context) => {
	const
		dataClass = UnisetCollection,
		valueClass = Set,
		signalSuperClass = CollectionSignal_Factory.bind(undefined, { dataClass, valueClass })

	/** {@inheritDoc UnisetSignal_Factory} */
	return class UnisetSignal<T> extends ctx.getClass(signalSuperClass) {
		declare readonly data: UnisetCollection<Accessor<T>>
		declare readonly value: Set<T>

		constructor(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		) {
			super((rid: number) => {
				const { data, value } = this
				value.clear()
				data.forEach((item) => { value.add(item(0 as UNTRACKED_ID)) })
				return value
			}, { ...config, value: items })
		}

		static create<T>(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		): [
				idUniset: number,
				getUniset: Accessor<Set<T>>,
				data: UnisetCollection<Accessor<T>>,
			] {
			const new_signal = new this<T>(items, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get") as any,
				new_signal.data
			]
		}
	}
}

/** creates a signal that internally maintains a `List` collection of {@link Accessor | `Accessors\<T\>`}, but returns a `List<T>` (which is a subclass of `Array<T>`) when accessed (via the getter function). <br>
 * this signal will fire an update whenever one of its constituent signal items fires an update. <br>
 * this signal also fires independently when either _new_ {@link Accessor} item(s) are added (via array methods, such as {@link UnisetSignal.data.push}), or when _old_ item(s) are removed (via array methods, such as {@link UnisetSignal.data.pop}).
*/
export const ListSignal_Factory = (ctx: Context) => {
	const
		dataClass = ListCollection,
		valueClass = List,
		signalSuperClass = CollectionSignal_Factory.bind(undefined, { dataClass, valueClass })

	/** {@inheritDoc ListSignal_Factory} */
	return class ListSignal<T> extends ctx.getClass(signalSuperClass) {
		declare readonly data: ListCollection<Accessor<T>>
		declare readonly value: List<T>

		constructor(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		) {
			super((rid: number) => {
				const { data, value } = this
				value.splice(0) // clear all of the array's elements
				// TODO: consider whether or not we should use `item?.(0)` instead of `item(0)`, as it might be possible for some `item`s to be `undefined`.
				//       it comes down to user preference:
				//       - do they prefer simplicity of having empty elements getting mapped to `undefined`,
				//       - or would they like to get warned via fatal error, that their list is not entirely made out of Accessors.
				value.push(...data.mapToArray((item) => item(0 as UNTRACKED_ID)))
				return value
			}, { ...config, value: items })
		}

		static create<T>(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		): [
				idList: number,
				getList: Accessor<List<T>>,
				data: ListCollection<Accessor<T>>,
			] {
			const new_signal = new this<T>(items, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get") as any,
				new_signal.data
			]
		}
	}
}

// TODO: implement a `MapCollection<K, V extends Accessor<any>>` and its complementary `MapSignal<K, V extends Accessor<any>>`.
// TODO: implement a `ObjectCollection<SCHEMA>` and its complementary `ObjectSignal<SCHEMA>`, where `SCHEMA` is an interface with any `key: K extends PropertyKey`, and `value: V extends Accessor<any>` pairs.
