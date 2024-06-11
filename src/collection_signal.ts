/** this module contains signals that are composed of a collection of other sinal {@link Accessor}s. <br>
 * all signals in here are capable of dynamically adding new dependency `Accessor`s, and removing previous ones. <br>
 * but in order to work, the collection signal needs to know the `id` of the signal accessor it consumes (i.e. it must be {@link Identifiable}). <br>
 * as such, the signal `Accessor`s provided to each collection __must__ be of {@link Accessor} function type, rather than of a {@link PureAccessor} type.
 * 
 * @module
*/

import type { Context } from "./context.ts"
import { MemoSignal_Factory, type SimpleSignalConfig } from "./signal.ts"
import type { Accessor, Identifiable, PureAccessor } from "./typedefs.ts"


/** creates a signal that internally maintains a `Set` collection of {@link Accessor | `Accessors\<T\>`}, but returns a `Set<T>` when accessed (via the getter function). <br>
 * this signal will fire an update whenever one of its constituent signal items fires an update. <br>
 * this signal also fires independently when either _new_ {@link Accessor} item(s) are added (via the {@link UnisetStateSignal.addItems}), or when _old_ item(s) are removed (via the {@link UnisetStateSignal.delItems}).
*/
export const UnisetStateSignal_Factory = (ctx: Context) => {
	const { runId, addEdge, delEdge } = ctx
	//@ts-ignore: the function signature of the static `create` method is different from its base class. but we don't care.
	return class UnisetStateSignal<T> extends ctx.getClass(MemoSignal_Factory)<Set<T>> {
		declare items: Set<Accessor<T>>
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
			this.items = new Set(items)
			const id = this.id
			for (const item of items) { addEdge(item.id, id) }
			if (config?.defer === false) { super.run() }
		}

		addItems(...items: Array<Accessor<T>>): void {
			const { items: current_items, id } = this
			let mutated = false
			items.forEach((item) => {
				if (!current_items.has(item)) {
					current_items.add(item)
					addEdge(item.id, id)
					mutated = true
				}
			})
			if (mutated) { runId(id) }
		}

		delItems(...items: Array<Accessor<T>>): void {
			const { items: current_items, id } = this
			let mutated = false
			items.forEach((item) => {
				if (current_items.delete(item)) {
					delEdge(item.id, id)
					mutated = true
				}
			})
			if (mutated) { runId(id) }
		}

		static create<T>(
			items: Iterable<Accessor<T>> = [],
			config?: Omit<SimpleSignalConfig<T>, "equals">
		): [
				idUniset: number,
				getUniset: Accessor<Set<T>>,
				addItems: Identifiable<(...items: Array<Accessor<T>>) => void>,
				delItems: Identifiable<(...items: Array<Accessor<T>>) => void>,
			] {
			const new_signal = new this<T>(items, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.bindMethod("addItems"),
				new_signal.bindMethod("delItems"),
			]
		}
	}
}
