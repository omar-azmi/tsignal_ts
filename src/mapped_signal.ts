import { array_isArray, object_keys, object_values } from "./deps.ts"
import { Accessor, BaseMappedSignalClass, SimpleSignalConfig, ID, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.ts"


export const RecordSignal_Factory = (base_mapped_signal_class: typeof BaseMappedSignalClass) => {
	const fireID = base_mapped_signal_class.fireID

	return class RecordSignal<K extends PropertyKey, V, DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: Array<K>] = any> extends base_mapped_signal_class<K, V, DELTA_RECORD> {
		declare value: DELTA_RECORD
		declare fn: never

		constructor(
			value: Record<K, V> = {} as Record<K, V>,
			config?: SimpleSignalConfig<DELTA_RECORD>,
		) {
			const
				record_is_array = array_isArray(value),
				empty_instance_of_record = (record_is_array ? [] : {}) as Record<K, V>,
				keys = record_is_array ? [...value.keys()] : object_keys(value),
				values: V[] = record_is_array ? [...value.values()] : object_values(value)
			super([empty_instance_of_record], config)
			this.setItems(keys as K[], values, false)
		}

		private fire(): boolean {
			const
				delta_record = this.value,
				record_has_changed = delta_record.length > 1
			if (record_has_changed) {
				fireID(this.id)
				delta_record.splice(1)
				return true
			}
			return false
		}

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

		/* is there a need for this? I don't even see it as a convenience
		setEntries(...entries: [key: K, value: V | Updater<V>][]): boolean {
			const
				keys: K[] = [],
				values: (V | Updater<V>)[] = []
			entries.forEach(([key, value]) => {
				keys.push(key)
				values.push(value)
			})
			return this.setItems(keys, values)
		}
		*/

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

		static create<
			K extends PropertyKey,
			V,
			DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: Array<K>] = any
		>(
			record: DELTA_RECORD[0] = {} as DELTA_RECORD[0],
			config?: SimpleSignalConfig<DELTA_RECORD>
		): [
				idRecord: ID, getDeltaRecord: Accessor<DELTA_RECORD>,
				setRecord: (key: K, new_value: V | Updater<V>, fire?: boolean) => boolean,
				setRecords: (keys: K[], values: (V | Updater<V>)[], fire?: boolean) => boolean,
				deleteRecord: (key: K, fire?: boolean) => boolean,
				deleteRecords: (keys: K[], fire?: boolean) => boolean,
			] {
			const new_signal = new this<K, V>(record, config)
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
export type RecordMemoFn<K extends PropertyKey, V, DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: Array<K>] = any> = (observer_id: TO_ID | UNTRACKED_ID) => DELTA_RECORD | Updater<DELTA_RECORD>

export const RecordMemoSignal_Factory = (base_mapped_signal_class: typeof BaseMappedSignalClass, record_signal_class: ReturnType<typeof RecordSignal_Factory>) => {
	const fireID = base_mapped_signal_class.fireID

	return class MemoRecordSignal<K extends PropertyKey, V, DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: Array<K>] = any> extends record_signal_class<K, V, DELTA_RECORD> {
		declare value: DELTA_RECORD
		declare fn: RecordMemoFn<K, V, DELTA_RECORD>

		constructor(
			value: Record<K, V> = {} as Record<K, V>,
			config?: SimpleSignalConfig<DELTA_RECORD>,
		) {
			const
				record_is_array = array_isArray(value),
				empty_instance_of_record = (record_is_array ? [] : {}) as Record<K, V>,
				keys = record_is_array ? [...value.keys()] : object_keys(value),
				values: V[] = record_is_array ? [...value.values()] : object_values(value)
			super([empty_instance_of_record], config)
			this.setItems(keys as K[], values, false)
		}

		private fire(): boolean {
			const
				delta_record = this.value,
				record_has_changed = delta_record.length > 1
			if (record_has_changed) {
				fireID(this.id)
				delta_record.splice(1)
				return true
			}
			return false
		}

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

		/* is there a need for this? I don't even see it as a convenience
		setEntries(...entries: [key: K, value: V | Updater<V>][]): boolean {
			const
				keys: K[] = [],
				values: (V | Updater<V>)[] = []
			entries.forEach(([key, value]) => {
				keys.push(key)
				values.push(value)
			})
			return this.setItems(keys, values)
		}
		*/

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

		static create<
			K extends PropertyKey,
			V,
			DELTA_RECORD extends [record: Record<K, V>, ...changed_keys: Array<K>] = any
		>(
			record: DELTA_RECORD[0] = {} as DELTA_RECORD[0],
			config?: SimpleSignalConfig<DELTA_RECORD>
		): [
				idRecord: ID, getDeltaRecord: Accessor<DELTA_RECORD>,
				setRecord: (key: K, new_value: V | Updater<V>, fire?: boolean) => boolean,
				setRecords: (keys: K[], values: (V | Updater<V>)[], fire?: boolean) => boolean,
				deleteRecord: (key: K, fire?: boolean) => boolean,
				deleteRecords: (keys: K[], fire?: boolean) => boolean,
			] {
			const new_signal = new this<K, V>(record, config)
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
