/** a equal-calorie clone of the popular reactivity library [SolidJS](https://github.com/solidjs/solid). <br>
 * @module
*/
import { Context } from "./context.js";
import { Accessor, EqualityCheck, EqualityFn, ID, Setter, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.js";
export interface SimpleSignalConfig<T> {
    /** give a name to the signal for debugging purposes */
    name?: string;
    /** when a signal's value is updated (either through a {@link Setter}, or a change in the value of a dependency signal in the case of a memo),
     * then the dependants/observers of THIS signal will only be notified if the equality check function evaluates to a `false`. <br>
     * see {@link EqualityCheck} to see its function signature and default behavior when left `undefined`
    */
    equals?: EqualityCheck<T>;
    /** when `false`, the computaion/effect function will be be evaluated/run immediately after it is declared. <br>
     * however, if left `undefined`, or `true`, the function's execution will be put off until the reactive signal returned by the createXYZ is called/accessed. <br>
     * by default, `defer` is `true`, and reactivity is not immediately executed during initialization. <br>
     * the reason why you might want to defer a reactive function is because the body of the reactive function may contain symbols/variables
     * that have not been defined yet, in which case an error will be raised, unless you choose to defer the first execution. <br>
    */
    defer?: boolean;
}
export interface MemoSignalConfig<T> extends SimpleSignalConfig<T> {
    /** initial value declaration for reactive signals. <br>
     * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
     * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
    */
    value?: T;
}
export type SimpleSignalInstance = InstanceType<ReturnType<typeof SimpleSignal_Factory>>;
export declare const SimpleSignal_Factory: (ctx: Context) => {
    new <T>(value?: T | undefined, { name, equals, }?: SimpleSignalConfig<T>): {
        id: ID;
        rid: ID | UNTRACKED_ID;
        name?: string | undefined;
        value?: T | undefined;
        equals: EqualityFn<T>;
        fn?: ((observer_id: TO_ID | UNTRACKED_ID) => any) | undefined;
        prerun?(): any;
        postrun?(): any;
        get(observer_id?: TO_ID | UNTRACKED_ID): T;
        set(new_value: T | Updater<T>): boolean;
        run(forced?: boolean): SignalUpdateStatus;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T_1>(...args: any[]): [id: ID, ...any[]];
};
export declare const StateSignal_Factory: (ctx: Context) => {
    new <T>(value: T, config?: SimpleSignalConfig<T> | undefined): {
        value: T;
        fn: never;
        prerun: never;
        postrun: never;
        set(new_value: T | Updater<T>): boolean;
        id: ID;
        rid: ID | UNTRACKED_ID;
        name?: string | undefined;
        equals: EqualityFn<T>;
        get(observer_id?: TO_ID | UNTRACKED_ID): T;
        run(forced?: boolean): SignalUpdateStatus;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T_1>(value: T_1, config?: SimpleSignalConfig<T_1> | undefined): [idState: number, getState: Accessor<T_1>, setState: Setter<T_1>];
};
/** type definition for a memorizable function. to be used as a call parameter for {@link createMemo} */
export type MemoFn<T> = (observer_id: TO_ID | UNTRACKED_ID) => T | Updater<T>;
export declare const MemoSignal_Factory: (ctx: Context) => {
    new <T>(fn: MemoFn<T>, config?: MemoSignalConfig<T> | undefined): {
        fn: MemoFn<T>;
        prerun: never;
        postrun: never;
        get(observer_id?: TO_ID | UNTRACKED_ID): T;
        run(forced?: boolean): SignalUpdateStatus;
        id: ID;
        rid: ID | UNTRACKED_ID;
        name?: string | undefined;
        value?: T | undefined;
        equals: EqualityFn<T>;
        set(new_value: T | Updater<T>): boolean;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T_1>(fn: MemoFn<T_1>, config?: SimpleSignalConfig<T_1> | undefined): [idMemo: number, getMemo: Accessor<T_1>];
};
export declare const LazySignal_Factory: (ctx: Context) => {
    new <T>(fn: MemoFn<T>, config?: MemoSignalConfig<T> | undefined): {
        fn: MemoFn<T>;
        dirty: 0 | 1;
        prerun: never;
        postrun: never;
        run(forced?: boolean): SignalUpdateStatus.UPDATED;
        get(observer_id?: TO_ID | UNTRACKED_ID): T;
        id: ID;
        rid: ID | UNTRACKED_ID;
        name?: string | undefined;
        value?: T | undefined;
        equals: EqualityFn<T>;
        set(new_value: T | Updater<T>): boolean;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T_1>(fn: MemoFn<T_1>, config?: SimpleSignalConfig<T_1> | undefined): [idLazy: number, getLazy: Accessor<T_1>];
};
/** type definition for an effect function. to be used as a call parameter for {@link createEffect} <br>
 * the return value of the function describes whether or not the signal should propagate. <br>
 * if `undefined` or `true` (or truethy), then the effect signal will propagate onto its observer signals,
 * otherwise if it is explicitly `false`, then it won't propagate.
*/
export type EffectFn = (observer_id: TO_ID | UNTRACKED_ID) => void | undefined | boolean;
/** a function that forcefully runs the {@link EffectFn} of an effect signal, and then propagates towards the observers of that effect signal. <br>
 * the return value is `true` if the effect is ran and propagated immediately,
 * or `false` if it did not fire immediately because of some form of batching stopped it from doing so.
*/
export type EffectEmitter = () => boolean;
export declare const EffectSignal_Factory: (ctx: Context) => {
    new (fn: EffectFn, config?: SimpleSignalConfig<void>): {
        fn: EffectFn;
        prerun: never;
        postrun: never;
        /** a non-untracked observer (which is what all new observers are) depending on an effect signal will result in the triggering of effect function.
         * this is an intentional design choice so that effects can be scaffolded on top of other effects.
         * TODO: reconsider, because you can also check for `this.rid !== 0` to determine that `this.fn` effect function has never run before, thus it must run at least once if the observer is not untracked_id
         * is it really necessary for us to rerun `this.fn` effect function for every new observer? it seems to create chaos rather than reducing it.
         * UPDATE: decided NOT to re-run on every new observer
         * TODO: cleanup this messy doc and redeclare how createEffect works
        */
        get(observer_id?: TO_ID | UNTRACKED_ID): void;
        set(): boolean;
        run(forced?: boolean): SignalUpdateStatus;
        id: ID;
        rid: ID | UNTRACKED_ID;
        name?: string | undefined;
        value?: void | undefined;
        equals: EqualityFn<void>;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create(fn: EffectFn, config?: SimpleSignalConfig<void>): [idEffect: ID, dependOnEffect: Accessor<void>, fireEffect: EffectEmitter];
};
