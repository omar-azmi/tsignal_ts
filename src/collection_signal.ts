/** this module contains signals that are composed of a collection of other sinal {@link Accessor}s. <br>
 * all signals in here are capable of dynamically adding new dependency `Accessor`s, and removing previous ones. <br>
 * but in order to work, the collection signal needs to know the `id` of the signal accessor it consumes (i.e. it must be {@link Identifiable}). <br>
 * as such, the signal `Accessor`s provided to each collection __must__ be of {@link Accessor} function type, rather than of a {@link PureAccessor} type.
 * 
 * @module
*/

import type { Context } from "./context.ts"
import { object_assign } from "./deps.ts"
import { MemoSignal_Factory, type SimpleSignalConfig } from "./signal.ts"
import type { Accessor, ID, Identifiable, PureAccessor } from "./typedefs.ts"

/** this information is needed by the proxy-like data-structures that run signals when they are mutated. <br>
 * see {@link Uniset} for an example.
*/
interface BoundSignalInfo {
	id: ID
	addEdge: Context["addEdge"]
	delEdge: Context["delEdge"]
	runId: Context["runId"]
}

/** a unique set of {@link Accessor | Accessors}, that implements all builtin `Set` class methods, and fires a signal update upon mutation. */
class Uniset<A extends Accessor<any>> extends Set<A> implements Identifiable<{}> {
	declare public readonly id: number
	declare protected readonly addEdge: (src_id: number, dst_id: number) => boolean
	declare protected readonly delEdge: (src_id: number, dst_id: number) => boolean
	declare protected readonly runId: (id: number) => boolean

	constructor(config: BoundSignalInfo, items: Iterable<A> = []) {
		// we do not pass `items` to the super constructor, because it internally uses `this.add` to add the items,
		// and as we know, since that method is overloaded here, and requires the `config` to be assigned to `this` before being used,
		// and we can't assign `config` to `this` before calling the super constructor,
		// so the only way out is by not adding the initial items via the super constructor, and instead adding them manually, one by one later on.
		super()
		object_assign(this, config)
		const { addEdge, id } = config
		// the initial items are added as a dependency, but they will NOT trigger an update cycle via `runId`.
		// this is because we want the user of this class to decide whether or not it should fire initially.
		// the default behavior is similar to `defer`ing
		for (const item of items) {
			super.add(item)
			addEdge(item.id, id)
		}
	}

	addItems(...items: A[]): void {
		const { id, addEdge, runId } = this
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
		const { id, delEdge, runId } = this
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

/** creates a signal that internally maintains a `Set` collection of {@link Accessor | `Accessors\<T\>`}, but returns a `Set<T>` when accessed (via the getter function). <br>
 * this signal will fire an update whenever one of its constituent signal items fires an update. <br>
 * this signal also fires independently when either _new_ {@link Accessor} item(s) are added (via the {@link UnisetSignal.items.addItems}), or when _old_ item(s) are removed (via the {@link UnisetSignal.items.delItems}).
*/
export const UnisetSignal_Factory = (ctx: Context) => {
	const { runId, addEdge, delEdge } = ctx
	/** {@inheritDoc UnisetSignal_Factory} */
	// @ts-ignore: the function signature of the static `create` method is different from its base class. but we don't care.
	return class UnisetSignal<T> extends ctx.getClass(MemoSignal_Factory)<Set<T>> {
		declare items: Uniset<Accessor<T>>
		declare value: Set<T>

		constructor(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals">,
		) {
			super((rid: number) => {
				const { items, value } = this
				value.clear()
				items.forEach((item) => { value.add(item(0)) })
				return value
			}, { ...config, value: new Set(), defer: true, equals: false })
			const id = this.id
			this.items = new Uniset({ id, addEdge, delEdge, runId }, items)
			if (config?.defer === false) { super.run() }
		}

		static create<T>(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals">
		): [
				idUniset: number,
				getUniset: Accessor<Set<T>>,
				items: UnisetSignal<T>["items"],
			] {
			const new_signal = new this<T>(items, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.items
			]
		}
	}
}

// DONE: consider whether or not to the "State" part in the names should be dropped.
