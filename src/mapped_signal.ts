import { Context } from "./context.ts"
import { array_isArray, object_keys, object_values } from "./deps.ts"
import { SimpleSignalConfig, SimpleSignal_Factory } from "./signal.ts"
import { Accessor, EqualityCheck, EqualityFn, ID, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"

// TODO: implement the following kinds of signals: `DictState` (or just `Dict`), `ListState` (or just `List`), `DictMemo`, and `ListMemo`
// - `Dict<K, V> extends SimpleSignal<[new_value: V | undefined, mutated_key: K, dict: Dict<K, V>["dict"]]>` . the `undefined` in `new_value: V | undefined` exemplifies the case in which a key gets deleted
// - `List<V> extends SimpleSignal<[new_value: V | undefined, mutated_index: V, list: List<V>["list"]]>` . the `undefined` in `new_value: V | undefined` exemplifies the case in which a value gets deleted
// - `DictMemo<K, V>(fn: (observed_id?: ID) => [changed_value: V, changed_key: K, dict: DictMemo<K, V>["dict"])] ) extends Dict<K, V> //with computation + memorization`


export interface RecordSignalConfig<K extends PropertyKey, V> {
	/** give a name to the signal for debuging purposes */
	name?: string

	/** when a signal's value is updated (either through a {@link Setter}, or a change in the value of a dependancy signal in the case of a memo),
	 * then the dependants/observers of THIS signal will only be notified if the equality check function evaluates to a `false`. <br>
	 * see {@link EqualityCheck} to see its function signature and default behavior when left `undefined`
	*/
	equals?: EqualityCheck<V>

	/** when `false`, the computaion/effect function will be be evaluated/run immediately after it is declared. <br>
	 * however, if left `undefined`, or `true`, the function's execution will be put off until the reactive signal returned by the createXYZ is called/accessed. <br>
	 * by default, `defer` is `true`, and reactivity is not immediately executed during initialization. <br>
	 * the reason why you might want to defer a reactive function is because the body of the reactive function may contain symbols/variables
	 * that have not been defined yet, in which case an error will be raised, unless you choose to defer the first execution. <br>
	*/
	defer?: boolean
}

export interface RecordMemoSignalConfig<K extends PropertyKey, V> extends RecordSignalConfig<K, V> {
	/** initial value declaration for reactive signals. <br>
	 * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
	 * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
	*/
	value?: Record<K, V>
}

export const RecordSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	//DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: K[]] = any
	return class RecordSignal<K extends PropertyKey, V> extends ctx.getClass(SimpleSignal_Factory)<[record: Record<K, V>, ...changed_keys: K[]]> {
		declare value: [record: Record<K, V>, ...changed_keys: K[]]
		//@ts-ignore:
		declare equals: EqualityFn<V>
		declare fn: never
		//declare get: (observer_id?: TO_ID | UNTRACKED_ID) => [record: Record<K, V>, ...changed_keys: K[]]

		constructor(
			base_record: Record<K, V> = {} as Record<K, V>,
			config?: RecordSignalConfig<K, V>,
		) {
			const
				record_is_array = array_isArray(base_record),
				empty_instance_of_record = (record_is_array ? [] : {}) as Record<K, V>,
				keys = record_is_array ? [...base_record.keys()] : object_keys(base_record),
				values: V[] = record_is_array ? [...base_record.values()] : object_values(base_record)
			//@ts-ignore: `RecordSignalConfig` is not a subtype of `SimpleSignalConfig`, but we don't care and just wish to assign `config.equals as EqualityFn<V>`
			super([empty_instance_of_record], config)
			this.setItems(keys as K[], values, false)
		}

		private fire(): boolean {
			const
				delta_record = this.value,
				record_has_changed = delta_record.length > 1
			if (record_has_changed) {
				runId(this.id)
				delta_record.splice(1)
				return true
			}
			return false
		}

		//@ts-ignore:
		set(key: K, new_value: V | Updater<V>, fire: boolean = true): boolean {
			return this.setItems([key], [new_value], fire)
		}

		setItems(keys: K[], values: (V | Updater<V>)[], fire: boolean = true): boolean {
			const
				equals = this.equals,
				delta_record = this.value,
				record = delta_record[0],
				len = keys.length
			for (let i = 0; i < len; i++) {
				const
					key = keys[i],
					old_value = record[key],
					new_value = values[i],
					_new_value = record[key] = typeof new_value === "function" ?
						(new_value as Updater<V>)(old_value) :
						new_value,
					value_has_changed = equals(old_value, _new_value)
				if (value_has_changed) { delta_record.push(key) }
			}
			return fire ? this.fire() : false
		}

		delete(key: K, fire: boolean = true) {
			return this.deleteKeys([key], fire)
		}

		deleteKeys(keys: K[], fire: boolean = true): boolean {
			const
				delta_record = this.value,
				record = delta_record[0]
			for (const key of keys) {
				if (key in record) {
					delete record[key]
					delta_record.push(key)
				}
			}
			return fire ? this.fire() : false
		}

		static create<K extends PropertyKey, V>(
			base_record: Record<K, V> = {} as Record<K, V>,
			config?: RecordSignalConfig<K, V>
		): [
				idRecord: ID,
				getDeltaRecord: Accessor<[record: Record<K, V>, ...changed_keys: K[]]>,
				setRecord: (key: K, new_value: V | Updater<V>, fire?: boolean) => boolean,
				setRecords: (keys: K[], values: (V | Updater<V>)[], fire?: boolean) => boolean,
				deleteRecord: (key: K, fire?: boolean) => boolean,
				deleteRecords: (keys: K[], fire?: boolean) => boolean,
			] {
			const new_signal = new this<K, V>(base_record, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
				new_signal.bindMethod("set"),
				new_signal.bindMethod("setItems"),
				new_signal.bindMethod("delete"),
				new_signal.bindMethod("deleteKeys"),
			]
		}
	}
}

/** type definition for a memorizable record function. to be used as a call parameter for {@link createRecordMemo} */
export type RecordMemoFn<K extends PropertyKey, V, DELTA_RECORD = [record: Record<K, V>, ...changed_keys: Array<K>]> = (observer_id: TO_ID | UNTRACKED_ID) => DELTA_RECORD | Updater<DELTA_RECORD>

export const RecordMemoSignal_Factory = (ctx: Context) => {
	const runId = ctx.runId
	return class MemoRecordSignal<K extends PropertyKey, V> extends ctx.getClass(RecordSignal_Factory)<K, V> {
		declare value: [record: Record<K, V>, ...changed_keys: K[]]
		//@ts-ignore: mendokusai neh
		declare fn: RecordMemoFn<K, V>

		constructor(
			fn: RecordMemoFn<K, V>,
			config?: RecordMemoSignalConfig<K, V>,
		) {
			super(config?.value, config)
			this.fn = fn
			if (config?.defer === false) { this.get() }
		}

		get(observer_id?: TO_ID | UNTRACKED_ID): this["value"] {
			if (this.rid) {
				this.run()
				this.rid = 0 as UNTRACKED_ID
			}
			return super.get(observer_id)
		}

		run(): SignalUpdateStatus {
			const updated_items = this.fn(this.rid)
			return super.setItems(updated_items_keys, updated_items_values, false) ?
				SignalUpdateStatus.UPDATED :
				SignalUpdateStatus.UNCHANGED
		}

		static create<K extends PropertyKey, V>(
			fn: RecordMemoFn<K, V>,
			config?: RecordMemoSignalConfig<K, V>
		): [
				idRecord: ID,
				getDeltaRecord: Accessor<[record: Record<K, V>, ...changed_keys: K[]]>,
			] {
			const new_signal = new this<K, V>(fn, config)
			return [
				new_signal.id,
				new_signal.bindMethod("get"),
			]
		}
	}
}
