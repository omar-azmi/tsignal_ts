export { bindMethodToSelfByName, bind_array_clear, bind_array_pop, bind_array_push, bind_map_clear, bind_map_get, bind_map_set, bind_set_add, bind_set_clear, bind_set_delete, bind_set_has } from "./deps/deno.land/x/kitchensink_ts@v0.7.0/binder.js";
export { THROTTLE_REJECT, throttle } from "./deps/deno.land/x/kitchensink_ts@v0.7.0/browser.js";
export { array_isArray, noop, object_assign, object_keys, object_values } from "./deps/deno.land/x/kitchensink_ts@v0.7.0/builtin_aliases_deps.js";
export { prototypeOfClass } from "./deps/deno.land/x/kitchensink_ts@v0.7.0/struct.js";
export * as typedefs from "./deps/deno.land/x/kitchensink_ts@v0.7.0/typedefs.js";
export var DEBUG;
(function (DEBUG) {
    DEBUG[DEBUG["LOG"] = 0] = "LOG";
})(DEBUG || (DEBUG = {}));
