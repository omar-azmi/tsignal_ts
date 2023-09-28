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
	get: Accessor<T>
	set: (...args: any[]) => boolean
	//Setter<T> | ((...args: any[]) => boolean)
	run: Runner
	id: number
	rid: ID | UNTRACKED_ID
	name?: string
}

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

	/** specify if the signal is _dynamic_, and therefore _identifiable_. <br>
	 * all identifiable signal accessor/setter/emmiter functions can have their properties modified externally and dynamically. <br>
	 * but doing so may be an anti-pattern, especially if the return types differ from the original. <br>
	 * dynamic properties of particular interest to the end-user may include:
	 * - {@link BaseSignalClass.value}
	 * - {@link BaseSignalClass.equals}
	 * - {@link BaseSignalClass.fn}
	 * note that it is the static {@link BaseSignalClass.create} function of a signal's class that should assign identification to the signal-bound accessor/setter/emmiter functions. <br>
	 * in general, you would want to call the `BaseSignalClass`'s static `create` method, which serves this very purpose.
	*/
	dynamic?: boolean
}

export declare class BaseSignalClass<T> implements Signal<T> {
	id: ID
	rid: ID | UNTRACKED_ID
	name?: string
	value?: T
	equals: EqualityFn<T>
	fn?: (observer_id: TO_ID | UNTRACKED_ID) => (T | Updater<T> | boolean | void)
	constructor(value?: T, config?: BaseSignalConfig<T>)
	get(observer_id?: TO_ID | UNTRACKED_ID): T
	set(new_value: T | Updater<T>): boolean
	run(): SignalUpdateStatus
	bindMethod<M extends keyof this>(method_name: M): this[M]
	static create<T>(...args: any[]): [id: ID, ...any[]]
	static fireID(id: ID): boolean
}

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
	constructor(record?: Record<K, V>, config?: BaseSignalConfig<DELTA_MAP>)
	get(observer_id?: TO_ID | UNTRACKED_ID): DELTA_MAP
	set(key: K, new_value: V | Updater<V>): boolean
	run(): SignalUpdateStatus
	bindMethod<M extends keyof this>(method_name: M, dynamic?: boolean): this[M]
	static create<T>(...args: any[]): any
	static fireID(id: ID): boolean
}

export const enum SignalUpdateStatus {
	ABORTED = -1,
	UNCHANGED = 0,
	UPDATED = 1,
}

export type SubPropertyMapper<T, PROP extends keyof T[keyof T]> = { [K in keyof T]: T[K][PROP] }
