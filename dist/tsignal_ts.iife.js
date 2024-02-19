"use strict";
(() => {
  // node_modules/kitchensink_ts/esm/_dnt.polyfills.js
  if (!Object.hasOwn) {
    Object.defineProperty(Object, "hasOwn", {
      value: function(object, property) {
        if (object == null) {
          throw new TypeError("Cannot convert undefined or null to object");
        }
        return Object.prototype.hasOwnProperty.call(Object(object), property);
      },
      configurable: true,
      enumerable: false,
      writable: true
    });
  }

  // node_modules/kitchensink_ts/esm/builtin_aliases_deps.js
  var noop = () => {
  };
  var string_fromCharCode = String.fromCharCode;
  var promise_resolve = /* @__PURE__ */ Promise.resolve.bind(Promise);
  var promise_reject = /* @__PURE__ */ Promise.reject.bind(Promise);
  var promise_forever = () => new Promise(noop);
  var { from: array_from, isArray: array_isArray, of: array_of } = Array;
  var { isInteger: number_isInteger, MAX_VALUE: number_MAX_VALUE, NEGATIVE_INFINITY: number_NEGATIVE_INFINITY, POSITIVE_INFINITY: number_POSITIVE_INFINITY } = Number;
  var { assign: object_assign, defineProperty: object_defineProperty, entries: object_entries, fromEntries: object_fromEntries, keys: object_keys, getPrototypeOf: object_getPrototypeOf, values: object_values } = Object;
  var date_now = Date.now;
  var { iterator: symbol_iterator, toStringTag: symbol_toStringTag } = Symbol;

  // node_modules/kitchensink_ts/esm/struct.js
  var prototypeOfClass = (cls) => cls.prototype;
  var monkeyPatchPrototypeOfClass = (cls, key, value) => {
    object_defineProperty(prototypeOfClass(cls), key, { value });
  };

  // node_modules/kitchensink_ts/esm/binder.js
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
  var bind_map_delete = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "delete");
  var bind_map_get = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "get");
  var bind_map_set = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "set");

  // node_modules/kitchensink_ts/esm/numericmethods.js
  var modulo = (value, mod) => (value % mod + mod) % mod;

  // node_modules/kitchensink_ts/esm/collections.js
  var _a;
  var Deque = class {
    /** a double-ended circular queue, similar to python's `collection.deque` <br>
     * @param length maximum length of the queue. <br>
     * pushing more items than the length will remove the items from the opposite side, so as to maintain the size
    */
    constructor(length) {
      Object.defineProperty(this, "length", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: length
      });
      Object.defineProperty(this, "items", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
      Object.defineProperty(this, "front", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 0
      });
      Object.defineProperty(this, "back", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
      Object.defineProperty(this, "count", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 0
      });
      this.items = Array(length);
      this.back = length - 1;
    }
    /** inserts one or more items to the back of the deque. <br>
     * if the deque is full, it will remove the front item before adding a new item
    */
    pushBack(...items) {
      for (const item of items) {
        if (this.count === this.length)
          this.popFront();
        this.items[this.back] = item;
        this.back = modulo(this.back - 1, this.length);
        this.count++;
      }
    }
    /** inserts one or more items to the front of the deque. <br>
     * if the deque is full, it will remove the rear item before adding a new item
    */
    pushFront(...items) {
      for (const item of items) {
        if (this.count === this.length)
          this.popBack();
        this.items[this.front] = item;
        this.front = modulo(this.front + 1, this.length);
        this.count++;
      }
    }
    /** get the item at the back of the deque without removing/popping it */
    getBack() {
      if (this.count === 0)
        return void 0;
      return this.items[modulo(this.back + 1, this.length)];
    }
    /** get the item at the front of the deque without removing/popping it */
    getFront() {
      if (this.count === 0)
        return void 0;
      return this.items[modulo(this.front - 1, this.length)];
    }
    /** removes/pops the item at the back of the deque and returns it */
    popBack() {
      if (this.count === 0)
        return void 0;
      this.back = modulo(this.back + 1, this.length);
      const item = this.items[this.back];
      this.items[this.back] = void 0;
      this.count--;
      return item;
    }
    /** removes/pops the item at the front of the deque and returns it */
    popFront() {
      if (this.count === 0)
        return void 0;
      this.front = modulo(this.front - 1, this.length);
      const item = this.items[this.front];
      this.items[this.front] = void 0;
      this.count--;
      return item;
    }
    /** rotates the deque `steps` number of positions to the right. <br>
     * if `steps` is negative, then it will rotate in the left direction. <br>
     * when the deque is not empty, rotating with `step = 1` is equivalent to `this.pushBack(this.popFront())`
    */
    rotate(steps) {
      const { front, back, length, count, items } = this;
      if (count === 0)
        return;
      steps = modulo(steps, count);
      if (count < length) {
        for (let i = 0; i < steps; i++) {
          const b = modulo(back - i, length), f = modulo(front - i - 1, length);
          items[b] = items[f];
          items[f] = void 0;
        }
      }
      this.front = modulo(front - steps, length);
      this.back = modulo(back - steps, length);
    }
    /** reverses the order of the items in the deque. */
    reverse() {
      const center = this.count / 2 | 0, { length, front, back, items } = this;
      for (let i = 1; i <= center; i++) {
        const b = modulo(back + i, length), f = modulo(front - i, length), temp = items[b];
        items[b] = items[f];
        items[f] = temp;
      }
    }
    /** provide an index with relative to `this.back + 1`, and get the appropriate resolved index `i` that can be used to retrieve `this.items[i]`. <br>
     * example: `this.items[this.resolveIndex(0)] === "rear most element of the deque"`
     * example: `this.items[this.resolveIndex(5)] === "fifth element ahead of the rear of the deque"`
    */
    resolveIndex(index) {
      return modulo(this.back + index + 1, this.length);
    }
    /** returns the item at the specified index.
     * @param index The index of the item to retrieve, relative to the rear-most element
     * @returns The item at the specified index, or `undefined` if the index is out of range
    */
    at(index) {
      return this.items[this.resolveIndex(index)];
    }
    /** replaces the item at the specified index with a new item. */
    replace(index, item) {
      this.items[modulo(this.back + index + 1, this.count)] = item;
    }
    /** inserts an item at the specified index, shifting all items ahead of it one position to the front. <br>
     * if the deque is full, it removes the front item before adding the new item.
    */
    insert(index, item) {
      if (this.count === this.length)
        this.popFront();
      const i = this.resolveIndex(index);
      for (let j = this.front; j > i; j--)
        this.items[j] = this.items[j - 1];
      this.items[i] = item;
      this.count++;
    }
  };
  _a = Deque;
  (() => {
    /* @__PURE__ */ monkeyPatchPrototypeOfClass(_a, symbol_iterator, function() {
      const count = this.count;
      let i = 0;
      return {
        next: () => i < count ? { value: this.at(i++), done: false } : { value: void 0, done: true }
      };
    });
  })();

  // node_modules/kitchensink_ts/esm/lambda.js
  var THROTTLE_REJECT = /* @__PURE__ */ Symbol("a rejection by a throttled function");
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
  var parseEquality = (equals) => equals === false ? falsey_equality : equals ?? default_equality;
  var throttlingEquals = (delta_time_ms, base_equals) => {
    const base_equals_fn = parseEquality(base_equals), throttled_equals = throttle(delta_time_ms, base_equals_fn);
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
        this.equals = parseEquality(equals);
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
      run(forced) {
        return forced ? 1 /* UPDATED */ : 0 /* UNCHANGED */;
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
      // TODO: consider whether or not MemoSignals should be able to be forced to fire independently
      run(forced) {
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
      run(forced) {
        return this.dirty = 1;
      }
      get(observer_id) {
        if (this.rid || this.dirty) {
          super.set(this.fn(this.rid));
          this.dirty = 0;
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
       * TODO: reconsider, because you can also check for `this.rid !== 0` to determine that `this.fn` effect function has never run before, thus it must run at least once if the observer is not untracked_id
       * is it really necessary for us to rerun `this.fn` effect function for every new observer? it seems to create chaos rather than reducing it.
       * UPDATE: decided NOT to re-run on every new observer
       * TODO: cleanup this messy doc and redeclare how createEffect works
      */
      get(observer_id) {
        if (observer_id) {
          if (this.rid) {
            this.run();
          }
          super.get(observer_id);
        }
      }
      set() {
        const effect_will_fire_immediately = runId(this.id);
        return effect_will_fire_immediately;
      }
      run(forced) {
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

  // src/async_signal.ts
  var AsyncStateSignal_Factory = (ctx) => {
    const runId = ctx.runId;
    return class AsyncStateSignal extends ctx.getClass(SimpleSignal_Factory) {
      /** previous pending promise */
      promise;
      constructor(value, config) {
        super(value, config);
      }
      setPromise(new_value, rejectable = false) {
        const _this = this, new_value_is_updater = typeof new_value === "function" && !(new_value instanceof Promise);
        new_value = new_value_is_updater ? new_value(_this.value) : new_value;
        if (new_value instanceof Promise) {
          return (_this.promise = new_value).then(
            // on promise resolved
            (value) => {
              if (_this.promise === new_value) {
                _this.promise = void 0;
                return _this.setPromise(value, rejectable);
              }
              return promise_forever();
            },
            // on promise rejected
            (reason) => {
              if (_this.promise === new_value) {
                _this.promise = void 0;
              }
              return rejectable ? promise_reject(reason) : promise_forever();
            }
          );
        }
        const value_has_changed = super.set(new_value);
        if (value_has_changed) {
          runId(this.id);
        }
        return promise_resolve(new_value);
      }
      run(forced) {
        return this.promise ? -1 /* ABORTED */ : super.run(forced);
      }
      static create(value, config) {
        const new_signal = new this(value, config);
        return [
          new_signal.id,
          new_signal.bindMethod("get"),
          new_signal.bindMethod("setPromise")
        ];
      }
    };
  };

  // src/context.ts
  var Context = class {
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
      const fmap = /* @__PURE__ */ new Map(), rmap = /* @__PURE__ */ new Map(), fmap_get = bind_map_get(fmap), rmap_get = bind_map_get(rmap), fmap_set = bind_map_set(fmap), rmap_set = bind_map_set(rmap), fmap_delete = bind_map_delete(fmap), rmap_delete = bind_map_delete(rmap);
      const ids_to_visit_cache = /* @__PURE__ */ new Map(), ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache), ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache), ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache);
      const ids_to_visit_cache_create_new_entry = (source_ids) => {
        const to_visit = /* @__PURE__ */ new Set(), to_visit_add = bind_set_add(to_visit), to_visit_has = bind_set_has(to_visit);
        const dfs_visitor = (id) => {
          if (!to_visit_has(id)) {
            fmap_get(id)?.forEach(dfs_visitor);
            to_visit_add(id);
          }
        };
        source_ids.forEach(dfs_visitor);
        source_ids.forEach(bind_set_delete(to_visit));
        return [...to_visit, ...source_ids].reverse();
      };
      const get_ids_to_visit = (...source_ids) => {
        const hash = hash_ids(source_ids);
        return ids_to_visit_cache_get(hash) ?? (ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) && ids_to_visit_cache_get(hash));
      };
      const all_signals = /* @__PURE__ */ new Map(), all_signals_get = bind_map_get(all_signals), all_signals_set = bind_map_set(all_signals), all_signals_delete = bind_map_delete(all_signals);
      const next_to_visit_this_cycle = /* @__PURE__ */ new Set(), next_to_visit_this_cycle_add = bind_set_add(next_to_visit_this_cycle), next_to_visit_this_cycle_delete = bind_set_delete(next_to_visit_this_cycle), next_to_visit_this_cycle_clear = bind_set_clear(next_to_visit_this_cycle);
      const not_to_visit_this_cycle = /* @__PURE__ */ new Set(), not_to_visit_this_cycle_add = bind_set_add(not_to_visit_this_cycle), not_to_visit_this_cycle_has = bind_set_has(not_to_visit_this_cycle), not_to_visit_this_cycle_clear = bind_set_clear(not_to_visit_this_cycle);
      const status_this_cycle = /* @__PURE__ */ new Map(), status_this_cycle_set = /* @__PURE__ */ bind_map_set(status_this_cycle), status_this_cycle_clear = /* @__PURE__ */ bind_map_clear(status_this_cycle);
      const postruns_this_cycle = [], postruns_this_cycle_push = bind_array_push(postruns_this_cycle), postruns_this_cycle_clear = bind_array_pop(postruns_this_cycle);
      const fireUpdateCycle = (...source_ids) => {
        next_to_visit_this_cycle_clear();
        not_to_visit_this_cycle_clear();
        if (0 /* LOG */) {
          /* @__PURE__ */ status_this_cycle_clear();
        }
        source_ids.forEach(next_to_visit_this_cycle_add);
        let number_of_forced_ids = source_ids.length;
        const topological_ids = get_ids_to_visit(...source_ids);
        for (const source_id of topological_ids) {
          if (next_to_visit_this_cycle_delete(source_id) && !not_to_visit_this_cycle_has(source_id)) {
            const signal_update_status = executeSignal(source_id, number_of_forced_ids-- > 0);
            if (signal_update_status !== 0 /* UNCHANGED */) {
              fmap_get(source_id)?.forEach(
                signal_update_status >= 1 /* UPDATED */ ? next_to_visit_this_cycle_add : not_to_visit_this_cycle_add
              );
            }
            if (0 /* LOG */) {
              status_this_cycle_set(source_id, signal_update_status);
            }
          }
          if (next_to_visit_this_cycle.size <= 0) {
            break;
          }
        }
        if (0 /* LOG */) {
          console.log("topological visiting ordering: ", [...status_this_cycle].map(([id, status]) => {
            return [all_signals_get(id).name, status];
          }));
        }
        if (0 /* LOG */) {
          console.log("UPDATE_POSTRUNS:	", postruns_this_cycle);
        }
        let postrun_id;
        while (postrun_id = postruns_this_cycle_clear()) {
          all_signals_get(postrun_id)?.postrun();
        }
      };
      const executeSignal = (id, force) => {
        const forced = force === true, this_signal = all_signals_get(id), this_signal_update_status = this_signal?.run(forced) ?? 0 /* UNCHANGED */;
        if (this_signal_update_status >= 1 /* UPDATED */ && this_signal.postrun) {
          postruns_this_cycle_push(id);
        }
        return this_signal_update_status;
      };
      const batched_ids = [], batched_ids_push = bind_array_push(batched_ids), batched_ids_clear = bind_array_clear(batched_ids);
      const startBatching = () => ++batch_nestedness;
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
        const forward_items = fmap_get(src_id) ?? (fmap_set(src_id, /* @__PURE__ */ new Set()) && fmap_get(src_id));
        if (!forward_items.has(dst_id)) {
          forward_items.add(dst_id);
          if (!rmap_get(dst_id)?.add(src_id)) {
            rmap_set(dst_id, /* @__PURE__ */ new Set([src_id]));
          }
          ids_to_visit_cache_clear();
          return true;
        }
        return false;
      };
      this.delEdge = (src_id, dst_id) => {
        if (fmap_get(src_id)?.delete(dst_id) && rmap_get(dst_id)?.delete(src_id)) {
          ids_to_visit_cache_clear();
          return true;
        }
        return false;
      };
      this.newId = () => {
        ids_to_visit_cache_clear();
        return ++id_counter;
      };
      this.getId = all_signals_get;
      this.setId = all_signals_set;
      this.delId = (id) => {
        if (all_signals_delete(id)) {
          const forward_items = fmap_get(id), reverse_items = rmap_get(id);
          forward_items?.forEach((dst_id) => {
            rmap_get(dst_id)?.delete(id);
          });
          reverse_items?.forEach((src_id) => {
            fmap_get(src_id)?.delete(id);
          });
          forward_items?.clear();
          reverse_items?.clear();
          fmap_delete(id);
          rmap_delete(id);
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

  // src/record_signal.ts
  var RecordSignal_Factory = (ctx) => {
    return class RecordSignal extends ctx.getClass(SimpleSignal_Factory) {
      constructor(base_record = {}, config) {
        const record_is_array = array_isArray(base_record), empty_instance_of_record = record_is_array ? [] : {}, keys = record_is_array ? [...base_record.keys()] : object_keys(base_record), values = record_is_array ? [...base_record.values()] : object_values(base_record);
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
      run(forced) {
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
})();
