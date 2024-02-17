export { bindMethodToSelfByName, bind_array_clear, bind_array_pop, bind_array_push, bind_map_clear, bind_map_delete, bind_map_get, bind_map_set, bind_set_add, bind_set_clear, bind_set_delete, bind_set_has } from "kitchensink_ts/binder";
export { array_isArray, noop, object_assign, object_keys, object_values, promise_forever, promise_reject, promise_resolve } from "kitchensink_ts/builtin_aliases_deps";
export { THROTTLE_REJECT, throttle, throttleAndTrail } from "kitchensink_ts/lambda";
export { prototypeOfClass } from "kitchensink_ts/struct";
export type { CallableFunctionsOf, ConstructorOf, MethodsOf, StaticImplements } from "kitchensink_ts/typedefs";
export declare const enum DEBUG {
    LOG = 0
}
export declare const object_entries: {
    <T>(o: {
        [s: string]: T;
    } | ArrayLike<T>): [string, T][];
    (o: {}): [string, any][];
};
