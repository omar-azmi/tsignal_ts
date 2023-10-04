/** utility functions for web browser interaction
 * @module
*/
import { date_now, dom_clearTimeout, dom_setTimeout, string_fromCharCode } from "./builtin_aliases_deps.js";
/** create a blob out of your `Uint8Array` bytes buffer and queue it for downloading. <br>
 * you can also provide an optional `file_name` and `mime_type` <br>
 * technically, you can download any kind of data, so long as your `mime_type` and `data` pair match within the capabilities of your the browser's internal blob encoder <br>
*/
export const downloadBuffer = (data, file_name = "data.bin", mime_type = "application/octet-stream") => {
    const blob = new Blob([data], { type: mime_type }), anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = file_name;
    anchor.click();
    URL.revokeObjectURL(anchor.href); // saves up memory after the user has used the data URL
    anchor.remove(); // removethe un-needed node
};
/** convert a blob to base64 string, with the data header included. <br>
 * use {@link blobToBase64Split} to get a 2-tuple with the data header split from the data body <br>
 * or use {@link blobToBase64Body} to get just the body of the data <br>
 * this function works correctly all the time, unlike `btoa`, which fails for arbitrary bytes
*/
export const blobToBase64 = (blob) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
/** convert a blob to base64 string with the header and body separated as a 2-tuple. <br> */
export const blobToBase64Split = (blob) => blobToBase64(blob).then((str_b64) => {
    const [head, body] = str_b64.split(";base64,", 2);
    return [head + ";base64,", body];
});
/** convert a blob to base64 string with the header omitted. <br> */
export const blobToBase64Body = (blob) => blobToBase64Split(blob).then((b64_tuple) => b64_tuple[1]);
/** convert a base64 encoded string (no header) into a `Uint8Array` bytes containing the binary data
 * see {@link bytesToBase64Body} for the reverse
*/
export const base64BodyToBytes = (data_base64) => {
    const data_str = atob(data_base64), len = data_str.length, data_buf = new Uint8Array(len);
    for (let i = 0; i < len; i++)
        data_buf[i] = data_str.charCodeAt(i);
    return data_buf;
};
/** encode data bytes into a base64 string (no header)
 * see {@link base64BodyToBytes} for the reverse
*/
export const bytesToBase64Body = (data_buf) => {
    // here, we use `String.fromCharCode` to convert numbers to their equivalent binary string encoding. ie: `String.fromCharCode(3, 2, 1) === "\x03\x02\x01"`
    // however, most browsers only allow a maximum number of function agument to be around `60000` to `65536`, so we play it safe here by picking around 33000
    // we must also select a `max_args` such that it is divisible by `6`, because we do not want any trailing "=" or "==" to appear in the middle of our base64
    // encoding where we've split the data.
    const max_args = 2 ** 15 - 2, data_str_parts = [];
    for (let i = 0; i < data_buf.length; i += max_args) {
        const sub_buf = data_buf.subarray(i, i + max_args);
        data_str_parts.push(string_fromCharCode(...sub_buf));
    }
    return btoa(data_str_parts.join(""));
};
/** creates a debounced version of the provided function that returns a promise. <br>
 * the debounced function delays the execution of the provided function `fn` until the debouncing interval `wait_time_ms` amount of time has passed without any subsequent calls. <br>
 * if subsequent calls are made within the debouncing interval, the debounced function will return the same promise as before, further delaying its resolution. <br>
 * however, once the debouncing interval has elapsed and the promise is resolved, any new calls to the debounced function will create and return a new promise.
 *
 * @param wait_time_ms the time interval in milliseconds for debouncing
 * @param fn the function to be debounced
 * @returns a function (that takes arguments intended for `fn`) that returns a promise, which is resolved once `wait_time_ms` amount of time has passed with no further calls
 *
 * @example
 * ```ts
 * // assume that `sleep(time_ms: number)` is a function that synchronously creates a delay for `time_ms` number of milliseconds
 * const fn = (v: number) => {
 * 	console.log(v)
 * 	return v + 100
 * }
 * const debounced_fn = debounce(1000, fn)
 * debounced_fn(24) // returns a promise that resolves after 1000ms
 * sleep(500)
 * debounced_fn(42) // returns the same promise as before, but its resolution is delayed by another 1000ms
 * // 1000ms later, you should see "42" in your console
 * sleep(2000)
 * debounced_fn(99) // Returns a new promise that resolves after 1000ms
 * // 1000ms later, you should see "99" in your console
 * // notice that the promises made within the debounce interval are the same pomise objects (ie `debounced_fn(24) === debounced_fn(42)`)
 * // however, once out of that interval, an entirely new promise is generated (ie `debounced_fn(42) !== debounced_fn(99)`)
 * ```
*/
export const debounce = (wait_time_ms, fn) => {
    let prev_timer, current_resolve, current_promise;
    const swap_current_promise_with_a_new_one = (value) => {
        current_promise = new Promise((resolve, reject) => (current_resolve = resolve)).then(swap_current_promise_with_a_new_one);
        return value;
    };
    swap_current_promise_with_a_new_one();
    return (...args) => {
        dom_clearTimeout(prev_timer);
        prev_timer = dom_setTimeout(() => (current_resolve(fn(...args))), wait_time_ms);
        return current_promise;
    };
};
export const THROTTLE_REJECT = Symbol("a rejection by a throttled function");
/** blocks the execution of `fn`, if less than `delta_time_ms` amount of time has passed since the previous non-rejected call. <br>
 * @param delta_time_ms the time interval in milliseconds for throttling
 * @param fn the function to be throttled
 * @returns a function (that takes arguments intended for `fn`) that returns return value of `fn` if it was not throttled, otherwise a {@link THROTTLE_REJECT} symbol is returned.
*/
export const throttle = (delta_time_ms, fn) => {
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
