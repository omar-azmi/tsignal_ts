/** a context is required for any signal to be functional
 * @module
*/
import { DEBUG, bindMethodToSelfByName, bind_array_clear, bind_array_pop, bind_array_push, bind_map_clear, bind_map_delete, bind_map_get, bind_map_set, bind_set_add, bind_set_clear, bind_set_delete, bind_set_has } from "./deps.js";
import { hash_ids } from "./funcdefs.js";
import { SignalUpdateStatus } from "./typedefs.js";
export class Context {
    addEdge;
    delEdge;
    newId;
    getId;
    setId;
    delId;
    runId;
    swapId;
    clearCache;
    addClass;
    getClass;
    batch;
    dynamic;
    constructor() {
        let id_counter = 0, batch_nestedness = 0;
        const fmap = new Map(), rmap = new Map(), fmap_get = bind_map_get(fmap), rmap_get = bind_map_get(rmap), fmap_set = bind_map_set(fmap), rmap_set = bind_map_set(rmap), fmap_delete = bind_map_delete(fmap), rmap_delete = bind_map_delete(rmap);
        const ids_to_visit_cache = new Map(), ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache), ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache), ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache);
        /** creates a topologically ordered array of ids to visit, when propagation is initiated from `source_ids`. <br>
         * the function ensures that `source_ids` are always put at the very beginning of the retuned value,
         * as this kind of ordering is of utter importance to the {@link fireUpdateCycle | `fireUpdateCycle`} function, which uses this.
         * @example
         * ```ts
         * // assume our directed acyclic graph is:
         * // A->[B,C] ; B->[D, F] ; C->[E, F] ; D->[F, G] ; E->[F, H] ; F->[I] ; G->[I] ; H->[I] ; I->[J] ;
         * console.log(ids_to_visit_cache_create_new_entry([A])) // [A, C, E, H, B, D, F, G, I, J]
         * console.log(ids_to_visit_cache_create_new_entry([B, E])) // [E, B, D, F, G, H, I, J]
         * // notice that B and E were placed first, even though enforcing it was not necessary for the array to be still considered as topologically ordered.
         * ```
        */
        const ids_to_visit_cache_create_new_entry = (source_ids) => {
            const to_visit = new Set(), to_visit_add = bind_set_add(to_visit), to_visit_has = bind_set_has(to_visit);
            const dfs_visitor = (id) => {
                if (!to_visit_has(id)) {
                    fmap_get(id)?.forEach(dfs_visitor);
                    to_visit_add(id);
                }
            };
            source_ids.forEach(dfs_visitor);
            // delete the `source_ids` from `to_visit`, as will add them later to the very beginning of the return array
            source_ids.forEach(bind_set_delete(to_visit));
            // currently, `to_visit` is in reverse-topological order, which is what you get with the type of DFS we're doing here.
            // so reverse `to_visit` to get a topologically ordered set
            return [...to_visit, ...source_ids].reverse();
        };
        /** get a topologically ordered set of ids to visit, when propagation is initiated from `source_ids`.
         * the result is cached for quicker followup retrievals.
         * see {@link ids_to_visit_cache_create_new_entry | `ids_to_visit_cache_create_new_entry`} for a better explanation.
        */
        const get_ids_to_visit = (...source_ids) => {
            const hash = hash_ids(source_ids);
            return ids_to_visit_cache_get(hash) ?? (ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) &&
                ids_to_visit_cache_get(hash));
        };
        const 
        /** contains a mapping of all signal `ID`s and their {@link Signal | signal instances} */
        all_signals = new Map(), all_signals_get = bind_map_get(all_signals), all_signals_set = bind_map_set(all_signals), all_signals_delete = bind_map_delete(all_signals);
        const 
        /** this `Set` of `ID`s is essentially a dynamic book-keeper for which signal `ID`s have had their dependency-signals declare an update,
         * and as a result, these set of `ID`s are now awaiting in queue to be executed themselves, in the follow-up update loop.
         * this technique works correctly, particularly because {@link fireUpdateCycle |update cycle's} loop is topologically ordered.
         * and so, we are guaranteed to have encountered all of a certain `ID`'s dependency-signals, before we test for its existence **here** via deletion.
        */
        next_to_visit_this_cycle = new Set(), next_to_visit_this_cycle_add = bind_set_add(next_to_visit_this_cycle), next_to_visit_this_cycle_delete = bind_set_delete(next_to_visit_this_cycle), next_to_visit_this_cycle_clear = bind_set_clear(next_to_visit_this_cycle);
        const 
        // TODO: consider whether or not aborted signals should poison only their immediate observers, or have it propagate deeply into all consequent observers.
        /** this is very similar to {@link next_to_visit_this_cycle}, except, it book-keeps which signals have been declared aborted.
         * aborted signals are never run, and they poison their immediate observers to also become aborted and not run (even if they have a dependency that has been updated).
        */
        not_to_visit_this_cycle = new Set(), not_to_visit_this_cycle_add = bind_set_add(not_to_visit_this_cycle), not_to_visit_this_cycle_has = bind_set_has(not_to_visit_this_cycle), not_to_visit_this_cycle_clear = bind_set_clear(not_to_visit_this_cycle);
        const 
        /** when {@link DEBUG.LOG | debug-logging} is turned on, this gives a summary of what has been updated,
         * and what topologically-ordered trajectory was taken for the update.
        */
        status_this_cycle = /* @__PURE__ */ new Map(), status_this_cycle_set = /* @__PURE__ */ bind_map_set(status_this_cycle), status_this_cycle_clear = /* @__PURE__ */ bind_map_clear(status_this_cycle);
        const 
        /** certain signals have cleaning up to do *after* each update cycle.
         * those callback functions are stored here, and then called in reverse order
        */
        postruns_this_cycle = [], postruns_this_cycle_push = bind_array_push(postruns_this_cycle), postruns_this_cycle_clear = bind_array_pop(postruns_this_cycle);
        const fireUpdateCycle = (...source_ids) => {
            // clear up all book-keeping artifacts from the any previous update cycle, and start anew.
            next_to_visit_this_cycle_clear();
            not_to_visit_this_cycle_clear();
            if (DEBUG.LOG) { /* @__PURE__ */
                status_this_cycle_clear();
            }
            source_ids.forEach(next_to_visit_this_cycle_add);
            /** some signals make use of the information whether of not they are the source of a cycle via the optional `forced` argument of {@link Signal.run | `Signal.run`}.
             * so we simply take a note of how many source signals we begun with, and decrement it each time in the loop.
             * this works because the first few items of {@link topological_ids} is guaranteed to be the {@link source_ids},
             * thanks to {@link get_ids_to_visit} (which guarantees this behavior).
             * the `forced` parameter is of particular importance to signals that can fire on their own, such as state signal and effect signals in [`./signal.ts`](./signal.ts).
            */
            let number_of_forced_ids = source_ids.length;
            const topological_ids = get_ids_to_visit(...source_ids);
            for (const source_id of topological_ids) {
                if (next_to_visit_this_cycle_delete(source_id) &&
                    !not_to_visit_this_cycle_has(source_id)) {
                    const signal_update_status = executeSignal(source_id, number_of_forced_ids-- > 0);
                    if (signal_update_status !== SignalUpdateStatus.UNCHANGED) {
                        fmap_get(source_id)?.forEach(signal_update_status >= SignalUpdateStatus.UPDATED ?
                            next_to_visit_this_cycle_add :
                            not_to_visit_this_cycle_add);
                    }
                    if (DEBUG.LOG) {
                        status_this_cycle_set(source_id, signal_update_status);
                    }
                }
                // if there are no remaining ids `to_visit_this_cycle`, then it is our cue to terminate early,
                // since the remaining `source_id`s will not be part of the update.
                if (next_to_visit_this_cycle.size <= 0) {
                    break;
                }
            }
            if (DEBUG.LOG) {
                console.log("topological visiting ordering: ", [...status_this_cycle].map(([id, status]) => {
                    return [all_signals_get(id).name, status];
                }));
            }
            // run all of the `postrun` cleanup methods after the end of this cycle (in reverse order of accumulation)
            if (DEBUG.LOG) {
                console.log("UPDATE_POSTRUNS:\t", postruns_this_cycle);
            }
            let postrun_id;
            while (postrun_id = postruns_this_cycle_clear()) {
                all_signals_get(postrun_id)?.postrun();
            }
        };
        const executeSignal = (id, force) => {
            const forced = force === true, this_signal = all_signals_get(id), this_signal_update_status = this_signal?.run(forced) ?? SignalUpdateStatus.UNCHANGED;
            if (this_signal_update_status >= SignalUpdateStatus.UPDATED &&
                this_signal.postrun) {
                postruns_this_cycle_push(id);
            }
            return this_signal_update_status;
        };
        const 
        /** this is used by the {@link batch | batching-functions} to collect source `ID`s, and then dispatch all at once. */
        batched_ids = [], batched_ids_push = bind_array_push(batched_ids), batched_ids_clear = bind_array_clear(batched_ids);
        const startBatching = () => (++batch_nestedness);
        const endBatching = () => {
            if (--batch_nestedness <= 0) {
                batch_nestedness = 0;
                fireUpdateCycle(...batched_ids_clear());
            }
        };
        const scopedBatching = (fn, ...args) => {
            startBatching();
            const return_value = fn(...args);
            endBatching();
            return return_value;
        };
        this.addEdge = (src_id, dst_id) => {
            if (src_id + dst_id <= 0) {
                return false;
            }
            const forward_items = fmap_get(src_id) ?? (fmap_set(src_id, new Set()) &&
                fmap_get(src_id));
            if (!forward_items.has(dst_id)) {
                forward_items.add(dst_id);
                if (!rmap_get(dst_id)?.add(src_id)) {
                    rmap_set(dst_id, new Set([src_id]));
                }
                // the visit cache must be cleared so that the updated dependency tree can be rebuilt
                ids_to_visit_cache_clear();
                return true;
            }
            return false;
        };
        this.delEdge = (src_id, dst_id) => {
            if (fmap_get(src_id)?.delete(dst_id) &&
                rmap_get(dst_id)?.delete(src_id)) {
                // the visit cache must be cleared so that the updated dependency tree can be rebuilt
                ids_to_visit_cache_clear();
                return true;
            }
            return false;
        };
        this.newId = () => {
            // clear the `ids_to_visit_cache`, because the old cache won't include this new signal in any of this signal's dependency pathways.
            // the pathway (ie DFS) has to be re-discovered for this new signal to be included in it
            ids_to_visit_cache_clear();
            return ++id_counter;
        };
        this.getId = all_signals_get;
        this.setId = all_signals_set;
        this.delId = (id) => {
            if (all_signals_delete(id)) {
                const forward_items = fmap_get(id), reverse_items = rmap_get(id);
                forward_items?.forEach((dst_id) => { rmap_get(dst_id)?.delete(id); });
                reverse_items?.forEach((src_id) => { fmap_get(src_id)?.delete(id); });
                forward_items?.clear();
                reverse_items?.clear();
                fmap_delete(id);
                rmap_delete(id);
                // the visit cache must be cleared so that the updated dependency tree can be rebuilt
                ids_to_visit_cache_clear();
                return true;
            }
            return false;
        };
        this.swapId = (id1, id2) => {
            const signal1 = all_signals_get(id1), signal2 = all_signals_get(id2);
            all_signals_set(id1, signal2);
            all_signals_set(id2, signal1);
            if (signal1) {
                signal1.id = id2;
                if (signal1.rid) {
                    signal1.rid = id2;
                }
            }
            if (signal2) {
                signal2.id = id1;
                if (signal2.rid) {
                    signal2.rid = id1;
                }
            }
            // the visit cache must be cleared so that the updated dependency tree can be rebuilt
            ids_to_visit_cache_clear();
        };
        this.clearCache = ids_to_visit_cache_clear;
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
