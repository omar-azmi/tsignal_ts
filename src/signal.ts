/** LALI-HOO!! <br>
 * _Yare Yare Daze_ ... Code wa doko ni? ehh? <br>
 * Mou daijoubu! Naze tte? Code wa kita, hai dozo. <br>
 * Maji desu ka? <br>
 * Hai! unmei desu! <br>
 * Yogatta! hontoni ureshii desu. <br>
*/

// TODO: implement the following kinds of signals: `DictState` (or just `Dict`), `ListState` (or just `List`), `DictMemo`, and `ListMemo`
// - `Dict<K, V> extends BaseSignalClass<[new_value: V | undefined, mutated_key: K, dict: Dict<K, V>["dict"]]>` . the `undefined` in `new_value: V | undefined` exemplifies the case in which a key gets deleted
// - `List<V> extends BaseSignalClass<[new_value: V | undefined, mutated_index: V, list: List<V>["list"]]>` . the `undefined` in `new_value: V | undefined` exemplifies the case in which a value gets deleted
// - `DictMemo<K, V>(fn: (observed_id?: ID) => [changed_value: V, changed_key: K, dict: DictMemo<K, V>["dict"])] ) extends Dict<K, V> //with computation + memorization`

import { assign_fn_to_object, default_equality, falsey_equality } from "./funcdefs.ts"
import { Accessor, SimpleSignalConfig, ID, Setter, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater, ContextSignal, ContextSignalClassRecord, EqualityFn } from "./typedefs.ts"

export type SimpleSignalClass<T> = ReturnType<typeof SimpleSignal_Factory<T>>
export type SimpleSignal<T> = InstanceType<SimpleSignalClass<T>>
export const SimpleSignal_Factory = <S = any>(context_classes: ContextSignalClassRecord) => {
	const base_class = context_classes["$ContextSignal"] as typeof ContextSignal
	return class <T extends S> extends base_class<T> {
		static $name: keyof ContextSignalClassRecord = "$SimpleSignal"
		declare id: ID
		declare rid: ID | UNTRACKED_ID
		declare name?: string
		declare equals: EqualityFn<T>
		declare fn?: (observer_id: TO_ID | UNTRACKED_ID) => (T | Updater<T>) | any

		constructor(
			public value?: T,
			{
				name,
				equals,
			}: SimpleSignalConfig<T> = {},
		) {
			super()
			this.name = name
			this.equals = equals === false ? falsey_equality : (equals ?? default_equality)
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			super.get(observer_id)
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
	}
}

export type StateSignalClass<T> = ReturnType<typeof StateSignal_Factory<T>>
export type StateSignal<T> = InstanceType<StateSignalClass<T>>
export const StateSignal_Factory = <S = any>(context_classes: ContextSignalClassRecord) => {
	const base_class = context_classes["$SimpleSignal"] as SimpleSignalClass<S>
	const fireID = base_class.fireID
	return class StateSignal<T extends S> extends base_class<T> {
		static $name: keyof ContextSignalClassRecord = "$StateSignal"
		declare value: T
		declare fn: never

		constructor(
			value: T,
			config?: SimpleSignalConfig<T>,
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

		static create<T extends S>(value: T, config?: SimpleSignalConfig<T>): [idState: ID, getState: Accessor<T>, setState: Setter<T>] {
			const new_signal = new this(value, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.bindMethod("set"),
			]
		}
	}
}

/** type definition for a memorizable function. to be used as a call parameter for {@link createMemo} */
export type MemoFn<T> = (observer_id: TO_ID | UNTRACKED_ID) => T | Updater<T>

export type MemoSignalClass<T> = ReturnType<typeof MemoSignal_Factory<T>>
export type MemoSignal<T> = InstanceType<MemoSignalClass<T>>
export const MemoSignal_Factory = <S = any>(context_classes: ContextSignalClassRecord) => {
	const base_class = context_classes["$SimpleSignal"] as SimpleSignalClass<S>
	return class MemoSignal<T extends S> extends base_class<T> {
		static $name: keyof ContextSignalClassRecord = "$MemoSignal"
		declare fn: MemoFn<T>

		constructor(
			fn: MemoFn<T>,
			config?: SimpleSignalConfig<T>,
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

		static create<T extends S>(fn: MemoFn<T>, config?: SimpleSignalConfig<T>): [idMemo: ID, getMemo: Accessor<T>] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get")
			]
		}
	}
}

export type LazySignalClass<T> = ReturnType<typeof LazySignal_Factory<T>>
export type LazySignal<T> = InstanceType<LazySignalClass<T>>
export const LazySignal_Factory = <S = any>(context_classes: ContextSignalClassRecord) => {
	const base_class = context_classes["$SimpleSignal"] as SimpleSignalClass<S>
	return class LazySignal<T extends S> extends base_class<T> {
		static $name: keyof ContextSignalClassRecord = "$LazySignal"
		declare fn: MemoFn<T>
		declare dirty: 0 | 1

		constructor(
			fn: MemoFn<T>,
			config?: SimpleSignalConfig<T>,
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

		static create<T extends S>(fn: MemoFn<T>, config?: SimpleSignalConfig<T>): [idLazy: ID, getLazy: Accessor<T>] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get")
			]
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

export type EffectSignalClass = ReturnType<typeof EffectSignal_Factory>
export type EffectSignal = InstanceType<EffectSignalClass>
export const EffectSignal_Factory = (context_classes: ContextSignalClassRecord) => {
	const base_class = context_classes["$SimpleSignal"] as SimpleSignalClass<void>
	const fireID = base_class.fireID
	return class EffectSignal extends base_class<void> {
		static $name: keyof ContextSignalClassRecord = "$EffectSignal"
		declare fn: EffectFn

		constructor(
			fn: EffectFn,
			config?: SimpleSignalConfig<void>,
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

		static create(fn: EffectFn, config?: SimpleSignalConfig<void>): [idEffect: ID, dependOnEffect: Accessor<void>, fireEffect: EffectEmitter] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.bindMethod("set"),
			]
		}
	}
}
