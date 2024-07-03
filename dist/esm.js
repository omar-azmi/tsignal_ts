var noop = () => {
};
var string_fromCharCode = String.fromCharCode;
var promise_resolve = /* @__PURE__ */ Promise.resolve.bind(Promise), promise_reject = /* @__PURE__ */ Promise.reject.bind(Promise), promise_forever = () => new Promise(noop);
var {
  from: array_from,
  isArray: array_isArray,
  of: array_of
} = Array, {
  MAX_VALUE: number_MAX_VALUE,
  NEGATIVE_INFINITY: number_NEGATIVE_INFINITY,
  POSITIVE_INFINITY: number_POSITIVE_INFINITY,
  isFinite: number_isFinite,
  isInteger: number_isInteger,
  isNaN: number_isNaN,
  parseFloat: number_parseFloat,
  parseInt: number_parseInt
} = Number, {
  random: math_random
} = Math, {
  assign: object_assign,
  defineProperty: object_defineProperty,
  entries: object_entries,
  fromEntries: object_fromEntries,
  keys: object_keys,
  getPrototypeOf: object_getPrototypeOf,
  values: object_values
} = Object, date_now = Date.now, {
  iterator: symbol_iterator,
  toStringTag: symbol_toStringTag
} = Symbol;
var {
  assert: console_assert,
  clear: console_clear,
  debug: console_debug,
  dir: console_dir,
  error: console_error,
  log: console_log,
  table: console_table
} = console, {
  now: performance_now
} = performance;
var prototypeOfClass = (cls) => cls.prototype;
var isFunction = (obj) => typeof obj == "function";
var bindMethodFactoryByName = (instance, method_name, ...args) => (thisArg) => instance[method_name].bind(thisArg, ...args);
var bindMethodToSelfByName = (self, method_name, ...args) => self[method_name].bind(self, ...args), array_proto = /* @__PURE__ */ prototypeOfClass(Array), map_proto = /* @__PURE__ */ prototypeOfClass(Map), set_proto = /* @__PURE__ */ prototypeOfClass(Set);
var bind_array_pop = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "pop"), bind_array_push = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "push");
var bind_array_clear = /* @__PURE__ */ bindMethodFactoryByName(array_proto, "splice", 0);
var bind_set_add = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "add"), bind_set_clear = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "clear"), bind_set_delete = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "delete");
var bind_set_has = /* @__PURE__ */ bindMethodFactoryByName(set_proto, "has");
var bind_map_clear = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "clear"), bind_map_delete = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "delete");
var bind_map_get = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "get");
var bind_map_set = /* @__PURE__ */ bindMethodFactoryByName(map_proto, "set");
var modulo = (value, mod) => (value % mod + mod) % mod;
var max = (v0, v1) => v0 > v1 ? v0 : v1;
var TREE_VALUE_UNSET = /* @__PURE__ */ Symbol(1);
var THROTTLE_REJECT = /* @__PURE__ */ Symbol(1), TIMEOUT = /* @__PURE__ */ Symbol(1);
var throttle = (delta_time_ms, fn) => {
  let last_call = 0;
  return (...args) => {
    let time_now = date_now();
    return time_now - last_call > delta_time_ms ? (last_call = time_now, fn(...args)) : THROTTLE_REJECT;
  };
};
var List = class extends Array {
  /** inserts an item at the specified index, shifting all items ahead of it one position to the front. <br>
   * negative indices are also supported for indicating the position of the newly added item _after_ the array's length has incremented.
   * 
   * @example
   * ```ts
   * const arr = new List(0, 1, 2, 3, 4)
   * arr.insert(-1, 5) // === [0, 1, 2, 3, 4, 5] // similar to pushing
   * arr.insert(-2, 4.5) // === [0, 1, 2, 3, 4, 4.5, 5]
   * arr.insert(1, 0.5) // === [0, 0.5, 1, 2, 3, 4, 4.5, 5]
   * ```
  */
  insert(index, item) {
    let i = modulo(index, this.length) + (index < 0 ? 1 : 0);
    this.splice(i, 0, item);
  }
  /** deletes an item at the specified index, shifting all items ahead of it one position to the back. <br>
   * negative indices are also supported for indicating the deletion index from the end of the array.
   * 
   * @example
   * ```ts
   * const arr = new List(0, 0.5, 1, 2, 3, 4, 4.5, 5)
   * arr.delete(-1) // === [0, 0.5, 1, 2, 3, 4, 4.5] // similar to popping
   * arr.delete(-2) // === [0, 0.5, 1, 2, 3, 4.5]
   * arr.delete(1) // === [0, 1, 2, 3, 4.5]
   * ```
  */
  delete(index) {
    return this.splice(index, 1)[0];
  }
  /** swap the position of two items by their index. <br>
   * if any of the two indices is out of bound, then appropriate number of _empty_ elements will be created to fill the gap;
   * similar to how index-based assignment works (i.e. `my_list[off_bound_index] = "something"` will increase `my_list`'s length).
  */
  swap(index1, index2) {
    [this[index2], this[index1]] = [this[index1], this[index2]];
  }
  /** the `map` array method needs to have its signature corrected, because apparently, javascript internally creates a new instance of `this`, instead of a new instance of an `Array`.
   * the signature of the map method in typescript is misleading, because:
   * - it suggests:      `map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]`
   * - but in actuality: `map<U>(callbackfn: (value: T, index: number, array: typeof this<T>) => U, thisArg?: any): typeof this<U>`
   * 
   * meaning that in our case, `array` is of type `List<T>` (or a subclass thereof), and the return value is also `List<U>` (or a subclass) instead of `Array<U>`. <br>
   * in addition, it also means that a _new_ instance of this collection (`List`) is created, in order to fill it with the return output. <br>
   * this is perhaps the desired behavior for many uses, but for my specific use of "reference counting" and "list-like collection of signals",
   * this feature does not bode well, as I need to be able to account for each and every single instance.
   * surprise instances of this class are not welcomed, since it would introduce dead dependencies in my "directed acyclic graphs" for signals.
  */
  map(callbackfn, thisArg) {
    return super.map(callbackfn, thisArg);
  }
  /** see the comment on {@link map} to understand why the signature of this function needs to be corrected from the standard typescript definition. */
  flatMap(callback, thisArg) {
    return super.flatMap(callback, thisArg);
  }
  /** see the comment on {@link map} to understand the necessity for this method, instead of the builtin array `map` method. */
  mapToArray(callbackfn, thisArg) {
    return [...this].map(callbackfn, thisArg);
  }
  /** see the comment on {@link map} to understand the necessity for this method, instead of the builtin array `flatMap` method. */
  flatMapToArray(callbackfn, thisArg) {
    return [...this].flatMap(callbackfn, thisArg);
  }
  /** get an item at the specified `index`. <br>
   * this is equivalent to using index-based getter: `my_list[index]`.
  */
  get(index) {
    return this[index];
  }
  /** sets the value at the specified index. <br>
   * prefer using this method instead of index-based assignment, because subclasses may additionally cary out more operations with this method.
   * and for attaining compatibility between `List` and its subclasses, it would be in your best interest to use the `set` method.
   * - **not recommended**: `my_list[index] = "hello"`
   * - **preferred**: `my_list.set(index, "hello")`
  */
  set(index, value) {
    return this[index] = value;
  }
  static from(arrayLike, mapfn, thisArg) {
    let new_list = new this();
    return new_list.push(...array_from(arrayLike, mapfn, thisArg)), new_list;
  }
  static of(...items) {
    return this.from(items);
  }
}, RcList = class extends List {
  /** the reference counting `Map`, that bookkeeps the multiplicity of each item in the list. */
  rc = /* @__PURE__ */ new Map();
  /** get the reference count (multiplicity) of a specific item in the list. */
  getRc = bind_map_get(this.rc);
  /** set the reference count of a specific item in the list. */
  setRc = bind_map_set(this.rc);
  /** delete the reference counting of a specific item in the list. a `true` is returned if the item did exist in {@link rc}, prior to deletion. */
  delRc = bind_map_delete(this.rc);
  constructor(...args) {
    super(...args), this.incRcs(...this);
  }
  /** this overridable method gets called when a new unique item is determined to be added to the list. <br>
   * this method is called _before_ the item is actually added to the array, but it is executed right _after_ its reference counter has incremented to `1`. <br>
   * avoid accessing or mutating the array itself in this method's body (consider it an undefined behavior).
   * 
   * @param item the item that is being added.
  */
  onAdded(item) {
  }
  /** this overridable method gets called when a unique item (reference count of 1) is determined to be removed from the list. <br>
   * this method is called _before_ the item is actually removed from the array, but it is executed right _after_ its reference counter has been deleted. <br>
   * avoid accessing or mutating the array itself in this method's body (consider it an undefined behavior).
   * 
   * @param item the item that is being removed.
  */
  onDeleted(item) {
  }
  /** increments the reference count of each item in the provided array of items.
   * 
   * @param items the items whose counts are to be incremented.
  */
  incRcs(...items) {
    let { getRc, setRc } = this;
    items.forEach((item) => {
      let new_count = (getRc(item) ?? 0) + 1;
      setRc(item, new_count), new_count === 1 && this.onAdded(item);
    });
  }
  /** decrements the reference count of each item in the provided array of items.
   * 
   * @param items the items whose counts are to be decremented.
  */
  decRcs(...items) {
    let { getRc, setRc, delRc } = this;
    items.forEach((item) => {
      let new_count = (getRc(item) ?? 0) - 1;
      new_count > 0 ? setRc(item, new_count) : (delRc(item), this.onDeleted(item));
    });
  }
  push(...items) {
    let return_value = super.push(...items);
    return this.incRcs(...items), return_value;
  }
  pop() {
    let previous_length = this.length, item = super.pop();
    return this.length < previous_length && this.decRcs(item), item;
  }
  shift() {
    let previous_length = this.length, item = super.shift();
    return this.length < previous_length && this.decRcs(item), item;
  }
  unshift(...items) {
    let return_value = super.unshift(...items);
    return this.incRcs(...items), return_value;
  }
  splice(start, deleteCount, ...items) {
    let removed_items = super.splice(start, deleteCount, ...items);
    return this.incRcs(...items), this.decRcs(...removed_items), removed_items;
  }
  swap(index1, index2) {
    let max_index = max(index1, index2);
    max_index >= this.length && this.set(max_index, void 0), super.swap(index1, index2);
  }
  /** sets the value at the specified index, updating the counter accordingly. <br>
   * always use this method instead of index-based assignment, because the latter is not interceptable (except when using proxies):
   * - **don't do**: `my_list[index] = "hello"`
   * - **do**: `my_list.set(index, "hello")`
  */
  set(index, value) {
    let old_value = super.get(index), old_length = this.length, increase_in_array_length = index + 1 - old_length;
    if (increase_in_array_length === 1)
      this.push(value);
    else if (value !== old_value || increase_in_array_length > 1) {
      if (value = super.set(index, value), this.incRcs(value), increase_in_array_length > 0) {
        let { getRc, setRc } = this;
        setRc(void 0, (getRc(void 0) ?? 0) + increase_in_array_length);
      }
      this.decRcs(old_value);
    }
    return value;
  }
};
var default_equality = (v1, v2) => v1 === v2, falsey_equality = (v1, v2) => false, parseEquality = (equals) => equals === false ? falsey_equality : equals ?? default_equality, throttlingEquals = (delta_time_ms, base_equals) => {
  let base_equals_fn = parseEquality(base_equals), throttled_equals = throttle(delta_time_ms, base_equals_fn);
  return (prev_value, new_value) => {
    let is_equal = throttled_equals(prev_value, new_value);
    return is_equal === THROTTLE_REJECT ? true : is_equal;
  };
}, hash_ids = (ids) => {
  let sqrt_len = ids.length ** 0.5;
  return ids.reduce((sum, id) => sum + id * (id + sqrt_len), 0);
}, assign_id = (id, fn) => object_assign(fn, { id }), log_get_request = 0 ? (all_signals_get, observed_id, observer_id) => {
  let observed_signal = all_signals_get(observed_id), observer_signal = observer_id ? all_signals_get(observer_id) : { name: "untracked" };
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
var SimpleSignal_Factory = (ctx) => {
  let { newId, getId, setId, addEdge } = ctx;
  return class {
    constructor(value, {
      name,
      equals
    } = {}) {
      let id = newId();
      setId(id, this), this.id = id, this.rid = id, this.name = name, this.value = value, this.equals = parseEquality(equals);
    }
    get(observer_id) {
      return observer_id && addEdge(this.id, observer_id), 0, this.value;
    }
    set(new_value) {
      let old_value = this.value;
      return !this.equals(old_value, this.value = isFunction(new_value) ? new_value(old_value) : new_value);
    }
    run(forced) {
      return forced ? 1 : 0;
    }
    /** create an anonymous function that is bound to the provided `method_name`, in addition to assigning this signal's `id` to it. */
    bindMethod(method_name) {
      return assign_id(
        this.id,
        bindMethodToSelfByName(this, method_name)
      );
    }
    static create(...args) {
      let new_signal = new this(...args);
      return [new_signal.id, new_signal];
    }
  };
}, StateSignal_Factory = (ctx) => {
  let runId = ctx.runId;
  return class extends ctx.getClass(SimpleSignal_Factory) {
    constructor(value, config) {
      super(value, config);
    }
    set(new_value) {
      return super.set(new_value) ? (runId(this.id), true) : false;
    }
    static create(value, config) {
      let new_signal = new this(value, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.bindMethod("set")
      ];
    }
  };
}, MemoSignal_Factory = (ctx) => class extends ctx.getClass(SimpleSignal_Factory) {
  constructor(fn, config) {
    super(config?.value, config), this.fn = fn, config?.defer === false && this.get();
  }
  get(observer_id) {
    return this.rid && (this.run(), this.rid = 0), super.get(observer_id);
  }
  // TODO: consider whether or not MemoSignals should be able to be forced to fire independently
  //       [20240611]: in order to allow derived classes to fire independently, it would be best if we _do_ allow the `forced` parameter to take action.
  //                   so, as of now, it will take effect.
  //                   However, I need to document this feature properly now, in addition to changing the signature to allow for a "fireMemo()" forcefull setter-like function.
  //                   Moreover, I will need to consider the consequences on the existing derived classes, such as the `LazySignal`.
  // UPDATE: nevermind, I will retract the comments above soon, and will not currently implement forced memo signals, as it will create ambiguity in the following regard:
  //         when the signal is forced, it will certainly always ultimately propagate (via `SignalUpdateStatus.UPDATED`), but:
  //         - will it update its current value (via `super.set(this.fn(this.rid))`)
  //         - or will it skip rerunning the `fn` function and skip setting `this.value`
  run(forced) {
    return super.set(this.fn(this.rid)) ? 1 : 0;
  }
  static create(fn, config) {
    let new_signal = new this(fn, config);
    return [
      new_signal.id,
      new_signal.bindMethod("get")
    ];
  }
}, LazySignal_Factory = (ctx) => class extends ctx.getClass(SimpleSignal_Factory) {
  constructor(fn, config) {
    super(config?.value, config), this.fn = fn, this.dirty = 1, config?.defer === false && this.get();
  }
  run(forced) {
    return this.dirty = 1;
  }
  get(observer_id) {
    return (this.rid || this.dirty) && (super.set(this.fn(this.rid)), this.dirty = 0, this.rid = 0), super.get(observer_id);
  }
  static create(fn, config) {
    let new_signal = new this(fn, config);
    return [
      new_signal.id,
      new_signal.bindMethod("get")
    ];
  }
}, EffectSignal_Factory = (ctx) => {
  let runId = ctx.runId;
  return class extends ctx.getClass(SimpleSignal_Factory) {
    constructor(fn, config) {
      super(void 0, config), this.fn = fn, config?.defer === false && this.set();
    }
    /** a non-untracked observer (which is what all new observers are) depending on an effect signal will result in the triggering of effect function.
     * this is an intentional design choice so that effects can be scaffolded on top of other effects.
     * TODO: reconsider, because you can also check for `this.rid !== 0` to determine that `this.fn` effect function has never run before, thus it must run at least once if the observer is not untracked_id
     * is it really necessary for us to rerun `this.fn` effect function for every new observer? it seems to create chaos rather than reducing it.
     * UPDATE: decided NOT to re-run on every new observer
     * TODO: cleanup this messy doc and redeclare how createEffect works
    */
    get(observer_id) {
      observer_id && (this.rid && this.run(), super.get(observer_id));
    }
    set() {
      return runId(this.id);
    }
    run(forced) {
      let signal_should_propagate = this.fn(this.rid) !== false;
      return this.rid && (this.rid = 0), signal_should_propagate ? 1 : 0;
    }
    static create(fn, config) {
      let new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.bindMethod("set")
      ];
    }
  };
};
var AsyncStateSignal_Factory = (ctx) => {
  let runId = ctx.runId;
  return class extends ctx.getClass(SimpleSignal_Factory) {
    /** previous pending promise */
    promise;
    constructor(value, config) {
      super(value, config);
    }
    setPromise(new_value, rejectable = false) {
      let _this = this;
      return new_value = isFunction(new_value) && !(new_value instanceof Promise) ? new_value(_this.value) : new_value, new_value instanceof Promise ? (_this.promise = new_value).then(
        // on promise resolved
        (value) => _this.promise === new_value ? (_this.promise = void 0, _this.setPromise(value, rejectable)) : promise_forever(),
        // on promise rejected
        (reason) => (_this.promise === new_value && (_this.promise = void 0), rejectable ? promise_reject(reason) : promise_forever())
      ) : (super.set(new_value) && runId(this.id), promise_resolve(new_value));
    }
    run(forced) {
      return this.promise ? -1 : super.run(forced);
    }
    static create(value, config) {
      let new_signal = new this(value, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.bindMethod("setPromise")
      ];
    }
  };
};
var UnisetCollection = class extends Set {
  constructor(config, items = []) {
    super(), object_assign(this, config);
    let { id, ctx: { addEdge } } = config;
    for (let item of items)
      super.add(item), addEdge(item.id, id);
  }
  addItems(...items) {
    let { id, ctx: { addEdge, runId } } = this, mutated = false;
    items.forEach((item) => {
      super.has(item) || (super.add(item), addEdge(item.id, id), mutated = true);
    }), mutated && runId(id);
  }
  delItems(...items) {
    let { id, ctx: { delEdge, runId } } = this, mutated = false;
    items.forEach((item) => {
      super.delete(item) && (delEdge(item.id, id), mutated = true);
    }), mutated && runId(id);
  }
  add(value) {
    return this.addItems(value), this;
  }
  delete(value) {
    let item_exists = super.has(value);
    return this.delItems(value), item_exists;
  }
  clear() {
    this.delItems(...this);
  }
}, ListCollection = class extends RcList {
  disabled = true;
  constructor(config, items = []) {
    super(), object_assign(this, config), this.push(...items), this.disabled = false;
  }
  onAdded(item) {
    this.ctx.addEdge(item.id, this.id);
  }
  onDeleted(item) {
    this.ctx.delEdge(item.id, this.id);
  }
  incRcs(...items) {
    super.incRcs(...items), !(this.disabled ?? true) && items.length > 0 && this.ctx?.runId(this.id);
  }
  decRcs(...items) {
    super.decRcs(...items), !(this.disabled ?? true) && items.length > 0 && this.ctx?.runId(this.id);
  }
  splice(start, deleteCount, ...items) {
    let return_value;
    return this.ctx.batch.scopedBatching(() => {
      return_value = super.splice(start, deleteCount, ...items);
    }), return_value;
  }
  swap(index1, index2) {
    if (index1 === index2)
      return;
    let { id, ctx: { batch, runId } } = this;
    batch.scopedBatching(() => {
      super.swap(index1, index2), runId(id);
    });
  }
  set(index, value) {
    let return_value;
    return this.ctx.batch.scopedBatching(() => {
      return_value = super.set(index, value);
    }), return_value;
  }
}, CollectionSignal_Factory = (data_structure_class_config, ctx) => {
  let { dataClass, valueClass } = data_structure_class_config;
  return class extends ctx.getClass(MemoSignal_Factory) {
    constructor(fn, config) {
      super(fn, { ...config, value: new valueClass(), defer: true, equals: false });
      let id = this.id;
      this.data = new dataClass({ id, ctx }, config?.value), config?.defer === false && super.run();
    }
    static create(fn, config) {
      let new_signal = new this(fn, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.data
      ];
    }
  };
}, UnisetSignal_Factory = (ctx) => {
  let dataClass = UnisetCollection, valueClass = Set, signalSuperClass = CollectionSignal_Factory.bind(void 0, { dataClass, valueClass });
  return class extends ctx.getClass(signalSuperClass) {
    constructor(items = [], config) {
      super((rid) => {
        let { data, value } = this;
        return value.clear(), data.forEach((item) => {
          value.add(item(0));
        }), value;
      }, { ...config, value: items });
    }
    static create(items = [], config) {
      let new_signal = new this(items, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.data
      ];
    }
  };
}, ListSignal_Factory = (ctx) => {
  let dataClass = ListCollection, valueClass = List, signalSuperClass = CollectionSignal_Factory.bind(void 0, { dataClass, valueClass });
  return class extends ctx.getClass(signalSuperClass) {
    constructor(items = [], config) {
      super((rid) => {
        let { data, value } = this;
        return value.splice(0), value.push(...data.mapToArray((item) => item(0))), value;
      }, { ...config, value: items });
    }
    static create(items = [], config) {
      let new_signal = new this(items, config);
      return [
        new_signal.id,
        new_signal.bindMethod("get"),
        new_signal.data
      ];
    }
  };
};
var Context = class {
  addEdge;
  delEdge;
  newId;
  getId;
  setId;
  delId;
  runId;
  swapId;
  onInit;
  onDelete;
  clearCache;
  addClass;
  getClass;
  batch;
  dynamic;
  constructor() {
    let id_counter = 0, batch_nestedness = 0, fmap = /* @__PURE__ */ new Map(), rmap = /* @__PURE__ */ new Map(), fmap_get = bind_map_get(fmap), rmap_get = bind_map_get(rmap), fmap_set = bind_map_set(fmap), rmap_set = bind_map_set(rmap), fmap_delete = bind_map_delete(fmap), rmap_delete = bind_map_delete(rmap), ids_to_visit_cache = /* @__PURE__ */ new Map(), ids_to_visit_cache_get = bind_map_get(ids_to_visit_cache), ids_to_visit_cache_set = bind_map_set(ids_to_visit_cache), ids_to_visit_cache_clear = bind_map_clear(ids_to_visit_cache), ids_to_visit_cache_create_new_entry = (source_ids) => {
      let to_visit = /* @__PURE__ */ new Set(), to_visit_add = bind_set_add(to_visit), to_visit_has = bind_set_has(to_visit), dfs_visitor = (id) => {
        to_visit_has(id) || (fmap_get(id)?.forEach(dfs_visitor), to_visit_add(id));
      };
      return source_ids.forEach(dfs_visitor), source_ids.forEach(bind_set_delete(to_visit)), [...to_visit, ...source_ids].reverse();
    }, get_ids_to_visit = (...source_ids) => {
      let hash = hash_ids(source_ids);
      return ids_to_visit_cache_get(hash) ?? (ids_to_visit_cache_set(hash, ids_to_visit_cache_create_new_entry(source_ids)) && ids_to_visit_cache_get(hash));
    }, all_signals = /* @__PURE__ */ new Map(), all_signals_get = bind_map_get(all_signals), all_signals_set = bind_map_set(all_signals), all_signals_delete = bind_map_delete(all_signals), next_to_visit_this_cycle = /* @__PURE__ */ new Set(), next_to_visit_this_cycle_add = bind_set_add(next_to_visit_this_cycle), next_to_visit_this_cycle_delete = bind_set_delete(next_to_visit_this_cycle), next_to_visit_this_cycle_clear = bind_set_clear(next_to_visit_this_cycle), not_to_visit_this_cycle = /* @__PURE__ */ new Set(), not_to_visit_this_cycle_add = bind_set_add(not_to_visit_this_cycle), not_to_visit_this_cycle_has = bind_set_has(not_to_visit_this_cycle), not_to_visit_this_cycle_clear = bind_set_clear(not_to_visit_this_cycle), status_this_cycle = /* @__PURE__ */ new Map(), status_this_cycle_set = /* @__PURE__ */ bind_map_set(status_this_cycle), status_this_cycle_clear = /* @__PURE__ */ bind_map_clear(status_this_cycle), postruns_this_cycle = [], postruns_this_cycle_push = bind_array_push(postruns_this_cycle), postruns_this_cycle_clear = bind_array_pop(postruns_this_cycle), fireUpdateCycle = (...source_ids) => {
      next_to_visit_this_cycle_clear(), not_to_visit_this_cycle_clear(), 0, source_ids.forEach(next_to_visit_this_cycle_add);
      let number_of_forced_ids = source_ids.length, topological_ids = get_ids_to_visit(...source_ids);
      for (let source_id of topological_ids) {
        if (next_to_visit_this_cycle_delete(source_id) && !not_to_visit_this_cycle_has(source_id)) {
          let signal_update_status = executeSignal(source_id, number_of_forced_ids-- > 0);
          signal_update_status !== 0 && fmap_get(source_id)?.forEach(
            signal_update_status >= 1 ? next_to_visit_this_cycle_add : not_to_visit_this_cycle_add
          ), 0;
        }
        if (next_to_visit_this_cycle.size <= 0)
          break;
      }
      0, 0;
      let postrun_id;
      for (; postrun_id = postruns_this_cycle_clear(); )
        all_signals_get(postrun_id)?.postrun();
    }, executeSignal = (id, force) => {
      let forced = force === true, this_signal = all_signals_get(id), this_signal_update_status = this_signal?.run(forced) ?? 0;
      return this_signal_update_status >= 1 && this_signal.postrun && postruns_this_cycle_push(id), this_signal_update_status;
    }, batched_ids = [], batched_ids_push = bind_array_push(batched_ids), batched_ids_clear = bind_array_clear(batched_ids), startBatching = () => ++batch_nestedness, endBatching = () => {
      --batch_nestedness <= 0 && (batch_nestedness = 0, fireUpdateCycle(...batched_ids_clear()));
    }, scopedBatching = (fn, ...args) => {
      startBatching();
      let return_value = fn(...args);
      return endBatching(), return_value;
    }, on_delete_func_map = /* @__PURE__ */ new Map(), on_delete_func_map_get = bind_map_get(on_delete_func_map), on_delete_func_map_set = bind_map_set(on_delete_func_map), on_delete_func_map_delete = bind_map_delete(on_delete_func_map);
    this.onInit = (id, init_func) => id ? init_func() : void 0, this.onDelete = (id, cleanup_func) => {
      id && on_delete_func_map_set(id, cleanup_func);
    }, this.addEdge = (src_id, dst_id) => {
      if (src_id + dst_id <= 0)
        return false;
      let forward_items = fmap_get(src_id) ?? (fmap_set(src_id, /* @__PURE__ */ new Set()) && fmap_get(src_id));
      return forward_items.has(dst_id) ? false : (forward_items.add(dst_id), rmap_get(dst_id)?.add(src_id) || rmap_set(dst_id, /* @__PURE__ */ new Set([src_id])), ids_to_visit_cache_clear(), true);
    }, this.delEdge = (src_id, dst_id) => fmap_get(src_id)?.delete(dst_id) && rmap_get(dst_id)?.delete(src_id) ? (ids_to_visit_cache_clear(), true) : false, this.newId = () => (ids_to_visit_cache_clear(), ++id_counter), this.getId = all_signals_get, this.setId = all_signals_set, this.delId = (id) => {
      if (all_signals_delete(id)) {
        let forward_items = fmap_get(id), reverse_items = rmap_get(id);
        return forward_items?.forEach((dst_id) => {
          rmap_get(dst_id)?.delete(id);
        }), reverse_items?.forEach((src_id) => {
          fmap_get(src_id)?.delete(id);
        }), forward_items?.clear(), reverse_items?.clear(), fmap_delete(id), rmap_delete(id), ids_to_visit_cache_clear(), on_delete_func_map_get(id)?.(), on_delete_func_map_delete(id), true;
      }
      return false;
    }, this.swapId = (id1, id2) => {
      let signal1 = all_signals_get(id1), signal2 = all_signals_get(id2);
      all_signals_set(id1, signal2), all_signals_set(id2, signal1), signal1 && (signal1.id = id2, signal1.rid && (signal1.rid = id2)), signal2 && (signal2.id = id1, signal2.rid && (signal2.rid = id1)), ids_to_visit_cache_clear();
    }, this.clearCache = ids_to_visit_cache_clear, this.runId = (id) => batch_nestedness <= 0 ? (fireUpdateCycle(id), true) : (batched_ids_push(id), false);
    let class_record = /* @__PURE__ */ new Map(), class_record_get = bind_map_get(class_record), class_record_set = bind_map_set(class_record);
    this.addClass = (factory_fn) => {
      let signal_class = this.getClass(factory_fn);
      return bindMethodToSelfByName(signal_class, "create");
    }, this.getClass = (factory_fn) => {
      let signal_class = class_record_get(factory_fn);
      return signal_class || (signal_class = factory_fn(this), class_record_set(factory_fn, signal_class), signal_class);
    }, this.batch = { startBatching, endBatching, scopedBatching }, this.dynamic = {
      setValue: (id, new_value) => {
        let signal = all_signals_get(id ?? 0);
        signal && (signal.value = new_value);
      },
      setEquals: (id, new_equals) => {
        let signal = all_signals_get(id ?? 0);
        signal && (signal.equals = new_equals);
      },
      setFn: (id, new_fn) => {
        let signal = all_signals_get(id ?? 0);
        signal && (signal.fn = new_fn);
      }
    };
  }
};
var RecordSignal_Factory = (ctx) => class extends ctx.getClass(SimpleSignal_Factory) {
  constructor(base_record = {}, config) {
    let record_is_array = array_isArray(base_record), empty_instance_of_record = record_is_array ? [] : {}, keys = record_is_array ? [...base_record.keys()] : object_keys(base_record), values = record_is_array ? [...base_record.values()] : object_values(base_record);
    super([empty_instance_of_record], config), this.setItems(keys, values, false);
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
    this.value.splice(1);
  }
  // @ts-ignore:
  set(key, new_value, ignore) {
    return this.setItems([key], [new_value], ignore);
  }
  setItems(keys, values, ignore) {
    let equals = this.equals, delta_record = this.value, delta_record_initial_len = delta_record.length, record = delta_record[0], len = keys.length;
    for (let i = 0; i < len; i++) {
      let key = keys[i], old_value = record[key], new_value = values[i], _new_value = record[key] = isFunction(new_value) ? new_value(old_value) : new_value;
      !equals(old_value, _new_value) && delta_record.push(key);
    }
    let delta_record_final_len = delta_record.length;
    return !ignore && delta_record_final_len - delta_record_initial_len > 0;
  }
  delete(key, ignore) {
    return this.deleteKeys([key], ignore);
  }
  deleteKeys(keys, ignore) {
    let delta_record = this.value, delta_record_initial_len = delta_record.length, record = delta_record[0];
    for (let key of keys)
      key in record && (delete record[key], delta_record.push(key));
    let delta_record_final_len = delta_record.length;
    return !ignore && delta_record_final_len - delta_record_initial_len > 0;
  }
}, RecordStateSignal_Factory = (ctx) => {
  let runId = ctx.runId;
  return class extends ctx.getClass(RecordSignal_Factory) {
    setItems(keys, values, ignore) {
      return super.setItems(keys, values, ignore) ? runId(this.id) : false;
    }
    deleteKeys(keys, ignore) {
      return super.deleteKeys(keys, ignore) ? runId(this.id) : false;
    }
    static create(base_record = {}, config) {
      let new_signal = new this(base_record, config);
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
}, RecordMemoSignal_Factory = (ctx) => class extends ctx.getClass(RecordSignal_Factory) {
  constructor(fn, config) {
    super(config?.value, config), this.fn = fn, config?.defer === false && this.get();
  }
  get(observer_id) {
    return this.rid && (this.run(), this.rid = 0), super.get(observer_id);
  }
  run(forced) {
    let [set_keys, set_values, propagate = true] = this.fn(this.rid);
    return propagate && super.setItems(set_keys, set_values) ? 1 : 0;
  }
  static create(fn, config) {
    let new_signal = new this(fn, config);
    return [
      new_signal.id,
      new_signal.bindMethod("get")
    ];
  }
};
export {
  AsyncStateSignal_Factory,
  CollectionSignal_Factory,
  Context,
  EffectSignal_Factory,
  LazySignal_Factory,
  ListCollection,
  ListSignal_Factory,
  MemoSignal_Factory,
  RecordMemoSignal_Factory,
  RecordSignal_Factory,
  RecordStateSignal_Factory,
  SimpleSignal_Factory,
  StateSignal_Factory,
  UnisetCollection,
  UnisetSignal_Factory,
  default_equality,
  falsey_equality,
  throttlingEquals
};
