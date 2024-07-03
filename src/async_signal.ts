/** async signals <br>
 * @module
*/

import type { Context } from "./context.ts"
import { isFunction, promise_forever, promise_reject, promise_resolve } from "./deps.ts"
import { SimpleSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import type { Accessor, AsyncSetter, ID, Updater } from "./typedefs.ts"
import { SignalUpdateStatus } from "./typedefs.ts"

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
			const
				_this = this,
				new_value_is_updater = isFunction(new_value) && !(new_value instanceof Promise)
			// evaluate the `new_value` based on the updater function applied to the old value `this.value`
			new_value = new_value_is_updater ? (new_value as Updater<T | Promise<T>>)(_this.value) : new_value
			if (new_value instanceof Promise) {
				return (_this.promise = new_value).then(
					// on promise resolved
					(value: T | Updater<T>) => {
						// our previous pending promise (aka `this.promise`) MUST still equal to `new_value`'s promise, otherwise it would mean that a more recent promise has been assigned/set to this AsyncState.
						// we shall only update the underlying `this.value` if and only if the resolved promise also happens to be the most recently assigned/set promise.
						// if that is not the case (i.e. the resolved promise has turned old because a newer one came around/was set), then we would simply drop the old promise.
						if (_this.promise === new_value) {
							_this.promise = undefined
							return _this.setPromise(value as any, rejectable)
						}
						return promise_forever()
					},
					// on promise rejected
					(reason?: any) => {
						// TODO: is the check below necessary? would it be harmful in any way if the promise continues to linger around?
						if (_this.promise === new_value) { _this.promise = undefined }
						return rejectable ? promise_reject(reason) : promise_forever()
					}
				)
			}
			// the signal update is first propagated, and then the returned promise is resolved with the value we just set
			const value_has_changed = super.set(new_value as T)
			if (value_has_changed) { runId(this.id) }
			return promise_resolve(new_value as T)
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
