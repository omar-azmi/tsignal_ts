/** async signals <br>
 * @module
*/
import { Context } from "./context.js";
import { SimpleSignalConfig } from "./signal.js";
import { Accessor, AsyncSetter, ID, SignalUpdateStatus, Updater } from "./typedefs.js";
export declare const AsyncStateSignal_Factory: (ctx: Context) => {
    new <T>(value: T, config?: SimpleSignalConfig<T> | undefined): {
        /** previous pending promise */
        promise?: Promise<T | Updater<T>> | undefined;
        value: T;
        fn: never;
        prerun: never;
        postrun: never;
        setPromise(new_value: T | Promise<T | Updater<T>> | Updater<T | Promise<T | Updater<T>>>, rejectable?: boolean): Promise<T>;
        run(forced?: boolean | undefined): SignalUpdateStatus;
        id: number;
        rid: number;
        name?: string | undefined;
        equals: import("./typedefs.js").EqualityFn<T>;
        get(observer_id?: number | undefined): T;
        set(new_value: T | Updater<T>): boolean;
        bindMethod<M extends keyof any>(method_name: M): any[M];
    };
    create<T_1>(value: T_1, config?: SimpleSignalConfig<T_1> | undefined): [idAsyncState: number, getState: Accessor<T_1>, setStatePromise: AsyncSetter<T_1>];
};
