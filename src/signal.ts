/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/

import type { Context } from "./context.ts"
import { DEBUG, bindMethodToSelfByName, isFunction, type StaticImplements } from "./deps.ts"
import { assign_id, log_get_request, parseEquality } from "./funcdefs.ts"
import type { Accessor, EqualityCheck, EqualityFn, ID, Identifiable, PureSetter, Setter, Signal, SignalClass, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"
import { SignalUpdateStatus } from "./typedefs.ts"

// TODO: add `SimpleSignalConfig.deps: ID[]` option to manually enforce dependance on certain signal ids. this can be useful when you want a
//       signal to defer its first run, yet you also want that signal to react to any of its dependencies, before this signal ever gets run.
// TODO: alternatively, add the options `SimpleSignalConfig.oninit: (ctx: Context, signal: Signal<T>) => void` and `SimpleSignalConfig.ondelete: (ctx: Context, signal: Signal<T>) => void`,
//       which would call the `oninit` function right after the `SimpleSignal` instance is constructed, and absolutely before any potential `signal.get`,
//       or `signal.run`, or `signal.fn` is ever executed. this would also let you declare custom `deps: ID[]` within the function, and apply it to the `ctx`.
//       on the other hand, `ondelete` will be called right before the signal and its dependency graph-edges are deleted.
//       this is in contrast to `ctx.onInit`, which runs based on the non-zero-ablity of `id`, and `ctx.onDelete`, which runs after the graph-edges have been deleted.

/** the configuration options used by most signal constructors, and especially the basic/primitive ones. */
export interface SimpleSignalConfig<T> {
	/** give a name to the signal for debugging purposes */
	name?: string

	/** when a signal's value is updated (either through a {@link PureSetter}, or a change in the value of a dependency signal in the case of a memo),
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

/** the configuration options used by most primitive derived/computed signal constructors. */
export interface MemoSignalConfig<T> extends SimpleSignalConfig<T> {
	/** initial value declaration for reactive signals. <br>
	 * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
	 * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
	*/
	value?: T
}

/** an arbitrary instance of a simple/primitive signal. */
export type SimpleSignalInstance = InstanceType<ReturnType<typeof SimpleSignal_Factory>>

/** the base signal class inherited by most other signal classes. <br>
 * its only function is to:
 * - when {@link Signal.get | read}, it return its `this.value`, and register any new observers (those with a nonzero runtime-id {@link Signal.rid | `Signal.rid`})
 * - if {@link Signal.set | set} to a new value, compare it to its previous value through its `this.equals` function,
 *   and return a boolean specifying whether or not the old and new values are the same.
 * - when {@link Signal.run | ran}, it will always return `0` (unchanged), unless it is forced, in which case it will return a `1`.
*/
export const SimpleSignal_Factory = (ctx: Context) => {
	const { newId, getId, setId, addEdge } = ctx
	/** {@inheritDoc SimpleSignal_Factory} */
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
			this.equals = parseEquality(equals)
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
				this.value = isFunction(new_value) ?
					(new_value as Updater<T>)(old_value) :
					new_value
			))
		}

		run(forced?: boolean): SignalUpdateStatus {
			return forced ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		/** create an anonymous function that is bound to the provided `method_name`, in addition to assigning this signal's `id` to it. */
		bindMethod<M extends keyof this>(method_name: M): Identifiable<this[M]> {
			return assign_id(
				this.id,
				bindMethodToSelfByName(this as any, method_name) as this[M]
			)
		}

		static create<T>(...args: any[]): [id: ID, ...any[]] {
			const new_signal = new this<T>(...args)
			return [new_signal.id, new_signal]
		}
	}
}

/** creates state signals, which when {@link Signal.set | set} to a changed value, it will fire an update to all of its dependent/observer signals. */
export const StateSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	/** {@inheritDoc StateSignal_Factory} */
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

/** creates a computational/derived signal that only fires again if at least one of its dependencies has fired,
 * and after the {@link SimpleSignalInstance.fn | recomputation} (`this.fn`), the new computed value is different from the old one (according to `this.equals`).
*/
export const MemoSignal_Factory = (ctx: Context) => {
	/** {@inheritDoc MemoSignal_Factory} */
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
		//       [20240611]: in order to allow derived classes to fire independently, it would be best if we _do_ allow the `forced` parameter to take action.
		//                   so, as of now, it will take effect.
		//                   However, I need to document this feature properly now, in addition to changing the signature to allow for a "fireMemo()" forcefull setter-like function.
		//                   Moreover, I will need to consider the consequences on the existing derived classes, such as the `LazySignal`.
		// UPDATE: nevermind, I will retract the comments above soon, and will not currently implement forced memo signals, as it will create ambiguity in the following regard:
		//         when the signal is forced, it will certainly always ultimately propagate (via `SignalUpdateStatus.UPDATED`), but:
		//         - will it update its current value (via `super.set(this.fn(this.rid))`)
		//         - or will it skip rerunning the `fn` function and skip setting `this.value`
		run(forced?: boolean): SignalUpdateStatus {
			return super.set(this.fn(this.rid)) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		static create<T>(fn: MemoFn<T>, config?: MemoSignalConfig<T>): [idMemo: ID, getMemo: Accessor<T>] {
			const new_signal = new this(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get")
			]
		}
	}
}

/** similar to {@link MemoSignal_Factory | `MemoSignal`}, creates a computed/derived signal, but it only recomputes if:
 * - it is dirty (`this.dirty = 1`)
 * - AND some signal/observer/caller calls this signal to {@link Signal.get | get} its value.
 * 
 * this signal becomes dirty when at least one of its dependencies has fired an update. <br>
 * after which, it will remain dirty unless some caller requests its value, after which it will become not-dirty again.
 * 
 * this signal also always fires an update when at least one of its dependencies has fired an update.
 * and it abandons checking for equality all together, since it only recomputes after a get request,
 * by which it is too late to signal no update in the value (because its observer is already running).
 * 
 * this signal becomes pointless (in terms of efficiency) once a {@link MemoSignal_Factory | `MemoSignal`} depends on it.
 * but it is increadibly useful (i.e. lazy) when other {@link LazySignal_Factory | `LazySignal`s} depend on one another.
*/
export const LazySignal_Factory = (ctx: Context) => {
	/** {@inheritDoc LazySignal_Factory} */
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
				this.dirty = 0
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		static create<T>(fn: MemoFn<T>, config?: MemoSignalConfig<T>): [idLazy: ID, getLazy: Accessor<T>] {
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
export type PureEffectEmitter = () => boolean

/** see {@link PureEffectEmitter} for more information. */
export interface EffectEmitter extends Identifiable<PureEffectEmitter> { }

/** extremely similar to {@link MemoSignal_Factory | `MemoSignal`}, but without a value to output, and also has the ability to fire on its own.
 * TODO-DOC: explain more
*/
export const EffectSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	/** {@inheritDoc EffectSignal_Factory} */
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
		 * TODO: reconsider, because you can also check for `this.rid !== 0` to determine that `this.fn` effect function has never run before, thus it must run at least once if the observer is not untracked_id
		 * is it really necessary for us to rerun `this.fn` effect function for every new observer? it seems to create chaos rather than reducing it.
		 * UPDATE: decided NOT to re-run on every new observer
		 * TODO: cleanup this messy doc and redeclare how createEffect works
		*/
		get(observer_id?: TO_ID | UNTRACKED_ID): void {
			if (observer_id) {
				if (this.rid) { this.run() }
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
