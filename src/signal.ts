/** LALI-HOO!! <br>
 * _Yare Yare Daze_ ... Code wa doko ni? ehh? <br>
 * Mou daijoubu! Naze tte? Code wa kita, hai dozo. <br>
 * Maji desu ka? <br>
 * Hai! unmei desu! <br>
 * Yogatta! hontoni ureshii desu. <br>
*/

import { assign_fn_to_object } from "./funcdefs.ts"
import { Accessor, BaseSignalClass, BaseSignalConfig, Setter, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"

/** type definition for an accessor and setter pair, which is what is returned by {@link createSignal} */
export type AccessorSetter<T> = [Accessor<T>, Setter<T>]

export const StateSignal_Factory = (base_signal_class: typeof BaseSignalClass) => {
	const fireID = base_signal_class.fireID
	return class StateSignal<T> extends base_signal_class<T> {
		declare value: T
		declare fn: never

		constructor(
			value: T,
			config?: BaseSignalConfig<T>,
		) {
			super(value, config)
		}

		set(new_value: T | Updater<T>): boolean {
			// if value has changed, then fire this id to begin or queue a firing cycle
			const value_has_changed = super.set(new_value)
			if (value_has_changed) {
				fireID(this.id)
				return true
			}
			return false
		}

		static create<T>(value: T, config?: BaseSignalConfig<T>): AccessorSetter<T> {
			const
				dynamic = config?.dynamic,
				new_signal = new this(value, config)
			return [
				new_signal.bindMethod("get", dynamic),
				new_signal.bindMethod("set", dynamic),
			]
		}
	}
}

/** type definition for a memorizable function. to be used as a call parameter for {@link createMemo} */
export type MemoFn<T> = (observer_id: TO_ID | UNTRACKED_ID) => T | Updater<T>

export const MemoSignal_Factory = (base_signal_class: typeof BaseSignalClass) => {
	return class MemoSignal<T> extends base_signal_class<T> {
		declare fn: MemoFn<T>

		constructor(
			fn: MemoFn<T>,
			config?: BaseSignalConfig<T>,
		) {
			super(config?.value, config)
			assign_fn_to_object(this, fn)
			if (config?.defer === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		run(): SignalUpdateStatus {
			return super.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		static create<T>(fn: MemoFn<T>, config?: BaseSignalConfig<T>): Accessor<T> {
			const new_signal = new this(fn, config)
			return new_signal.bindMethod("get", config?.dynamic)
		}
	}
}


export const LazySignal_Factory = (base_signal_class: typeof BaseSignalClass) => {
	return class LazySignal<T> extends base_signal_class<T> {
		declare fn: MemoFn<T>
		declare dirty: 0 | 1

		constructor(
			fn: MemoFn<T>,
			config?: BaseSignalConfig<T>,
		) {
			super(config?.value, config)
			assign_fn_to_object(this, fn)
			this.dirty = 1
			if (config?.defer === false) { this.get() }
		}

		run(): SignalUpdateStatus.UPDATED {
			return (this.dirty = 1)
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			if (this.rid || this.dirty) {
				super.set(this.fn(this.rid))
				this.dirty = 1
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		static create<T>(fn: MemoFn<T>, config?: BaseSignalConfig<T>): Accessor<T> {
			const new_signal = new this(fn, config)
			return new_signal.bindMethod("get", config?.dynamic)
		}
	}
}

/** type definition for an effect function. to be used as a call parameter for {@link createEffect} <br>
 * the return value of the function describes whether or not the signal should propagate. <br>
 * if `undefined` or `true` (or truethy), then the effect signal will propagate onto its observer signals,
 * otherwise if it is explicitly `false`, then it won't propagate.
*/
export type EffectFn = (observer_id: TO_ID | UNTRACKED_ID) => void | undefined | boolean

/** a function that forcefully runs the {@link EffectFn} of an effect signal, and then propagates towards the observers of that effect signal. <br>
 * the return value is `true` if the effect is ran and propagated immediately,
 * or `false` if it did not fire immediately because of some form of batching stopped it from doing so.
*/
export type EffectEmitter = () => boolean

/** type definition for an effect accessor (ie for registering as an observer) and an effect forceful-emitter pair, which is what is returned by {@link createEffect} */
export type AccessorEmitter = [Accessor<void>, EffectEmitter]

export const EffectSignal_Factory = (base_signal_class: typeof BaseSignalClass) => {
	const fireID = base_signal_class.fireID
	return class EffectSignal extends base_signal_class<void> {
		declare fn: EffectFn

		constructor(
			fn: EffectFn,
			config?: BaseSignalConfig<void>,
		) {
			super(undefined, config)
			assign_fn_to_object(this, fn)
			if (config?.defer === false) { this.set() }
		}

		/** a non-untracked observer (which is what all new observers are) depending on an effect signal will result in the triggering of effect function.
		 * this is an intentional design choice so that effects can be scaffolded on top of other effects.
		*/
		get(observer_id?: TO_ID | UNTRACKED_ID): void {
			if (observer_id) {
				this.run()
				super.get(observer_id)
			}
		}

		set() {
			const effect_will_fire_immediately = fireID(this.id)
			return effect_will_fire_immediately
		}

		run(): SignalUpdateStatus {
			const signal_should_propagate = this.fn(this.rid) !== false
			if (this.rid) { this.rid = 0 as UNTRACKED_ID }
			return signal_should_propagate ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		static create(fn: EffectFn, config?: BaseSignalConfig<void>): AccessorEmitter {
			const
				dynamic = config?.dynamic,
				new_signal = new this(fn, config)
			return [
				new_signal.bindMethod("get", dynamic),
				new_signal.bindMethod("set", dynamic),
			]
		}
	}
}
