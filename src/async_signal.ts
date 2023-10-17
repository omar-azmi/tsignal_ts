/** async signals <br>
 * @module
*/

import { Context } from "./context.ts"
import { SimpleSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import { Accessor, AsyncSetter, ID, SignalUpdateStatus, Updater } from "./typedefs.ts"

export const AsyncStateSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	return class AsyncStateSignal<T> extends ctx.getClass(SimpleSignal_Factory)<T> {
		/** previous pending promise */
		promise?: Promise<T | Updater<T>>
		declare value: T
		declare fn: never
		declare prerun: never
		declare postrun: never

		constructor(
			value: T,
			config?: SimpleSignalConfig<T>,
		) {
			super(value, config)
		}

		setPromise(
			new_value:
				| (T | Promise<T | Updater<T>>)
				| Updater<T | Promise<T | Updater<T>>>,
			rejectable: boolean = false,
		): Promise<T> {
			let
				resolver: (value: T) => void,
				rejecter: (reason?: any) => void

			const
				_this = this,
				return_promise = new Promise<T>((resolve, reject) => {
					resolver = resolve
					if (rejectable) { rejecter = reject }
				}),
				new_value_is_updater = (typeof new_value === "function") && !(new_value instanceof Promise)
			// evaluate the `new_value` based on the updater function applied to the old value `this.value`
			new_value = new_value_is_updater ?
				(new_value as Updater<T | Promise<T>>)(_this.value) :
				new_value
			if (new_value instanceof Promise) {
				(_this.promise = new_value).then(
					// on promise resolved:
					(value: T | Updater<T>) => {
						// our previous pending promise (aka `this.promise`) MUST still equal to `new_value`, otherwise it would mean that a more recent promise has been assigned/set to this AsyncState.
						// we shall only update the underlying `this.value` if and only if the resolved promise also happens to be the most recently assigned/set promise.
						// if that is not the case (i.e. the resolved promise has turned old because a newer one came around/was set), then we would simply drop the old promise.
						if (_this.promise === new_value) {
							_this.promise = undefined
							_this.setPromise(value as any, rejectable).then(resolver)
						}
					},
					// on promise rejected:
					(reason?: any) => {
						if (_this.promise === new_value) {
							_this.promise = undefined
							rejecter?.(reason)
						}
					}
				)
			} else {
				// the signal update is first propagated, and then the returned promise is resolved with the value we jsut set
				const value_has_changed = super.set(new_value as T)
				if (value_has_changed) { runId(this.id) }
				resolver!(new_value as T)
			}
			return return_promise
		}

		run(forced?: boolean | undefined): SignalUpdateStatus {
			// if there is a pending promise (i.e `this.promise !== undefined`), then this signal should not propagate, even when `forced === true`.
			return this.promise ?
				SignalUpdateStatus.ABORTED :
				super.run(forced)
		}

		static create<T>(value: T, config?: SimpleSignalConfig<T>): [idAsyncState: ID, getState: Accessor<T>, setStatePromise: AsyncSetter<T>] {
			const new_signal = new this(value, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.bindMethod("setPromise"),
			]
		}
	}
}
