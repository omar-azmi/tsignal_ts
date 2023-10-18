/** record signals <br>
 * @module
*/
import { array_isArray, object_keys, object_values } from "./deps.js";
import { SimpleSignal_Factory } from "./signal.js";
import { SignalUpdateStatus } from "./typedefs.js";
export const RecordSignal_Factory = (ctx) => {
    return class RecordSignal extends ctx.getClass(SimpleSignal_Factory) {
        constructor(base_record = {}, config) {
            const record_is_array = array_isArray(base_record), empty_instance_of_record = (record_is_array ? [] : {}), keys = record_is_array ? [...base_record.keys()] : object_keys(base_record), values = record_is_array ? [...base_record.values()] : object_values(base_record);
            // @ts-ignore: `RecordSignalConfig` is not a subtype of `SimpleSignalConfig`, but we don't care and just wish to assign `config.equals as EqualityFn<V>`
            super([empty_instance_of_record], config);
            this.setItems(keys, values, false);
        }
        /*
        run(forced?: boolean): SignalUpdateStatus {
            const
                delta_record = this.value,
                record_has_changed = delta_record.length > 1
            if (record_has_changed) {
                return SignalUpdateStatus.UPDATED
            }
            return SignalUpdateStatus.UNCHANGED
        }
        */
        // at the end of every update cycle (after the changed keys inside of `delta_record` have been consumed),
        // we must clear/empty-out the changed keys to reset it for upcoming cycles
        postrun() {
            const delta_record = this.value;
            delta_record.splice(1);
        }
        // @ts-ignore:
        set(key, new_value, ignore) {
            return this.setItems([key], [new_value], ignore);
        }
        setItems(keys, values, ignore) {
            const equals = this.equals, delta_record = this.value, delta_record_initial_len = delta_record.length, record = delta_record[0], len = keys.length;
            for (let i = 0; i < len; i++) {
                const key = keys[i], old_value = record[key], new_value = values[i], _new_value = record[key] = typeof new_value === "function" ?
                    new_value(old_value) :
                    new_value, value_has_changed = !equals(old_value, _new_value);
                if (value_has_changed) {
                    delta_record.push(key);
                }
            }
            const delta_record_final_len = delta_record.length;
            return !ignore && (delta_record_final_len - delta_record_initial_len) > 0;
        }
        delete(key, ignore) {
            return this.deleteKeys([key], ignore);
        }
        deleteKeys(keys, ignore) {
            const delta_record = this.value, delta_record_initial_len = delta_record.length, record = delta_record[0];
            for (const key of keys) {
                if (key in record) {
                    delete record[key];
                    delta_record.push(key);
                }
            }
            const delta_record_final_len = delta_record.length;
            return !ignore && (delta_record_final_len - delta_record_initial_len) > 0;
        }
    };
};
export const RecordStateSignal_Factory = (ctx) => {
    const runId = ctx.runId;
    return class RecordStateSignal extends ctx.getClass(RecordSignal_Factory) {
        setItems(keys, values, ignore) {
            return super.setItems(keys, values, ignore) ? runId(this.id) : false;
        }
        deleteKeys(keys, ignore) {
            return super.deleteKeys(keys, ignore) ? runId(this.id) : false;
        }
        static create(base_record = {}, config) {
            const new_signal = new this(base_record, config);
            return [
                new_signal.id,
                new_signal.bindMethod("get"),
                new_signal.bindMethod("set"),
                new_signal.bindMethod("setItems"),
                new_signal.bindMethod("delete"),
                new_signal.bindMethod("deleteKeys"),
            ];
        }
    };
};
export const RecordMemoSignal_Factory = (ctx) => {
    return class MemoRecordSignal extends ctx.getClass(RecordSignal_Factory) {
        constructor(fn, config) {
            super(config?.value, config);
            this.fn = fn;
            if (config?.defer === false) {
                this.get();
            }
        }
        get(observer_id) {
            if (this.rid) {
                this.run();
                this.rid = 0;
            }
            return super.get(observer_id);
        }
        run(forced) {
            const [set_keys, set_values, propagate = true] = this.fn(this.rid);
            return propagate && super.setItems(set_keys, set_values) ?
                SignalUpdateStatus.UPDATED :
                SignalUpdateStatus.UNCHANGED;
        }
        static create(fn, config) {
            const new_signal = new this(fn, config);
            return [
                new_signal.id,
                new_signal.bindMethod("get"),
            ];
        }
    };
};
// implement a `RecordLazySignal_Factory` which accumilates all changed dependency records lazily, and does not fire its update function until its `get` is called
