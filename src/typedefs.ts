/** type definition for a value equality check function. */
export type EqualityFn<T> = (prev_value: T | undefined, new_value: T) => boolean

/** type definition for an equality check specification. <br>
 * when `undefined`, javascript's regular `===` equality will be used. <br>
 * when `false`, equality will always be evaluated to false, meaning that setting any value will always fire a signal, even if it's equal.
*/
export type EqualityCheck<T> = undefined | false | EqualityFn<T>

export type ID = number
export type FROM_ID = ID
export type TO_ID = ID
export type UNTRACKED_ID = 0
export type HASHED_IDS = number

export type SignalSelfID = { id?: ID, rid?: ID | UNTRACKED_ID, name?: string }

/** type definition for an incremental updater function. */
export type Updater<T> = (prev_value?: T) => T

/** type definition for a signal accessor (value getter) function. */
export type Accessor<T> = ((observer_id?: TO_ID | UNTRACKED_ID) => T) & SignalSelfID

/** type definition for a signal value setter function. */
export type Setter<T> = ((new_value: T | Updater<T>) => boolean) & SignalSelfID

export interface Signal<T> {
	get: Accessor<T>
	set: Setter<T>
	id: number
	rid: ID | UNTRACKED_ID
	name?: string
	run(): SignalUpdateStatus
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


export const enum SignalUpdateStatus {
	ABORTED = -1,
	UNCHANGED = 0,
	UPDATED = 1,
}

export type SubPropertyMapper<T, PROP extends keyof T[keyof T]> = { [K in keyof T]: T[K][PROP] }
