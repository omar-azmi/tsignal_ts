/** LALI-HOO!! <br>
 * _Yare Yare Daze_ ... Code wa doko ni? ehh? <br>
 * Mou daijoubu! Naze tte? Code wa kita, hai dozo. <br>
 * Maji desu ka? <br>
 * Hai! unmei desu! <br>
 * Yogatta! hontoni ureshii desu. <br>
*/

import { DEBUG, bindMethodToSelfByName } from "./deps.ts"
import { assign_equals_to_object, assign_fn_to_object, assign_id_name_to_object, default_equality, falsey_equality, log_get_request } from "./funcdefs.ts"
import { Accessor, EqualityCheck, EqualityFn, FROM_ID, HASHED_IDS, ID, Setter, Signal, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"


export interface BaseSignalConfig<T> {
	/** give a name to the signal for debuging purposes */
	name?: string

	/** when a signal's value is updated (either through a {@link Setter}, or a change in the value of a dependancy signal in the case of a memo),
	 * then the dependants/observers of THIS signal will only be notified if the equality check function evaluates to a `false`. <br>
	 * see {@link EqualityCheck} to see its function signature and default behavior when left `undefined`
	*/
	equals?: EqualityCheck<T>

	/** when `false`, the computaion/effect function will be be evaluated/run immediately after it is declared. <br>
	 * however, if left `undefined`, or `true`, the function's execution will be put off until the reactive signal returned by the createXYZ is called/accessed. <br>
	 * by default, `defer` is `true`, and reactivity is not immediately executed during initialization. <br>
	 * the reason why you might want to defer a reactive function is because the body of the reactive function may contain symbols/variables
	 * that have not been defined yet, in which case an error will be raised, unless you choose to defer the first execution. <br>
	*/
	defer?: boolean

	/** initial value declaration for reactive signals. <br>
	 * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
	 * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
	*/
	value?: T
}

type ContextVariables = [
	id_counter_increment: () => ID,
	all_signals: Map<ID, Signal<any>>,
	fmap: Map<FROM_ID, Set<TO_ID>>,
	ids_to_visit_cache: Map<HASHED_IDS, Set<ID>>,
	BaseSignalClass?: ReturnType<typeof BaseSyncSignalClass_Factory>
]

export type OrderedContextVariables = [
	id_counter_increment: () => ID,
	all_signals_get: (key: number) => SyncSignal<any> | undefined,
	all_signals_set: (key: number, value: SyncSignal<any>) => Map<number, SyncSignal<any>>,
	fadd: (src_id: FROM_ID, dst_id: TO_ID) => void,
	ids_to_visit_cache_clear: () => void,
	base_signal_class?: BaseSignalClass,
]

export interface SyncSignal<T> extends Signal<T> {
	value?: T
	equals: EqualityFn<T>
}

export type BaseSignalClass = ReturnType<typeof BaseSyncSignalClass_Factory>

export const BaseSyncSignalClass_Factory = (
	id_counter_increment: () => ID,
	all_signals_get: (key: number) => Signal<any> | undefined,
	all_signals_set: (key: number, value: Signal<any>) => Map<number, Signal<any>>,
	fadd: (src_id: FROM_ID, dst_id: TO_ID) => void,
	ids_to_visit_cache_clear: () => void,
	fire_id: (id: ID) => boolean,
) => {
	return class BaseSyncSignal<T> implements SyncSignal<T> {
		declare id: ID
		declare rid: ID | UNTRACKED_ID
		declare name?: string
		declare equals: EqualityFn<T>

		constructor(
			public value?: T,
			{
				name,
				equals,
			}: BaseSignalConfig<T> = {},
		) {
			const id = id_counter_increment()
			assign_id_name_to_object(this, id, name)
			assign_equals_to_object<this, T>(this, equals === false ? falsey_equality : (equals ?? default_equality))
			// register the new signal
			all_signals_set(id, this)
			// clear the `ids_to_visit_cache`, because the old cache won't include this new signal in any of this signal's dependency pathways.
			// the pathway (ie DFS) has to be re-discovered for this new signal to be included in it
			ids_to_visit_cache_clear()
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			if (observer_id) {
				// register this.id to observer
				fadd(this.id, observer_id)
			}
			if (DEBUG) { log_get_request(all_signals_get, this.id, observer_id) }
			return this.value as T
		}

		set(new_value: T | Updater<T>): boolean {
			const old_value = this.value
			return !this.equals(old_value, (
				this.value = typeof new_value === "function" ?
					(new_value as Updater<T>)(old_value) :
					new_value
			))
		}

		run(): SignalUpdateStatus {
			return SignalUpdateStatus.UPDATED
		}

		static create<T>(...args: any[]): any {
			return new this<T>(...args)
		}

		static fireID = fire_id
	}
}

/** type definition for an accessor and setter pair, which is what is returned by {@link createSignal} */
export type AccessorSetter<T> = [Accessor<T>, Setter<T>]

export const StateSignal_Factory = (base_signal_class: BaseSignalClass) => {
	const fireID = base_signal_class.fireID
	return class StateSignal<T> extends base_signal_class<T> {
		declare value: T

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
			const new_signal = new this(value, config)
			return [
				bindMethodToSelfByName(new_signal, "get"),
				bindMethodToSelfByName(new_signal, "set"),
			]
		}
	}
}

/** type definition for a memorizable function. to be used as a call parameter for {@link createMemo} */
export type MemoFn<T> = (observer_id: TO_ID | UNTRACKED_ID) => T | Updater<T>

export const MemoSignal_Factory = (base_signal_class: BaseSignalClass) => {
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
			return bindMethodToSelfByName(new_signal, "get")
		}
	}
}


export const LazySignal_Factory = (base_signal_class: BaseSignalClass) => {
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
			return bindMethodToSelfByName(new_signal, "get")
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

export const EffectSignal_Factory = (base_signal_class: BaseSignalClass) => {
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

		static create<T>(fn: EffectFn, config?: BaseSignalConfig<void>): AccessorEmitter {
			const new_signal = new this(fn, config)
			return [
				bindMethodToSelfByName(new_signal, "get"),
				bindMethodToSelfByName(new_signal, "set"),
			]
		}
	}
}
