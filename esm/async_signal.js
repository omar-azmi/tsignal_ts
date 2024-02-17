/** async signals <br>
 * @module
*/
import { promise_forever, promise_reject, promise_resolve } from "./deps.js";
import { SimpleSignal_Factory } from "./signal.js";
import { SignalUpdateStatus } from "./typedefs.js";
export const AsyncStateSignal_Factory = (ctx) => {
    const runId = ctx.runId;
    return class AsyncStateSignal extends ctx.getClass(SimpleSignal_Factory) {
        /** previous pending promise */
        promise;
        constructor(value, config) {
            super(value, config);
        }
        setPromise(new_value, rejectable = false) {
            const _this = this, new_value_is_updater = (typeof new_value === "function") && !(new_value instanceof Promise);
            // evaluate the `new_value` based on the updater function applied to the old value `this.value`
            new_value = new_value_is_updater ? new_value(_this.value) : new_value;
            if (new_value instanceof Promise) {
                return (_this.promise = new_value).then(
                // on promise resolved
                (value) => {
                    // our previous pending promise (aka `this.promise`) MUST still equal to `new_value`'s promise, otherwise it would mean that a more recent promise has been assigned/set to this AsyncState.
                    // we shall only update the underlying `this.value` if and only if the resolved promise also happens to be the most recently assigned/set promise.
                    // if that is not the case (i.e. the resolved promise has turned old because a newer one came around/was set), then we would simply drop the old promise.
                    if (_this.promise === new_value) {
                        _this.promise = undefined;
                        return _this.setPromise(value, rejectable);
                    }
                    return promise_forever();
                }, 
                // on promise rejected
                (reason) => {
                    // TODO: is the check below necessary? would it be harmful in any way if the promise continues to linger around?
                    if (_this.promise === new_value) {
                        _this.promise = undefined;
                    }
                    return rejectable ? promise_reject(reason) : promise_forever();
                });
            }
            // the signal update is first propagated, and then the returned promise is resolved with the value we just set
            const value_has_changed = super.set(new_value);
            if (value_has_changed) {
                runId(this.id);
            }
            return promise_resolve(new_value);
        }
        run(forced) {
            // if there is a pending promise (i.e `this.promise !== undefined`), then this signal should not propagate, even when `forced === true`.
            return this.promise ?
                SignalUpdateStatus.ABORTED :
                super.run(forced);
        }
        static create(value, config) {
            const new_signal = new this(value, config);
            return [
                new_signal.id,
                new_signal.bindMethod("get"),
                new_signal.bindMethod("setPromise"),
            ];
        }
    };
};
