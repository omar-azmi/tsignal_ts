// src/deps/deno.land/x/kitchensink_ts@v0.7.0/builtin_aliases_deps.ts
var {
  from: array_from,
  isArray: array_isArray,
  of: array_of
} = Array;
var string_fromCharCode = String.fromCharCode;
var promise_resolve = Promise.resolve;
var {
  isInteger: number_isInteger,
  MAX_VALUE: number_MAX_VALUE,
  NEGATIVE_INFINITY: number_NEGATIVE_INFINITY,
  POSITIVE_INFINITY: number_POSITIVE_INFINITY
} = Number;
var {
  assign: object_assign,
  keys: object_keys,
  getPrototypeOf: object_getPrototypeOf,
  values: object_values
} = Object;
var date_now = Date.now;
var {
  iterator: symbol_iterator,
  toStringTag: symbol_toStringTag
} = Symbol;
var noop = () => {
};

// src/deps/deno.land/x/kitchensink_ts@v0.7.0/struct.ts
var prototypeOfClass = (cls) => cls.prototype;

// src/deps/deno.land/x/kitchensink_ts@v0.7.0/binder.ts
var bindMethodFactoryByName = (instance, method_name, ...args) => {
  return (thisArg) => {
    return instance[method_name].bind(thisArg, ...args);
  };
};
var bindMethodToSelfByName = (self, method_name, ...args) => self[method_name].bind(self, ...args);
var array_proto = /* @__PURE__ */ prototypeOfClass(Array);
var map_proto = /* @__PURE__ */ prototypeOfClass(Map);
var set_proto = /* @__PURE__ */ prototypeOfClass(Set);
var bind_array_pop = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "pop");
var bind_array_push = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "push");
var bind_array_clear = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "splice", 0);
var bind_set_add = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "add");
var bind_set_clear = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "clear");
var bind_set_delete = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "delete");
var bind_set_has = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "has");
var bind_map_clear = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "clear");
var bind_map_get = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "get");
var bind_map_set = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "set");

// src/deps/deno.land/x/kitchensink_ts@v0.7.0/browser.ts
var THROTTLE_REJECT = Symbol("a rejection by a throttled function");
var throttle = (delta_time_ms, fn) => {
  let last_call = 0;
  return (...args) => {
    const time_now = date_now();
    if (time_now - last_call > delta_time_ms) {
      last_call = time_now;
      return fn(...args);
    }
    return THROTTLE_REJECT;
  };
};

// src/funcdefs.ts
var default_equality = (v1, v2) => v1 === v2;
var falsey_equality = (v1, v2) => false;
var throttlingEquals = (delta_time_ms, base_equals) => {
  const base_equals_fn = base_equals === false ? falsey_equality : base_equals ?? default_equality, throttled_equals = throttle(delta_time_ms, base_equals_fn);
  return (prev_value, new_value) => {
    const is_equal = throttled_equals(prev_value, new_value);
    return is_equal === THROTTLE_REJECT ? true : is_equal;
  };
};
var hash_ids = (ids) => {
  const sqrt_len = ids.length ** 0.5;
  return ids.reduce((sum, id) => sum + id * (id + sqrt_len), 0);
};
var log_get_request = 0 /* LOG */ ? (all_signals_get, observed_id, observer_id) => {
  const observed_signal = all_signals_get(observed_id), observer_signal = observer_id ? all_signals_get(observer_id) : { name: "untracked" };
  console.log(
    "GET:	",
    observed_signal.name,
    "	by OBSERVER:	",
    observer_signal.name,
    // @ts-ignore:
    "	with VALUE	",
    observed_signal.value
  );
} : noop;

// src/context.ts
var Context = class {
  addEdge;
  delEdge;
  newId;
  getId;
  setId;
  delId;
  runId;
  addClass;
  getClass;
  batch;
  dynamic;
  constructor() {
    let id_counter = 0, batch_nestedness = 0;
    const fmap = /* @__PURE__ */ new Map(), rmap = /* @__PURE__ */ new Map(), fmap_get = bind_map_get(fmap), rmap_get = bind_map_get(rmap), fmap_set = bind_map_set(fmap), rmap_set = bind_map_set(rmap);
    const ids_to_visit_cache = /* @__PURE__ */ new Map(), ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache), ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache), ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache), ids_to_visit_cache_create_new_entry = (source_ids) => {
      const to_visit = /* @__PURE__ */ new Set(), to_visit_add = bind_set_add(to_visit), to_visit_has = bind_set_has(to_visit);
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
      return ids_to_visit_cache_get(hash) ?? (ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) && ids_to_visit_cache_get(hash));
    };
    const all_signals = /* @__PURE__ */ new Map(), all_signals_get = bind_map_get(all_signals), all_signals_set = bind_map_set(all_signals);
    const to_visit_this_cycle = /* @__PURE__ */ new Set(), to_visit_this_cycle_add = bind_set_add(to_visit_this_cycle), to_visit_this_cycle_delete = bind_set_delete(to_visit_this_cycle), to_visit_this_cycle_clear = bind_set_clear(to_visit_this_cycle), updated_this_cycle = /* @__PURE__ */ new Map(), updated_this_cycle_get = bind_map_get(updated_this_cycle), updated_this_cycle_set = bind_map_set(updated_this_cycle), updated_this_cycle_clear = bind_map_clear(updated_this_cycle), postruns_this_cycle = [], postruns_this_cycle_push = bind_array_push(postruns_this_cycle), postruns_this_cycle_clear = bind_array_pop(postruns_this_cycle), batched_ids = [], batched_ids_push = bind_array_push(batched_ids), batched_ids_clear = bind_array_clear(batched_ids), fireUpdateCycle = (...source_ids) => {
      to_visit_this_cycle_clear();
      updated_this_cycle_clear();
      get_ids_to_visit(...source_ids).forEach(to_visit_this_cycle_add);
      for (const source_id of source_ids) {
        propagateSignalUpdate(source_id, true);
      }
      if (0 /* LOG */) {
        console.log("UPDATE_POSTRUNS:	", postruns_this_cycle);
      }
      let postrun_id;
      while (postrun_id = postruns_this_cycle_clear()) {
        all_signals_get(postrun_id)?.postrun();
      }
    }, startBatching = () => ++batch_nestedness, endBatching = () => {
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
        const this_signal = all_signals_get(id);
        if (0 /* LOG */) {
          console.log("UPDATE_CYCLE	", "visiting   :	", this_signal?.name);
        }
        let any_updated_dependency = force === true ? 1 /* UPDATED */ : 0 /* UNCHANGED */;
        if (any_updated_dependency <= 0 /* UNCHANGED */) {
          for (const dependency_id of rmap_get(id) ?? []) {
            propagateSignalUpdate(dependency_id);
            any_updated_dependency |= updated_this_cycle_get(dependency_id) ?? 0 /* UNCHANGED */;
          }
        }
        let this_signal_update_status = any_updated_dependency;
        if (this_signal_update_status >= 1 /* UPDATED */) {
          this_signal_update_status = this_signal?.run() ?? 0 /* UNCHANGED */;
          if (this_signal_update_status >= 1 /* UPDATED */) {
            if (this_signal.postrun) {
              postruns_this_cycle_push(id);
            }
          }
        }
        updated_this_cycle_set(id, this_signal_update_status);
        if (0 /* LOG */) {
          console.log("UPDATE_CYCLE	", this_signal_update_status > 0 ? "propagating:	" : this_signal_update_status < 0 ? "delaying    	" : "blocking   :	", this_signal?.name);
        }
        if (this_signal_update_status >= 1 /* UPDATED */) {
          fmap_get(id)?.forEach(propagateSignalUpdate);
        } else if (this_signal_update_status <= -1 /* ABORTED */) {
          batched_ids_push(id);
        }
      }
    };
    this.addEdge = (src_id, dst_id) => {
      const forward_items = fmap_get(src_id) ?? (fmap_set(src_id, /* @__PURE__ */ new Set()) && fmap_get(src_id));
      if (!forward_items.has(dst_id)) {
        forward_items.add(dst_id);
        if (!rmap_get(dst_id)?.add(src_id)) {
          rmap_set(dst_id, /* @__PURE__ */ new Set([src_id]));
        }
      }
    };
    this.delEdge = void 0;
    this.newId = () => {
      ids_to_visit_cache_clear();
      return ++id_counter;
    };
    this.getId = all_signals_get;
    this.setId = all_signals_set;
    this.delId = void 0;
    this.runId = (id) => {
      const will_fire_immediately = batch_nestedness <= 0;
      if (will_fire_immediately) {
        fireUpdateCycle(id);
        return true;
      }
      batched_ids_push(id);
      return false;
    };
    const class_record = /* @__PURE__ */ new Map(), class_record_get = bind_map_get(class_record), class_record_set = bind_map_set(class_record);
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
};

// src/signal.ts
var SimpleSignal_Factory = (ctx) => {
  const { newId, getId, setId, addEdge } = ctx;
  return class SimpleSignal {
    constructor(value, {
      name,
      equals
    } = {}) {
      const id = newId();
      setId(id, this);
      this.id = id;
      this.rid = id;
      this.name = name;
      this.value = value;
      this.equals = equals === false ? falsey_equality : equals ?? default_equality;
    }
    get(observer_id) {
      if (observer_id) {
        addEdge(this.id, observer_id);
      }
      if (0 /* LOG */) {
        log_get_request(getId, this.id, observer_id);
      }
      return this.value;
    }
    set(new_value) {
      const old_value = this.value;
      return !this.equals(old_value, this.value = typeof new_value === "function" ? new_value(old_value) : new_value);
    }
    run() {
      return 1 /* UPDATED */;
    }
    bindMethod(method_name) {
      return bindMethodToSelfByName(this, method_name);
    }
    static create(...args) {
      const new_signal = new this(...args);
      return [new_signal.id, new_signal];
    }
  };
};
var StateSignal_Factory = (ctx) => {
  const runId = ctx.runId;
  return class StateSignal extends ctx.getClass(SimpleSignal_Factory) {
    constructor(value, config) {
      super(value, config);
    }
    set(new_value) {
      const value_has_changed = super.set(new_value);
      if (value_has_changed) {
        runId(this.id);
        return true;
      }
      return false;
    }
    static create(value, config) {
      const new_signal = new this(value, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.bindMethod("set")
      ];
    }
  };
};
var MemoSignal_Factory = (ctx) => {
  return class MemoSignal extends ctx.getClass(SimpleSignal_Factory) {
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
    run() {
      return super.set(this.fn(this.rid)) ? 1 /* UPDATED */ : 0 /* UNCHANGED */;
    }
    static create(fn, config) {
      const new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get")
      ];
    }
  };
};
var LazySignal_Factory = (ctx) => {
  return class LazySignal extends ctx.getClass(SimpleSignal_Factory) {
    constructor(fn, config) {
      super(config?.value, config);
      this.fn = fn;
      this.dirty = 1;
      if (config?.defer === false) {
        this.get();
      }
    }
    run() {
      return this.dirty = 1;
    }
    get(observer_id) {
      if (this.rid || this.dirty) {
        super.set(this.fn(this.rid));
        this.dirty = 1;
        this.rid = 0;
      }
      return super.get(observer_id);
    }
    static create(fn, config) {
      const new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get")
      ];
    }
  };
};
var EffectSignal_Factory = (ctx) => {
  const runId = ctx.runId;
  return class EffectSignal extends ctx.getClass(SimpleSignal_Factory) {
    constructor(fn, config) {
      super(void 0, config);
      this.fn = fn;
      if (config?.defer === false) {
        this.set();
      }
    }
    /** a non-untracked observer (which is what all new observers are) depending on an effect signal will result in the triggering of effect function.
     * this is an intentional design choice so that effects can be scaffolded on top of other effects.
    */
    get(observer_id) {
      if (observer_id) {
        this.run();
        super.get(observer_id);
      }
    }
    set() {
      const effect_will_fire_immediately = runId(this.id);
      return effect_will_fire_immediately;
    }
    run() {
      const signal_should_propagate = this.fn(this.rid) !== false;
      if (this.rid) {
        this.rid = 0;
      }
      return signal_should_propagate ? 1 /* UPDATED */ : 0 /* UNCHANGED */;
    }
    static create(fn, config) {
      const new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.bindMethod("set")
      ];
    }
  };
};

// src/mapped_signal.ts
var RecordSignal_Factory = (ctx) => {
  return class RecordSignal extends ctx.getClass(SimpleSignal_Factory) {
    constructor(base_record = {}, config) {
      const record_is_array = array_isArray(base_record), empty_instance_of_record = record_is_array ? [] : {}, keys = record_is_array ? [...base_record.keys()] : object_keys(base_record), values = record_is_array ? [...base_record.values()] : object_values(base_record);
      super([empty_instance_of_record], config);
      this.setItems(keys, values, false);
    }
    /*
    run(): SignalUpdateStatus {
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
        const key = keys[i], old_value = record[key], new_value = values[i], _new_value = record[key] = typeof new_value === "function" ? new_value(old_value) : new_value, value_has_changed = !equals(old_value, _new_value);
        if (value_has_changed) {
          delta_record.push(key);
        }
      }
      const delta_record_final_len = delta_record.length;
      return !ignore && delta_record_final_len - delta_record_initial_len > 0;
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
      return !ignore && delta_record_final_len - delta_record_initial_len > 0;
    }
  };
};
var RecordStateSignal_Factory = (ctx) => {
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
        new_signal.bindMethod("deleteKeys")
      ];
    }
  };
};
var RecordMemoSignal_Factory = (ctx) => {
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
    run() {
      const [set_keys, set_values, propagate = true] = this.fn(this.rid);
      return propagate && super.setItems(set_keys, set_values) ? 1 /* UPDATED */ : 0 /* UNCHANGED */;
    }
    static create(fn, config) {
      const new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get")
      ];
    }
  };
};
export {
  Context,
  EffectSignal_Factory,
  LazySignal_Factory,
  MemoSignal_Factory,
  RecordMemoSignal_Factory,
  RecordSignal_Factory,
  RecordStateSignal_Factory,
  SimpleSignal_Factory,
  StateSignal_Factory,
  default_equality,
  falsey_equality,
  throttlingEquals
};
