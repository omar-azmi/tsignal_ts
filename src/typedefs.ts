/** base type definitions <br>
 * @module
*/

import type { Context } from "./context.ts"
import type { EffectSignal_Factory, SimpleSignal_Factory, StateSignal_Factory } from "./signal.ts"

type SimpleSignal = ReturnType<typeof SimpleSignal_Factory>
type StateSignal = ReturnType<typeof StateSignal_Factory>
type EffectSignal = ReturnType<typeof EffectSignal_Factory>

/** type definition for a value equality check function. */
export type EqualityFn<T> = (prev_value: T | undefined, new_value: T) => boolean

/** type definition for an equality check specification. <br>
 * when `undefined`, javascript's regular `===` equality will be used. <br>
 * when `false`, equality will always be evaluated to false, meaning that setting any value will always fire a signal, even if it's equal.
*/
export type EqualityCheck<T> = undefined | false | EqualityFn<T>

/** the {@link Signal.id | `id`} of a signal is simply a number. */
export type ID = number
/** another way of saying the dependency (or source) signal id. */
export type FROM_ID = ID
/** another way of saying the observer (or destination) signal id. */
export type TO_ID = ID
/** the {@link Signal.rid | runtime id (`rid`)} of a signal becomes zero after its first run (because it has captured all of its dependencies). */
export type UNTRACKED_ID = 0
/** the hash value generated by the dfs-signal-dag-traversal hash function. */
export type HASHED_IDS = number

/** type definition for an incremental updater function. */
export type Updater<T> = (prev_value?: T) => T

/** type definition for a pure signal accessor (value getter) function. <br>
 * it differs from the _actual_ returned {@link Accessor} type of a {@link SignalClass.create | signal create function}, in that it lacks the id information of its own signal. <br>
 * use this version when annotating functions that do not read the id of dependency signals (quite common),
 * otherwise opt out for {@link Accessor} if you do intend to read the ids of the dependency signals (common in dynamic signals, which can erase and add new dependencies cleanly).
*/
export type PureAccessor<T> = ((observer_id?: TO_ID | UNTRACKED_ID) => T)

/** type definition for a signal value setter function. <br>
 * it differs from the _actual_ returned {@link Setter} type of a {@link SignalClass.create | signal create function}, in that it lacks the id information of its own signal. <br>
 * use this version when annotating signal value setters who's ids are not read (quite common),
 * otherwise opt out for {@link Setter} if you do intend to read the id of the signal setter (seldom used in dynamic signals).
*/
export type PureSetter<T> = ((new_value: T | Updater<T>) => boolean)

/** type definition for a signal accessor (value getter) function. <br>
 * notice that it contains a custom `id` property assigned to it, so it is not just any anonymous function.
 * to manually replicate it, you will also need to assign an `id` property to the replica anonymous function. <br>
 * this type of accessor is what is returned by a {@link SignalClass.create | signal create function}, as opposed to {@link PureAccessor | pure accessor function}.
 * 
 * why would the `id` be needed? <br>
 * often times, a dynamic-dependency signal (such as one that is an array of other accessors) needs to know the `id`s of its dependencies so that it can remove them later on, when they are no longer a dependency.
*/
export interface Accessor<T> extends PureAccessor<T> {
	/** the id of the signal, from which this accessor originates from. <br>
	 * this property is statically inherited from {@link Signal.id}, when the accessor function is created by a {@link SignalClass.create | signal create function}.
	*/
	id: ID
}

/** type definition for a signal setter (value getter) function. <br>
 * notice that it contains a custom `id` property assigned to it, so it is not just any anonymous function.
 * to manually replicate it, you will also need to assign an `id` property to the replica anonymous function. <br>
 * this type of setter is what is returned by a {@link SignalClass.create | signal create function}, as opposed to {@link PureSetter | pure setter function}.
 * 
 * why would the `id` be needed? <br>
 * good question. I don't know under what circumstances one would ever need this information.
 * but for the sake of future proofing, and consistency with {@link Accessor}'s definition, the `id` is assigned as a property anyway.
*/
export interface Setter<T> extends PureSetter<T> {
	/** the id of the signal, from which this setter originates from. <br>
	 * this property is statically inherited from {@link Signal.id}, when the setter function is created by a {@link SignalClass.create | signal create function}.
	*/
	id: ID
}

/** type definition for an async signal value setter function. <br>
 * TODO: should an `AsyncSetter<T>` return a `Promise<T>` ? or should it return a `Promise<boolean>`, which should tell whether or not the value has changed (i.e. `!signal.equal(old_value, new_value)`)
*/
export type AsyncSetter<T> = (
	new_value:
		| (T | Promise<T | Updater<T>>)
		| Updater<T | Promise<T | Updater<T>>>,
	rejectable?: boolean,
) => Promise<T>

/** type definition for when a signal's _update_ function `run` is called by the signal update propagator `propagateSignalUpdate` inside of {@link Context}. <br>
 * the return value should indicate whether this signal has:
 * - updated ({@link SignalUpdateStatus.UPDATED} === 1), and therefore propagate to its observers to also run
 * - unchanged ({@link SignalUpdateStatus.UNCHANGED} === 0), and therefore not propagate to its observers
 * - aborted ({@link SignalUpdateStatus.ABORTED} === -1), and therefore force each of its observers to also become non propagating and inherit the {@link SignalUpdateStatus.ABORTED} status
*/
export type Runner = () => SignalUpdateStatus

/** the abstraction that defines what a signal is. */
export interface Signal<T> {
	/** id of this signal in the {@link Context} in which it exists. */
	id: number

	/** runtime-id of this signal. <br>
	 * it equals to the {@link id} on the first, so that the dependencies of this signal can be notified of being observed.
	 * but once all dependencies have been notified after the first run, this runtime-id should become `0` ({@link UNTRACKED_ID}),
	 * so that the dependiencies do not have to re-register this signal as an observer.
	*/
	rid: ID | UNTRACKED_ID

	/** give a name to this signal for debugging purposes */
	name?: string

	/** get the value of this signal, and handle any observing signal's id ({@link observer_id}). <br>
	 * typically, when `observer_id` is non-zero, this signal should handle it by registering it as an
	 * observer through the use of the context's {@link Context.addEdge} method.
	 * 
	 * @example
	 * ```ts
	 * const MySignalClass_Factory = (ctx: Context) => {
	 * 	const addEdge = ctx.addEdge
	 * 	return class MySignal<T> implements Signal<T> {
	 * 		declare value: T
	 * 		// ...
	 * 		get(observer_id?: TO_ID | UNTRACKED_ID): T {
	 * 			// register this.id to observer (if non-zero) in the dependency graph as a directed edge
	 * 			if (observer_id) { addEdge(this.id, observer_id) }
	 * 			return this.value
	 * 		}
	 * 		// ...
	 * 	}
	 * }
	 * ```
	*/
	get(observer_id?: TO_ID | UNTRACKED_ID): T

	/** set the value of this signal. <br>
	 * the meaning of setting a signal's value greatly varies from signal to signal, which is why it is so abstracted. <br>
	 * however, the returning value must always be a `boolean` describing whether or not this signal's value has changed compared to its previous value. <br>
	 * what makes use of the returned value again greatly varies from signal to signal.
	 * but it is typically used by the {@link run} method to decide whether or not this signal should propagate. <br>
	 * another purpose of the set method is typically to _initiate_ the ignition of an update cycle in a context, bu using {@link Context.runId}.
	 * this is how {@link StateSignal}s and {@link EffectSignal}s begin an update cycle when their values have changed from the prior value.
	 * 
	 * @example
	 * ```ts
	 * const MySignalClass_Factory = (ctx: Context) => {
	 * 	const runId = ctx.runId
	 * 	return class MySignal<T> implements Signal<T> {
	 * 		declare value: T
	 * 		// ...
	 * 		set(new_value: T): boolean {
	 * 			const value_has_changed = new_value !== this.value
	 * 			if (value_has_changed) {
	 * 				runId(this.id)
	 * 				return true
	 * 			}
	 * 			return false
	 * 		}
	 * 		// ...
	 * 	}
	 * }
	 * ```
	*/
	set?(...args: any[]): boolean

	/** specify actions that need to be taken __before__ an update cycle has even begun propagating. <br>
	 * TODO: CURRENTLY NOT IMPLEMENTED.
	 * ISSUE: what should the order in which prepruns run be? we do know the FULL set of signal ids that will be visited.
	 *   but we do not know the subset of ids that WILL BE affected and ran, not until run time of the signal propagation.
	 *   should ids that _might_ be affected also have their preruns ran? and in what order? because we cannot know the order until propagation runtime.
	*/
	prerun?(): void

	/** run the actions taken by a signal when it is informed that its dependency signals have been modified/changed. <br>
	 * the return value should be of the numertic enum kind {@link SignalUpdateStatus}, which specifies that this signal has been either been:
	 * - ` 1`: updated, and therefore this signal's observers should be notified (i.e. _ran_ via their `run` method) 
	 * - ` 0`: unchanged, and therefore this signal's observers should be notified if this is their only active dependency
	 * - `-1`: aborted, and therefore this signal's observer should also abort their `run` method's execution if they were queued
	 * 
	 * this method may also accept an optional `forced` parameter, which tells the signal that it is
	 * being _forced_ to run, even though none of its dependency signals have been executed or changed.
	 * this information is useful when coding for signals that _can_ be fired independently, such as {@link StateSignal} or {@link EffectSignal}.
	 * 
	 * @param forced was this signal _forced_ to run independently?
	 * @returns the update status of this signal, specifying whether or not it has changed, or if it has been aborted
	*/
	run(forced?: boolean): SignalUpdateStatus

	/** specify actions that need to be taken __after__ an update cycle has fully propagated till the end. <br>
	 * the order in which `postrun`s will be executed will be in the reverse order in which they were first encountered (i.e: last in, last out).
	 * meaning that if all three signals `A`, `B`, and `C`, had `postrun` methods on them, and the order of execution was:
	 * `A -> B -> C`, then all `postrun`s will run in the order: `[C.postrun, B.postrun, A.postrun]` (similar to a stack popping).
	*/
	postrun?(): void

	/** a utility method defined in {@link SimpleSignal}, which allows one to bind a certain method (by name) to _this_ instance of a signal,
	 * and therefore make that method freeable/seperable from _this_ signal. <br>
	 * this method is used by all signal classes's static {@link SignalClass.create} method, which is supposed to construct a signal in
	 * a fashion similar to SolidJS, and return an array containing important control functions of the created signal.
	 * most, if not all, of these control function are generally plain old signal methods that have been bounded to the created signal instance.
	*/
	bindMethod<M extends keyof this>(method_name: M): this[M]
}

/** the abstraction that defines the static methods which must exist in a signal generating class */
export interface SignalClass {
	new(...args: any[]): Signal<any>
	create(...args: any[]): [id: ID, ...any[]]
}

/** the numbers used for relaying the status of a signal after it has been _ran_ via its {@link Signal.run | `run method`}. <br>
 * these numbers convey the following instructions to the context's topological update cycle {@link Context.propagateSignalUpdate}:
 * - ` 1`: this signal's value has been updated, and therefore its observers should be updated too.
 * - ` 0`: this signal's value has not changed, and therefore its observers should be _not_ be updated.
 *   do note that an observer signal will still run if some _other_ of its dependency signal did update this cycle (i.e. had a status value of `1`)
 * - `-1`: this signal has been aborted, and therefore its observers must abort execution as well.
 *   the observers will abort _even_ if they had a dependency that _did_ update (had a status value of `1`)
 * 
 * to sum up, given a signal `D`, with dependencies: `A`, `B`, and `C` (all of which are mutually independent of each other).
 * then the status of `D` will be as follows in the order of highest conditional priority to lowest:
 * | status of D           |          status of D as enum          |                                   condition                                   |
 * |-----------------------|:-------------------------------------:|:-----------------------------------------------------------------------------:|
 * | `status(D) = -1`      | `ABORTED`                             | `∃X ∈ [A, B, C] such that status(X) === -1` |
 * | `status(D) = D.run()` | `CHANGED` or `UNCHANGED` or `ABORTED` | `∃X ∈ [A, B, C] such that status(X) ===  1` |
 * | `status(D) = 0`       | `UNCHANGED`                           | `∀X ∈ [A, B, C], status(X) === 0`           |
*/
export const enum SignalUpdateStatus {
	ABORTED = -1,
	UNCHANGED = 0,
	UPDATED = 1,
}
