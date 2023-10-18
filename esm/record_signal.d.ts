/** record signals <br>
 * @module
*/
import { Context } from "./context.js";
import { Accessor, EqualityCheck, EqualityFn, ID, SignalUpdateStatus, TO_ID, UNTRACKED_ID, Updater } from "./typedefs.js";
export interface RecordSignalConfig<K extends PropertyKey, V> {
    /** give a name to the signal for debuging purposes */
    name?: string;
    /** when a signal's value is updated (either through a {@link Setter}, or a change in the value of a dependancy signal in the case of a memo),
     * then the dependants/observers of THIS signal will only be notified if the equality check function evaluates to a `false`. <br>
     * see {@link EqualityCheck} to see its function signature and default behavior when left `undefined`
    */
    equals?: EqualityCheck<V>;
    /** when `false`, the computaion/effect function will be be evaluated/run immediately after it is declared. <br>
     * however, if left `undefined`, or `true`, the function's execution will be put off until the reactive signal returned by the createXYZ is called/accessed. <br>
     * by default, `defer` is `true`, and reactivity is not immediately executed during initialization. <br>
     * the reason why you might want to defer a reactive function is because the body of the reactive function may contain symbols/variables
     * that have not been defined yet, in which case an error will be raised, unless you choose to defer the first execution. <br>
    */
    defer?: boolean;
}
export interface RecordMemoSignalConfig<K extends PropertyKey, V> extends RecordSignalConfig<K, V> {
    /** initial value declaration for reactive signals. <br>
     * its purpose is only to be used as a previous value (`prev_value`) for the optional `equals` equality function,
     * so that you don't get an `undefined` as the `prev_value` on the very first comparison.
    */
    value?: Record<K, V>;
}
export declare const RecordSignal_Factory: (ctx: Context) => {
    new <K extends PropertyKey, V>(base_record?: Record<K, V>, config?: RecordSignalConfig<K, V> | undefined): {
        value: [record: Record<K, V>, ...changed_keys: K[]];
        equals: EqualityFn<V>;
        postrun(): void;
        set(key: K, new_value: V | Updater<V>, ignore?: boolean): boolean;
        setItems(keys: K[], values: (V | Updater<V>)[], ignore?: boolean): boolean;
        delete(key: K, ignore?: boolean): boolean;
        deleteKeys(keys: K[], ignore?: boolean): boolean;
        id: number;
        rid: number;
        name?: string | undefined;
        fn?: ((observer_id: number) => any) | undefined;
        prerun?(): any;
        get(observer_id?: number | undefined): [record: Record<K, V>, ...changed_keys: K[]];
        run(forced?: boolean | undefined): SignalUpdateStatus;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T>(...args: any[]): [number, ...any[]];
};
export declare const RecordStateSignal_Factory: (ctx: Context) => {
    new <K extends PropertyKey, V>(base_record?: Record<K, V>, config?: RecordSignalConfig<K, V> | undefined): {
        fn: never;
        setItems(keys: K[], values: (V | Updater<V>)[], ignore?: boolean): boolean;
        deleteKeys(keys: K[], ignore?: boolean): boolean;
        value: [record: Record<K, V>, ...changed_keys: K[]];
        equals: EqualityFn<V>;
        postrun(): void;
        set(key: K, new_value: V | Updater<V>, ignore?: boolean): boolean;
        delete(key: K, ignore?: boolean): boolean;
        id: number;
        rid: number;
        name?: string | undefined;
        prerun?(): any;
        get(observer_id?: number | undefined): [record: Record<K, V>, ...changed_keys: K[]];
        run(forced?: boolean | undefined): SignalUpdateStatus;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<K_1 extends PropertyKey, V_1>(base_record?: Record<K_1, V_1>, config?: RecordSignalConfig<K_1, V_1> | undefined): [idRecord: number, getDeltaRecord: Accessor<[record: Record<K_1, V_1>, ...changed_keys: K_1[]]>, setRecord: (key: K_1, new_value: V_1 | Updater<V_1>, ignore?: boolean) => boolean, setRecords: (keys: K_1[], values: (V_1 | Updater<V_1>)[], ignore?: boolean) => boolean, deleteRecord: (key: K_1, ignore?: boolean) => boolean, deleteRecords: (keys: K_1[], ignore?: boolean) => boolean];
};
/** type definition for a memorizable record function. to be used as a call parameter for {@link createRecordMemo} */
export type RecordMemoFn<K extends PropertyKey, V> = (observer_id: TO_ID | UNTRACKED_ID) => [set_keys: K[], set_values: (V | Updater<V>)[], propagate?: false];
export declare const RecordMemoSignal_Factory: (ctx: Context) => {
    new <K extends PropertyKey, V>(fn: RecordMemoFn<K, V>, config?: RecordMemoSignalConfig<K, V> | undefined): {
        value: [record: Record<K, V>, ...changed_keys: K[]];
        fn: RecordMemoFn<K, V>;
        get(observer_id?: TO_ID | UNTRACKED_ID): [record: Record<K, V>, ...changed_keys: K[]];
        run(forced?: boolean): SignalUpdateStatus;
        equals: EqualityFn<V>;
        postrun(): void;
        set(key: K, new_value: V | Updater<V>, ignore?: boolean): boolean;
        setItems(keys: K[], values: (V | Updater<V>)[], ignore?: boolean): boolean;
        delete(key: K, ignore?: boolean): boolean;
        deleteKeys(keys: K[], ignore?: boolean): boolean;
        id: number;
        rid: number;
        name?: string | undefined;
        prerun?(): any;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<K_1 extends PropertyKey, V_1>(fn: RecordMemoFn<K_1, V_1>, config?: RecordMemoSignalConfig<K_1, V_1> | undefined): [idRecord: number, getDeltaRecord: Accessor<[record: Record<K_1, V_1>, ...changed_keys: K_1[]]>];
};
