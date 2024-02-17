/** a context is required for any signal to be functional
 * @module
*/
import { EffectFn, MemoFn } from "./signal.js";
import { EqualityFn, FROM_ID, ID, Signal, SignalClass, TO_ID } from "./typedefs.js";
export interface Context_Dynamic {
    setValue: <T>(id: ID, new_value: T) => void;
    setEquals: <T>(id: ID, new_equals: EqualityFn<T>) => void;
    setFn: <T>(id: ID, new_fn: MemoFn<T> | EffectFn) => void;
}
export interface Context_Batch {
    startBatching: () => number;
    endBatching: () => void;
    scopedBatching: <T extends any = void, ARGS extends any[] = []>(fn: (...args: ARGS) => T, ...args: ARGS) => T;
}
export declare class Context {
    readonly addEdge: (src_id: FROM_ID, dst_id: TO_ID) => boolean;
    readonly delEdge: (src_id: FROM_ID, dst_id: TO_ID) => boolean;
    readonly newId: () => ID;
    readonly getId: (id: ID) => Signal<any> | undefined;
    readonly setId: (id: ID, signal: Signal<any>) => void;
    readonly delId: (id: ID) => boolean;
    readonly runId: (id: ID) => boolean;
    readonly swapId: (id1: ID, id2: ID) => void;
    readonly clearCache: () => void;
    readonly addClass: <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS) => SIGNAL_CLASS["create"];
    readonly getClass: <SIGNAL_CLASS extends SignalClass>(factory_fn: (ctx: Context) => SIGNAL_CLASS) => SIGNAL_CLASS;
    readonly batch: Context_Batch;
    readonly dynamic: Context_Dynamic;
    constructor();
}
