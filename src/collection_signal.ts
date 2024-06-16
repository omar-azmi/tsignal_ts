/** this module contains signals that are composed of a collection of other sinal {@link Accessor}s. <br>
 * all signals in here are capable of dynamically adding new dependency `Accessor`s, and removing previous ones. <br>
 * but in order to work, the collection signal needs to know the `id` of the signal accessor it consumes (i.e. it must be {@link Identifiable}). <br>
 * as such, the signal `Accessor`s provided to each collection __must__ be of {@link Accessor} function type, rather than of a {@link PureAccessor} type.
 * 
 * @module
*/

import type { Context } from "./context.ts"
import { object_assign, type ConstructorOf } from "./deps.ts"
import { MemoSignal_Factory, type MemoFn, type MemoSignalConfig, type SimpleSignalConfig } from "./signal.ts"
import type { Accessor, ID, Identifiable, PureAccessor } from "./typedefs.ts"

/** this information is needed by the proxy-like data-structures that run signals when they are mutated. <br>
 * see {@link Uniset} and {@link List} for an example.
*/
interface BoundSignalInfo {
	id: ID
	ctx: Context
}

/** a unique set of {@link Accessor | Accessors}, that implements all builtin `Set` class methods, and fires a signal update upon mutation. */
export class Uniset<A extends Accessor<any>> extends Set<A> implements Identifiable<{}> {
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
		declare data: D
		declare value: V

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
 * this signal also fires independently when either _new_ {@link Accessor} item(s) are added (via the {@link UnisetSignal.items.addItems}), or when _old_ item(s) are removed (via the {@link UnisetSignal.items.delItems}).
*/
export const UnisetSignal_Factory = (ctx: Context) => {
	const
		dataClass = Uniset,
		valueClass = Set,
		signalSuperClass = CollectionSignal_Factory.bind(undefined, { dataClass, valueClass })

	/** {@inheritDoc UnisetSignal_Factory} */
	return class UnisetSignal<T> extends ctx.getClass(signalSuperClass) {
		declare data: Uniset<Accessor<T>>
		declare value: Set<T>

		constructor(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		) {
			super((rid: number) => {
				const { data, value } = this
				value.clear()
				data.forEach((item) => { value.add(item(0)) })
				return value
			}, { ...config, value: items })
		}

		static create<T>(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals" | "value">,
		): [
				idUniset: number,
				getUniset: Accessor<Set<T>>,
				data: Uniset<Accessor<T>>,
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
