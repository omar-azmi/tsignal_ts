/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/
import { DEBUG, bindMethodToSelfByName } from "./deps.js";
import { default_equality, falsey_equality, log_get_request } from "./funcdefs.js";
import { SignalUpdateStatus } from "./typedefs.js";
export const SimpleSignal_Factory = (ctx) => {
    const { newId, getId, setId, addEdge } = ctx;
    return class SimpleSignal {
        constructor(value, { name, equals, } = {}) {
            const id = newId();
            // register the new signal
            setId(id, this);
            this.id = id;
            this.rid = id;
            this.name = name;
            this.value = value;
            this.equals = equals === false ? falsey_equality : (equals ?? default_equality);
        }
        get(observer_id) {
            if (observer_id) {
                // register this.id to observer
                addEdge(this.id, observer_id);
            }
            if (DEBUG.LOG) {
                log_get_request(getId, this.id, observer_id);
            }
            return this.value;
        }
        set(new_value) {
            const old_value = this.value;
            return !this.equals(old_value, (this.value = typeof new_value === "function" ?
                new_value(old_value) :
                new_value));
        }
        run(forced) {
            return forced ?
                SignalUpdateStatus.UPDATED :
                SignalUpdateStatus.UNCHANGED;
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
export const StateSignal_Factory = (ctx) => {
    const runId = ctx.runId;
    return class StateSignal extends ctx.getClass(SimpleSignal_Factory) {
        constructor(value, config) {
            super(value, config);
        }
        set(new_value) {
            // if value has changed, then fire this id to begin/queue a firing cycle
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
                new_signal.bindMethod("set"),
            ];
        }
    };
};
export const MemoSignal_Factory = (ctx) => {
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
            return super.set(this.fn(this.rid)) ?
                SignalUpdateStatus.UPDATED :
                SignalUpdateStatus.UNCHANGED;
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
export const LazySignal_Factory = (ctx) => {
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
            return (this.dirty = 1);
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
export const EffectSignal_Factory = (ctx) => {
    const runId = ctx.runId;
    return class EffectSignal extends ctx.getClass(SimpleSignal_Factory) {
        constructor(fn, config) {
            super(undefined, config);
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
        run(forced) {
            const signal_should_propagate = this.fn(this.rid) !== false;
            if (this.rid) {
                this.rid = 0;
            }
            return signal_should_propagate ?
                SignalUpdateStatus.UPDATED :
                SignalUpdateStatus.UNCHANGED;
        }
        static create(fn, config) {
            const new_signal = new this(fn, config);
            return [
                new_signal.id,
                new_signal.bindMethod("get"),
                new_signal.bindMethod("set"),
            ];
        }
    };
};
