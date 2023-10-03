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

/** type definition for an incremental updater function. */
export type Updater<T> = (prev_value?: T) => T

/** type definition for a signal accessor (value getter) function. */
export type Accessor<T> = ((observer_id?: TO_ID | UNTRACKED_ID) => T)

/** type definition for a signal value setter function. */
export type Setter<T> = ((new_value: T | Updater<T>) => boolean)

/** type definition for when a signal's _update_ function `run` is called by the signal update propagator `propagateSignalUpdate` inside of {@link context.createContext}. <br>
 * the return value should indicate whether this signal has:
 * - updated ({@link SignalUpdateStatus.UPDATED} === 1), and therefore propagate to its observers to also run
 * - unchanged ({@link SignalUpdateStatus.UNCHANGED} === 0), and therefore not propagate to its observers
 * - aborted ({@link SignalUpdateStatus.ABORTED} === -1), and therefore force each of its observers to also become non propagating and inherit the {@link SignalUpdateStatus.ABORTED} status
*/
export type Runner = () => SignalUpdateStatus

export interface Signal<T> {
	id: number
	rid: ID | UNTRACKED_ID
	name?: string
	get(observer_id?: TO_ID | UNTRACKED_ID): T
	set(...args: any[]): boolean
	run(): SignalUpdateStatus
	bindMethod<M extends keyof this>(method_name: M): this[M]
}

export interface SignalClass {
	new(...args: any[]): Signal<any>
	create(...args: any[]): [id: ID, ...any[]]
}

/*
export declare class BaseMappedSignalClass<
	K extends PropertyKey,
	V,
	DELTA_MAP extends [record: Record<K, V>, ...changed_keys: Array<K>] = any,
> implements Signal<DELTA_MAP> {
	id: ID
	rid: ID | UNTRACKED_ID
	name?: string
	value?: DELTA_MAP
	equals: EqualityFn<V>
	fn?: (observer_id: TO_ID | UNTRACKED_ID) => (DELTA_MAP | Updater<DELTA_MAP>)
	constructor(record_wrapped?: [Record<K, V>], config?: SimpleSignalConfig<DELTA_MAP>)
	get(observer_id?: TO_ID | UNTRACKED_ID): DELTA_MAP
	set(key: K, new_value: V | Updater<V>): boolean
	run(): SignalUpdateStatus
	bindMethod<M extends keyof this>(method_name: M, dynamic?: boolean): this[M]
	static create<T>(...args: any[]): any
}
*/

export const enum SignalUpdateStatus {
	ABORTED = -1,
	UNCHANGED = 0,
	UPDATED = 1,
}
