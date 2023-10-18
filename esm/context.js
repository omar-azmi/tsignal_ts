/** a context is required for any signal to be functional
 * @module
*/
import { DEBUG, bindMethodToSelfByName, bind_array_clear, bind_array_pop, bind_array_push, bind_map_clear, bind_map_get, bind_map_set, bind_set_add, bind_set_clear, bind_set_delete, bind_set_has } from "./deps.js";
import { hash_ids } from "./funcdefs.js";
import { SignalUpdateStatus } from "./typedefs.js";
export class Context {
    constructor() {
        Object.defineProperty(this, "addEdge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "delEdge", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "newId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "setId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "delId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "runId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "addClass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getClass", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "batch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dynamic", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        let id_counter = 0, batch_nestedness = 0;
        const fmap = new Map(), rmap = new Map(), fmap_get = bind_map_get(fmap), rmap_get = bind_map_get(rmap), fmap_set = bind_map_set(fmap), rmap_set = bind_map_set(rmap);
        const ids_to_visit_cache = new Map(), ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache), ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache), ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache), ids_to_visit_cache_create_new_entry = (source_ids) => {
            const to_visit = new Set(), to_visit_add = bind_set_add(to_visit), to_visit_has = bind_set_has(to_visit);
            const dfs_visiter = (id) => {
                if (!to_visit_has(id)) {
                    to_visit_add(id);
                    fmap_get(id)?.forEach(dfs_visiter);
                }
            };
            source_ids.forEach(dfs_visiter);
            return to_visit;
        }, get_ids_to_visit = (...source_ids) => {
            const hash = hash_ids(source_ids);
            return ids_to_visit_cache_get(hash) ?? (ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) &&
                ids_to_visit_cache_get(hash));
        };
        const all_signals = new Map(), all_signals_get = bind_map_get(all_signals), all_signals_set = bind_map_set(all_signals);
        const to_visit_this_cycle = new Set(), to_visit_this_cycle_add = bind_set_add(to_visit_this_cycle), to_visit_this_cycle_delete = bind_set_delete(to_visit_this_cycle), to_visit_this_cycle_clear = bind_set_clear(to_visit_this_cycle), updated_this_cycle = new Map(), updated_this_cycle_get = bind_map_get(updated_this_cycle), updated_this_cycle_set = bind_map_set(updated_this_cycle), updated_this_cycle_clear = bind_map_clear(updated_this_cycle), postruns_this_cycle = [], postruns_this_cycle_push = bind_array_push(postruns_this_cycle), postruns_this_cycle_clear = bind_array_pop(postruns_this_cycle), batched_ids = [], batched_ids_push = bind_array_push(batched_ids), batched_ids_clear = bind_array_clear(batched_ids), fireUpdateCycle = (...source_ids) => {
            to_visit_this_cycle_clear();
            updated_this_cycle_clear();
            // clone the ids to visit into the "visit cycle for this update"
            get_ids_to_visit(...source_ids).forEach(to_visit_this_cycle_add);
            // fire the signal and propagate its reactivity.
            // the souce signals are `force`d in order to skip any unresolved dependency check.
            // this is needed because although state signals do not have dependencies, effect signals may have one.
            // but effect signals are themselves designed to be fired/ran as standalone signals
            for (const source_id of source_ids) {
                propagateSignalUpdate(source_id, true);
            }
            // run all of the `postrun` cleanup methods after the end of this cycle (in reverse order of accumulation)
            if (DEBUG.LOG) {
                console.log("UPDATE_POSTRUNS:\t", postruns_this_cycle);
            }
            let postrun_id;
            while (postrun_id = postruns_this_cycle_clear()) {
                all_signals_get(postrun_id)?.postrun();
            }
        }, startBatching = () => (++batch_nestedness), endBatching = () => {
            if (--batch_nestedness <= 0) {
                batch_nestedness = 0;
                fireUpdateCycle(...batched_ids_clear());
            }
        }, scopedBatching = (fn, ...args) => {
            startBatching();
            const return_value = fn(...args);
            endBatching();
            return return_value;
        };
        const propagateSignalUpdate = (id, force) => {
            if (to_visit_this_cycle_delete(id)) {
                const forced = force === true, this_signal = all_signals_get(id);
                if (DEBUG.LOG) {
                    console.log("UPDATE_CYCLE\t", "visiting   :\t", this_signal?.name);
                }
                // first make sure that all of this signal's dependencies are up to date (should they be among the set of ids to visit this update cycle)
                // `any_updated_dependency` is always initially `false`. however, if the signal id was `force`d, then it would be `true`, and skip dependency checking and updating.
                // you must use `force === true` for `StateSignal`s (because they are dependency free), or for a independently fired `EffectSignal`
                let any_updated_dependency = forced ? SignalUpdateStatus.UPDATED : SignalUpdateStatus.UNCHANGED;
                if (any_updated_dependency <= SignalUpdateStatus.UNCHANGED) {
                    for (const dependency_id of rmap_get(id) ?? []) {
                        propagateSignalUpdate(dependency_id);
                        any_updated_dependency |= updated_this_cycle_get(dependency_id) ?? SignalUpdateStatus.UNCHANGED;
                    }
                }
                // now, depending on two AND criterias:
                // 1) at least one dependency has updated (or must be free of dependencies via `force === true`)
                // 2) AND, this signal's value has changed after the update computation (ie `run()` method)
                // if both criterias are met, then this signal should propagate forward towards its observers
                let this_signal_update_status = any_updated_dependency;
                if (this_signal_update_status >= SignalUpdateStatus.UPDATED) {
                    this_signal_update_status = this_signal?.run(forced) ?? SignalUpdateStatus.UNCHANGED;
                    /* I think we should ignore batching aborted source-signals here. instead, we should let the source itself handle how it wishes to be batched, or when it wishes to run
                    if (this_signal_update_status <= SignalUpdateStatus.ABORTED) {
                        // we only batch source ids which result in an ABORTED signal, rather than the collateral resulting ABORTED signals as a consequence
                        batched_ids_push(id)
                    }
                    */
                }
                updated_this_cycle_set(id, this_signal_update_status);
                if (DEBUG.LOG) {
                    console.log("UPDATE_CYCLE\t", this_signal_update_status > 0 ? "propagating:\t" : this_signal_update_status < 0 ? "delaying    \t" : "blocking   :\t", this_signal?.name);
                }
                if (this_signal_update_status >= SignalUpdateStatus.UPDATED) {
                    if (this_signal.postrun) {
                        postruns_this_cycle_push(id);
                    }
                    fmap_get(id)?.forEach(propagateSignalUpdate);
                }
            }
        };
        this.addEdge = (src_id, dst_id) => {
            const forward_items = fmap_get(src_id) ?? (fmap_set(src_id, new Set()) &&
                fmap_get(src_id));
            if (!forward_items.has(dst_id)) {
                forward_items.add(dst_id);
                if (!rmap_get(dst_id)?.add(src_id)) {
                    rmap_set(dst_id, new Set([src_id]));
                }
            }
        };
        // @ts-ignore: TODO implement signal deletion
        this.delEdge = undefined;
        this.newId = () => {
            // clear the `ids_to_visit_cache`, because the old cache won't include this new signal in any of this signal's dependency pathways.
            // the pathway (ie DFS) has to be re-discovered for this new signal to be included in it
            ids_to_visit_cache_clear();
            return ++id_counter;
        };
        this.getId = all_signals_get;
        this.setId = all_signals_set;
        // @ts-ignore: TODO implement signal deletion
        this.delId = undefined;
        this.runId = (id) => {
            const will_fire_immediately = batch_nestedness <= 0;
            if (will_fire_immediately) {
                fireUpdateCycle(id);
                return true;
            }
            batched_ids_push(id);
            return false;
        };
        // we keep track of the signal classes returned by the factories and memorize them
        // this simplifies inheritance by a lot, and this way, you do not explicitly have to `addClass` of super classes
        // you can directly `addClass` of a subtype that has currently not been added, and that class with then automatically be added (via its factory function)
        const class_record = new Map(), class_record_get = bind_map_get(class_record), class_record_set = bind_map_set(class_record);
        this.addClass = (factory_fn) => {
            const signal_class = this.getClass(factory_fn);
            return bindMethodToSelfByName(signal_class, "create");
        };
        this.getClass = (factory_fn) => {
            let signal_class = class_record_get(factory_fn);
            if (signal_class) {
                return signal_class;
            }
            signal_class = factory_fn(this);
            class_record_set(factory_fn, signal_class);
            return signal_class;
        };
        this.batch = { startBatching, endBatching, scopedBatching };
        this.dynamic = {
            setValue: (id, new_value) => {
                const signal = all_signals_get(id ?? 0);
                if (signal) {
                    signal.value = new_value;
                }
            },
            setEquals: (id, new_equals) => {
                const signal = all_signals_get(id ?? 0);
                if (signal) {
                    signal.equals = new_equals;
                }
            },
            setFn: (id, new_fn) => {
                const signal = all_signals_get(id ?? 0);
                if (signal) {
                    signal.fn = new_fn;
                }
            }
        };
    }
}
