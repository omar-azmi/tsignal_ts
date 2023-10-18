/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/

import { Context } from "./context.js"
import { DEBUG, StaticImplements, bindMethodToSelfByName } from "./deps.js"
import { default_equality, falsey_equality, log_get_request } from "./funcdefs.js"
import { Accessor, EqualityCheck, EqualityFn, ID, Setter, SignalClass, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.js"

// TODO: add `SimpleSignalConfig.deps: ID[]` option to manually enforce dependance on certain signal ids. this can be useful when you want a
//	signal to defer its first run, yet you also want that signal to react to any of its dependencies, before this signal ever gets run

export interface SimpleSignalConfig<T> {
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
}

export interface MemoSignalConfig<T> extends SimpleSignalConfig<T> {
	/** initial value declaration for reactive signals. <br>
	 * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
	 * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
	*/
	value?: T
}

export type SimpleSignalInstance = InstanceType<ReturnType<typeof SimpleSignal_Factory>>

export const SimpleSignal_Factory = (ctx: Context) => {
	const { newId, getId, setId, addEdge } = ctx
	return class SimpleSignal<T> implements StaticImplements<SignalClass, typeof SimpleSignal> {
		declare id: ID
		declare rid: ID | UNTRACKED_ID
		declare name?: string
		declare value?: T
		declare equals: EqualityFn<T>
		declare fn?: (observer_id: TO_ID | UNTRACKED_ID) => (T | Updater<T>) | any
		prerun?(): any
		postrun?(): any

		constructor(
			value?: T,
			{
				name,
				equals,
			}: SimpleSignalConfig<T> = {},
		) {
			const id = newId()
			// register the new signal
			setId(id, this)
			this.id = id
			this.rid = id
			this.name = name
			this.value = value
			this.equals = equals === false ? falsey_equality : (equals ?? default_equality)
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			if (observer_id) {
				// register this.id to observer
				addEdge(this.id, observer_id)
			}
			if (DEBUG.LOG) { log_get_request(getId, this.id, observer_id) }
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

		run(forced?: boolean): SignalUpdateStatus {
			return forced ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		bindMethod<M extends keyof this>(method_name: M): this[M] {
			return bindMethodToSelfByName(this as any, method_name) as this[M]
		}

		static create<T>(...args: any[]): [id: ID, ...any[]] {
			const new_signal = new this<T>(...args)
			return [new_signal.id, new_signal]
		}
	}
}

export const StateSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	return class StateSignal<T> extends ctx.getClass(SimpleSignal_Factory)<T> {
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

		set(new_value: T | Updater<T>): boolean {
			// if value has changed, then fire this id to begin/queue a firing cycle
			const value_has_changed = super.set(new_value)
			if (value_has_changed) {
				runId(this.id)
				return true
			}
			return false
		}

		static create<T>(value: T, config?: SimpleSignalConfig<T>): [idState: ID, getState: Accessor<T>, setState: Setter<T>] {
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

export const MemoSignal_Factory = (ctx: Context) => {
	return class MemoSignal<T> extends ctx.getClass(SimpleSignal_Factory)<T> {
		declare fn: MemoFn<T>
		declare prerun: never
		declare postrun: never

		constructor(
			fn: MemoFn<T>,
			config?: MemoSignalConfig<T>,
		) {
			super(config?.value, config)
			this.fn = fn
			if (config?.defer === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): T {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		// TODO: consider whether or not MemoSignals should be able to be forced to fire independently
		run(forced?: boolean): SignalUpdateStatus {
			return super.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		static create<T>(fn: MemoFn<T>, config?: SimpleSignalConfig<T>): [idMemo: ID, getMemo: Accessor<T>] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get")
			]
		}
	}
}


export const LazySignal_Factory = (ctx: Context) => {
	return class LazySignal<T> extends ctx.getClass(SimpleSignal_Factory)<T> {
		declare fn: MemoFn<T>
		declare dirty: 0 | 1
		declare prerun: never
		declare postrun: never

		constructor(
			fn: MemoFn<T>,
			config?: MemoSignalConfig<T>,
		) {
			super(config?.value, config)
			this.fn = fn
			this.dirty = 1
			if (config?.defer === false) { this.get() }
		}

		run(forced?: boolean): SignalUpdateStatus.UPDATED {
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

		static create<T>(fn: MemoFn<T>, config?: SimpleSignalConfig<T>): [idLazy: ID, getLazy: Accessor<T>] {
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

export const EffectSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	return class EffectSignal extends ctx.getClass(SimpleSignal_Factory)<void> {
		declare fn: EffectFn
		declare prerun: never
		declare postrun: never

		constructor(
			fn: EffectFn,
			config?: SimpleSignalConfig<void>,
		) {
			super(undefined, config)
			this.fn = fn
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
			const effect_will_fire_immediately = runId(this.id)
			return effect_will_fire_immediately
		}

		run(forced?: boolean): SignalUpdateStatus {
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
