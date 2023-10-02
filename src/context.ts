import { DEBUG, bindMethodToSelfByName, bind_array_clear, bind_array_push, bind_map_clear, bind_map_get, bind_map_set, bind_set_add, bind_set_clear, bind_set_delete, bind_set_has } from "./deps.ts"
import { hash_ids } from "./funcdefs.ts"
import { EffectFn, MemoFn, SimpleSignalInstance } from "./signal.ts"
import { EqualityFn, FROM_ID, HASHED_IDS, ID, Signal, SignalClass, SignalUpdateStatus, TO_ID, UNTRACKED_ID } from "./typedefs.ts"

// [DONE] TODO: INLINE BaseSignal class into createContext
// [DONE, see `SignalContext_Batch`] TODO: return `startBatching`, `endBatching`, and `scopedBatching` for every `createContext`'s return object
// [DONE, see `SignalContext_Dynamic`] TODO: implement `assign_fn_to_object` and etc.. with the intent of having the end user use it to dynamically modify `MemoFn`. this function must also be exported by the context
// [DONE, see `SignalContext`] in fact, consider having a `Context` class or object interface, which will include `createXYZSignal`s in a `signals` subproperty, `*Batching` in a `batch` subproperty, and (`changeFn` | `changeEffect` | etc...) in either a `dynamic` or `change` subproperty
// [DONE, see `InstanceType<SimpleSignal>.bindMethod` and its `dynamic?: boolean` parameter] also, signals which do not intend to be dynamic should not assign an `id` property to their `Accessor<T>` or `Setter<T>` or `Emmiter` (bound) functions
// [DONE] TODO: import `bindMethodToSelfByName` directly from `kitchensink_ts/binder.ts`, now that it has implemented it
// [DONE] TODO: move `SimpleSignalInstance`, and `BaseSignalConfig` to `typedefs.ts`
// TODO: implement signal swapping (with either a new signal (and the old one gets deleted), or an existing one). for a signal to be swappable, it must be of dynamic kind (ie carries `SelfIdentification`)
// [DONE, see `Context.runId`] TODO: find a better name/more descriptive name for `fireID` and `SimpleSignalInstance.fireID`
// [DONE, we now use `(ctx: Context) => SignalClass` for class factory + inheritance] TODO: figure out a better inheritance structure. currently, it is difficult to factory a subtype from an existing signal_class_factory's output, unless it is the SimpleSignalInstance that we're talking about.
//	best case suggestion: somehow uncouple signal classes from their context, which would allow one to write out the signal classes as standalone classes (ie top level, not factory-closure bound)
//	possibly, make a context class, which itself provides an interface for signals to react.
//	or, make abstraction of "contextless" signal classes, which are then wapped over a "contextful" signal class to be useful

export interface Context_Dynamic {
	setValue: <T>(id: ID, new_value: T) => void,
	setEquals: <T>(id: ID, new_equals: EqualityFn<T>) => void,
	setFn: <T>(id: ID, new_fn: MemoFn<T> | EffectFn) => void,
}

export interface Context_Batch {
	startBatching: () => number
	endBatching: () => void
	scopedBatching: <T extends any = void, ARGS extends any[] = []>(
		fn: (...args: ARGS) => T,
		...args: ARGS
	) => T
}

export class Context {
	readonly addEdge: (src_id: FROM_ID, dst_id: TO_ID) => void
	readonly delEdge: (src_id: FROM_ID, dst_id: TO_ID) => boolean
	readonly newId: () => ID
	readonly getId: (id: ID) => Signal<any> | undefined
	readonly setId: (id: ID, signal: Signal<any>) => void
	readonly delId: (id: ID) => boolean
	readonly runId: (id: ID) => boolean
	readonly addClass: <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS) => SIGNAL_CLASS["create"]
	readonly getClass: <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS) => SIGNAL_CLASS
	readonly batch: Context_Batch
	readonly dynamic: Context_Dynamic

	constructor() {
		let
			id_counter: number = 0,
			batch_nestedness = 0

		const
			fmap = new Map<FROM_ID, Set<TO_ID>>(),
			rmap = new Map<TO_ID, Set<FROM_ID>>(),
			fmap_get = bind_map_get(fmap),
			rmap_get = bind_map_get(rmap),
			fmap_set = bind_map_set(fmap),
			rmap_set = bind_map_set(rmap)

		const
			ids_to_visit_cache = new Map<HASHED_IDS, Set<ID>>(),
			ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache),
			ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache),
			ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache),
			ids_to_visit_cache_create_new_entry = (source_ids: ID[]): Set<ID> => {
				const
					to_visit = new Set<ID>(),
					to_visit_add = bind_set_add(to_visit),
					to_visit_has = bind_set_has(to_visit)
				const dfs_visiter = (id: ID) => {
					if (!to_visit_has(id)) {
						to_visit_add(id)
						fmap_get(id)?.forEach(dfs_visiter)
					}
				}
				source_ids.forEach(dfs_visiter)
				return to_visit
			},
			get_ids_to_visit = (...source_ids: ID[]): Set<ID> => {
				const hash = hash_ids(source_ids)
				return ids_to_visit_cache_get(hash) ?? (
					ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) &&
					ids_to_visit_cache_get(hash)!
				)
			}

		const
			all_signals = new Map<ID, Signal<any>>(),
			all_signals_get = bind_map_get(all_signals),
			all_signals_set = bind_map_set(all_signals)

		const
			to_visit_this_cycle = new Set<ID>(),
			to_visit_this_cycle_add = bind_set_add(to_visit_this_cycle),
			to_visit_this_cycle_delete = bind_set_delete(to_visit_this_cycle),
			to_visit_this_cycle_clear = bind_set_clear(to_visit_this_cycle),
			updated_this_cycle = new Map<ID, SignalUpdateStatus>(),
			updated_this_cycle_get = bind_map_get(updated_this_cycle),
			updated_this_cycle_set = bind_map_set(updated_this_cycle),
			updated_this_cycle_clear = bind_map_clear(updated_this_cycle),
			batched_ids: FROM_ID[] = [],
			batched_ids_push = bind_array_push(batched_ids),
			batched_ids_clear = bind_array_clear(batched_ids),
			fireUpdateCycle = (...source_ids: FROM_ID[]) => {
				to_visit_this_cycle_clear()
				updated_this_cycle_clear()
				// clone the ids to visit into the "visit cycle for this update"
				get_ids_to_visit(...source_ids).forEach(to_visit_this_cycle_add)
				// fire the signal and propagate its reactivity.
				// the souce signals are `force`d in order to skip any unresolved dependency check.
				// this is needed because although state signals do not have dependencies, effect signals may have one.
				// but effect signals are themselves designed to be fired/ran as standalone signals
				for (const source_id of source_ids) {
					propagateSignalUpdate(source_id, true)
				}
			},
			startBatching = () => (++batch_nestedness),
			endBatching = () => {
				if (--batch_nestedness <= 0) {
					batch_nestedness = 0
					fireUpdateCycle(...batched_ids_clear())
				}
			},
			scopedBatching = <T extends any = void, ARGS extends any[] = []>(
				fn: (...args: ARGS) => T,
				...args: ARGS
			): T => {
				startBatching()
				const return_value = fn(...args)
				endBatching()
				return return_value
			}

		const propagateSignalUpdate = (id: ID, force?: true | any) => {
			if (to_visit_this_cycle_delete(id)) {
				if (DEBUG.LOG) { console.log("UPDATE_CYCLE\t", "visiting   :\t", all_signals_get(id)?.name) }
				// first make sure that all of this signal's dependencies are up to date (should they be among the set of ids to visit this update cycle)
				// `any_updated_dependency` is always initially `false`. however, if the signal id was `force`d, then it would be `true`, and skip dependency checking and updating.
				// you must use `force === true` for `StateSignal`s (because they are dependency free), or for a independently fired `EffectSignal`
				let any_updated_dependency: SignalUpdateStatus = force === true ? SignalUpdateStatus.UPDATED : SignalUpdateStatus.UNCHANGED
				if (any_updated_dependency <= SignalUpdateStatus.UNCHANGED) {
					for (const dependency_id of rmap_get(id) ?? []) {
						propagateSignalUpdate(dependency_id)
						any_updated_dependency |= updated_this_cycle_get(dependency_id) ?? SignalUpdateStatus.UNCHANGED
					}
				}
				// now, depending on two AND criterias:
				// 1) at least one dependency has updated (or must be free of dependencies via `force === true`)
				// 2) AND, this signal's value has changed after the update computation (ie `run()` method)
				// if both criterias are met, then this signal should propagate forward towards its observers
				const this_signal_update_status: SignalUpdateStatus = any_updated_dependency >= SignalUpdateStatus.UPDATED ?
					(all_signals_get(id)?.run() ?? SignalUpdateStatus.UNCHANGED) :
					any_updated_dependency as (SignalUpdateStatus.UNCHANGED | SignalUpdateStatus.ABORTED)
				updated_this_cycle_set(id, this_signal_update_status)
				if (DEBUG.LOG) { console.log("UPDATE_CYCLE\t", this_signal_update_status > 0 ? "propagating:\t" : this_signal_update_status < 0 ? "delaying    \t" : "blocking   :\t", all_signals_get(id)?.name) }
				if (this_signal_update_status >= SignalUpdateStatus.UPDATED) {
					fmap_get(id)?.forEach(propagateSignalUpdate)
				} else if (this_signal_update_status <= SignalUpdateStatus.ABORTED) {
					batched_ids_push(id)
				}
			}
		}

		this.addEdge = (src_id: FROM_ID, dst_id: TO_ID) => {
			const forward_items = fmap_get(src_id) ?? (
				fmap_set(src_id, new Set()) &&
				fmap_get(src_id)!
			)
			if (!forward_items.has(dst_id)) {
				forward_items.add(dst_id)
				if (!rmap_get(dst_id)?.add(src_id)) {
					rmap_set(dst_id, new Set([src_id]))
				}
			}
		}
		this.delEdge = undefined

		this.newId = () => {
			// clear the `ids_to_visit_cache`, because the old cache won't include this new signal in any of this signal's dependency pathways.
			// the pathway (ie DFS) has to be re-discovered for this new signal to be included in it
			ids_to_visit_cache_clear()
			return ++id_counter
		}
		this.getId = all_signals_get
		this.setId = all_signals_set
		this.delId = undefined
		this.runId = (id: ID): boolean => {
			const will_fire_immediately = batch_nestedness <= 0
			if (will_fire_immediately) {
				fireUpdateCycle(id)
				return true
			}
			batched_ids_push(id)
			return false
		}

		const
			class_record: Map<(ctx: Context) => SignalClass, SignalClass> = new Map(),
			class_record_get = bind_map_get(class_record),
			class_record_set = bind_map_set(class_record)
		this.addClass = <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS): SIGNAL_CLASS["create"] => {
			const signal_class = this.getClass(factory_fn)
			return bindMethodToSelfByName<SIGNAL_CLASS, "create", any, any>(signal_class, "create") as SIGNAL_CLASS["create"]
		}
		this.getClass = <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS): SIGNAL_CLASS => {
			let signal_class = class_record_get(factory_fn) as SIGNAL_CLASS
			if (signal_class) {
				return signal_class
			}
			signal_class = factory_fn(this)
			class_record_set(factory_fn, signal_class)
			return signal_class
		}
		this.batch = { startBatching, endBatching, scopedBatching }
		this.dynamic = {
			setValue: <T>(id: ID, new_value: T) => {
				const signal = all_signals_get(id ?? 0 as UNTRACKED_ID) as SimpleSignalInstance | undefined
				if (signal) { signal.value = new_value }
			},
			setEquals: <T>(id: ID, new_equals: EqualityFn<T>) => {
				const signal = all_signals_get(id ?? 0 as UNTRACKED_ID) as SimpleSignalInstance | undefined
				if (signal) { (signal.equals as EqualityFn<T>) = new_equals }
			},
			setFn: <T>(id: ID, new_fn: MemoFn<T> | EffectFn) => {
				const signal = all_signals_get(id ?? 0 as UNTRACKED_ID) as SimpleSignalInstance | undefined
				if (signal) { signal.fn = new_fn }
			}
		}
	}
}
