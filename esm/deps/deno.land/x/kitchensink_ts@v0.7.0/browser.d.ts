/** utility functions for web browser interaction
 * @module
*/
/** create a blob out of your `Uint8Array` bytes buffer and queue it for downloading. <br>
 * you can also provide an optional `file_name` and `mime_type` <br>
 * technically, you can download any kind of data, so long as your `mime_type` and `data` pair match within the capabilities of your the browser's internal blob encoder <br>
*/
export declare const downloadBuffer: (data: Uint8Array | string | any, file_name?: string, mime_type?: string) => void;
/** convert a blob to base64 string, with the data header included. <br>
 * use {@link blobToBase64Split} to get a 2-tuple with the data header split from the data body <br>
 * or use {@link blobToBase64Body} to get just the body of the data <br>
 * this function works correctly all the time, unlike `btoa`, which fails for arbitrary bytes
*/
export declare const blobToBase64: (blob: Blob) => Promise<string>;
/** convert a blob to base64 string with the header and body separated as a 2-tuple. <br> */
export declare const blobToBase64Split: (blob: Blob) => Promise<[string, string]>;
/** convert a blob to base64 string with the header omitted. <br> */
export declare const blobToBase64Body: (blob: Blob) => Promise<string>;
/** convert a base64 encoded string (no header) into a `Uint8Array` bytes containing the binary data
 * see {@link bytesToBase64Body} for the reverse
*/
export declare const base64BodyToBytes: (data_base64: string) => Uint8Array;
/** encode data bytes into a base64 string (no header)
 * see {@link base64BodyToBytes} for the reverse
*/
export declare const bytesToBase64Body: (data_buf: Uint8Array) => string;
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
export declare const debounce: <T extends unknown, ARGS extends any[]>(wait_time_ms: number, fn: (...args: ARGS) => T) => (...args: ARGS) => Promise<T>;
export declare const THROTTLE_REJECT: unique symbol;
/** blocks the execution of `fn`, if less than `delta_time_ms` amount of time has passed since the previous non-rejected call. <br>
 * @param delta_time_ms the time interval in milliseconds for throttling
 * @param fn the function to be throttled
 * @returns a function (that takes arguments intended for `fn`) that returns return value of `fn` if it was not throttled, otherwise a {@link THROTTLE_REJECT} symbol is returned.
*/
export declare const throttle: <T extends unknown, ARGS extends any[]>(delta_time_ms: number, fn: (...args: ARGS) => T) => (...args: ARGS) => typeof THROTTLE_REJECT | T;
