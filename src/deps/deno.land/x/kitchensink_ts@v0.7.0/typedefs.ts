/** utility typescript type and interface definitions
 * @module
*/

/// GENERIC INTERFACE AND TYPE MANIPULATORS

/** get the constructor function of type `T` */
export type ConstructorOf<T, Args extends any[] = any[]> = new (...args: Args) => T

/** get the prototype object of a class `CLS` */
export type PrototypeOf<CLS, Args extends any[] = any[]> = CLS extends { new(...args: any[]): infer U } ? U : never

/** turn optional properties `P` of interface `T` into required */
export type Require<T, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>
//export type Require<I, K extends keyof I> = I & Required<Pick<I, K>>

/** turn properties `P` of interface `T` into optional */
export type Optional<T, P extends keyof T> = Omit<T, P> & Partial<Pick<T, P>>

/** extract all optional fields from type `T` */
export type OptionalKeysOf<T> = { [K in keyof T as (undefined extends T[K] ? K : never)]: T[K] }

/** @deprecated
 * use {@link MembersOf} instead
*/
export type ClassFieldsOf<T> = { [K in keyof T as (T[K] extends Function ? never : K)]: T[K] }

/** get all methods of a class-instance */
export type MethodsOf<T> = { [K in keyof T as (T[K] extends Function ? K : never)]: T[K] }

/** get all functions of a class-instance */
export type CallableFunctionsOf<T> = { [K in keyof T as (T[K] extends (CallableFunction & ((this: T, ...args: any) => any)) ? K : never)]: T[K] }

/** get all data members (non-methods) of a class-instance */
export type MembersOf<T> = Omit<T, keyof MethodsOf<T>>

/** represents a typical javasctipt object, something that pairs `keys` with `values` */
export type Obj = { [key: PropertyKey]: any }

/** represents an empty javasctipt object */
export type EmptyObj = { [key: PropertyKey]: never }

/** add a prefix `PRE` to all property names of object `T` */
export type PrefixProps<T, PRE extends string> = { [K in keyof T & string as `${PRE}${K}`]: T[K] }

/** add a postfix (suffix) `POST` to all property names of object `T` */
export type PostfixProps<T, POST extends string> = { [K in keyof T & string as `${K}${POST}`]: T[K] }

/** allows one to declare static interface `CONSTRUCTOR` that must be implemented by a class `CLASS` <br>
 * it is important that your `CONSTRUCTOR` static interface must contain a constructor method in it.
 * although, that constructor could be super generalized too, despite the other static methods being narrowly defined, like:
 * ```ts
 * // interface for a class that must implement a static `clone` method, which should return a clone of the provided object `obj`, but omit numeric keys
 * interface Cloneable {
 * 	constructor(...args: any[]): any
 * 	clone<T>(obj: T): Omit<T, number>
 * }
 * ```
 * to use this utility type, you must provide the static interface as the first parameter,
 * and then `typeof CLASS_NAME` (which is the name of the class itself) as the second parameter.
 * 
 * @example
 * ```ts
 * interface Stack<T> {
 * 	push(...items: T[]): void
 * 	pop(): T | undefined
 * 	clear(): T[]
 * }
 * interface CloneableStack {
 * 	new <V>(...args: any[]): Stack<V>
 * 	// this static method should remove all function objects from the stack
 * 	clone<T>(original_stack: Stack<T>): Stack<Exclude<T, Function>>
 * }
 * const stack_class_alias = class MyStack<T> implements StaticImplements<CloneableStack, typeof MyStack> {
 * 	arr: T[]
 * 	constructor(first_item?: T) {
 * 		this.arr = first_item === undefined ? [] : [first_item]
 * 	}
 * 	push(...items: T[]): void { this.arr.push(...items) }
 * 	pop(): T | undefined { return this.arr.pop() }
 * 	clear(): T[] { return this.arr.splice(0) }
 * 	static clone<V>(some_stack: Stack<V>) {
 * 		const arr_no_func = (some_stack as MyStack<V>).arr.filter((v) => typeof v !== "function") as Array<Exclude<V, Function>>
 * 		const new_stack = new this<Exclude<V, Function>>()
 * 		new_stack.push(...arr_no_func)
 * 		return new_stack
 * 	}
 * }
 * ```
*/
export type StaticImplements<CONSTRUCTOR extends new (...args: any[]) => any, CLASS extends CONSTRUCTOR> = InstanceType<CONSTRUCTOR>

/** `DecrementNumber[N]` returns `N-1`, for up to `N = 10` */
export type DecrementNumber = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** repeat a string `S` for up to `N = 10` times */
export type RepeatString<S extends string, N extends number> = N extends 1 ? S : `${S}${RepeatString<S, DecrementNumber[N]>}`

/** array of type `T`, and fixed length `L` <br>
 * technique copied from [stackexchange, user "mstephen19"](https://stackoverflow.com/a/73384647) <br>
 * the `R` generic is for recursion, and not intended for external use.
*/
export type ArrayFixedLength<T, L extends number, R extends T[] = []> = R["length"] extends L ? R : ArrayFixedLength<T, L, [...R, T]>

/** represents a scalar mathematical function of `ParamLength` number of input parameters (or variables) <br>
 * for instance, a scalar addition function is merely a mapping from domains $X,Y \in \R$ to $Z \in \R$: $\text{Add} : X \times Y \rightarrow Z$ <br>
 * ```ts
 * const add_func: NumericMapFunc<2> = (x, y) => x + y
 * ```
*/
export type NumericMapFunc<ParamLength extends number> = (...params: ArrayFixedLength<number, ParamLength>) => number

/** represents a higher-order scalar function of `ParamLength` number of array input parameters, which are then manipulated based on index `i`, for all possible `i` <br>
 * @example for instance, to model an array addition function, you would simply do:
 * ```ts
 * const add_hof: IndexNumericMapFunc<2> = (arrX, arrY) => (i) => arrX[i] + arrY[i]
 * ```
*/
export type IndexNumericMapFunc<ParamLength extends number> = (...params: ArrayFixedLength<NumericArray, ParamLength>) => (i: number) => number

/// TYPED NUMERICS

/** unsigned integer, signed integer, or IEEE-754 float */
export type NumericFormatType = "u" | "i" | "f"

/** little-endian, big-endian, clamped 1-byte, or 1-byte */
export type NumericEndianType = "l" | "b"

/** specify 1-byte, 2-bytes, 4-bytes, or 8-bytes of numeric data*/
export type DByteSize = "1" | "2" | "4" | "8"

/** indicates the name of a numeric type. <br>
 * the collection of possible valid numeric types is:
 * - `"u1"`, `"u2"`, `"u4"`, `"u8"`, `"i1"`, `"i2"`, `"i4"`, `"i8"`, `"f4"`, `"f8"`, `"u1c"`
 * 
 * the first character specifies the format:
 * - `u` = unsigned integer
 * - `i` = signed integer
 * - `f` = float IEEE-754
 * 
 * the second character specifies the byte-size:
 * - `1` = one byte
 * - `2` = two bytes (short)
 * - `4` = four bytes (word)
 * - `8` = eight bytes (long)
*/
export type NumericDType = Exclude<`${NumericFormatType}${DByteSize}` | "u1c", "f1" | "f2" | "u8" | "i8">

/** abstract constructor of any typed array, such as `new Uint8Array(...)`
 * you can narrow down the constructor through the use of a  {@link NumericDType} string annotation
 * @example
 * ```ts
 * const clamp_arr_constructor: TypedArrayConstructor<"u1c"> = Uint8ClampedArray
 * ```
*/
export type TypedArrayConstructor<DType extends NumericDType = NumericDType> = {
	"u1": Uint8ArrayConstructor
	"u1c": Uint8ClampedArrayConstructor
	"u2": Uint16ArrayConstructor
	"u4": Uint32ArrayConstructor
	// "u8": BigUint64ArrayConstructor
	"i1": Int8ArrayConstructor
	"i2": Int16ArrayConstructor
	"i4": Int32ArrayConstructor
	// "i8": BigInt64ArrayConstructor
	"f4": Float32ArrayConstructor
	"f8": Float64ArrayConstructor
}[DType]

/** an instance of any typed array, such as `Uint8Array`
 * you can narrow down the type through the use of a  {@link NumericDType} string annotation
 * @example
 * ```ts
 * const clammped_bytes_arr: TypedArray<"u1c"> = new Uint8ClampedArray(42)
 * ```
*/
export type TypedArray<DType extends NumericDType = NumericDType> = {
	"u1": Uint8Array
	"u1c": Uint8ClampedArray
	"u2": Uint16Array
	"u4": Uint32Array
	// "u8": BigUint64Array
	"i1": Int8Array
	"i2": Int16Array
	"i4": Int32Array
	// "i8": BigInt64Array
	"f4": Float32Array
	"f8": Float64Array
}[DType]

/** any numeric array */
export type NumericArray = TypedArray | Array<number>

/** indicates the name of a numeric type with required endian information, or the use of a variable-sized integer. <br>
 * the collection of possible valid numeric types is:
 * - `"u1"`, `"i1"`, `"u2l"`, `"u2b"`, `"i2l"`, `"i2b"`, `"u4l"`, `"u4b"`, `"u8l"`, `"u8b"`, `"i4l"`, `"i4b"`, `"i8l"`, `"i8b"`, `"f4l"`, `"f4b"`, `"f8l"`, `"f8b"`, `"u1c"`,
 * 
 * the first character specifies the format:
 * - `u` = unsigned integer
 * - `i` = signed integer
 * - `f` = float IEEE-754
 * 
 * the second character specifies the byte-size:
 * - `1` = one byte
 * - `2` = two bytes (short)
 * - `4` = four bytes (word)
 * - `8` = eight bytes (long)
 * 
 * the third character specifies the endianess. but in the case of unsigned one byte integers, the `c` character specifies if the value is clamped to 255:
 * - `l` = little endian
 * - `b` = big endian
 * - `c` = clamped (only valid for `"u1c"` type)
 * 
 * for variable byte sized numbers, use {@link VarNumericType}.
*/
export type NumericType = Exclude<`${NumericDType}${NumericEndianType}` | "u1" | "u1c" | "i1", `${"u1" | "u1c" | "i1"}${NumericEndianType}`>

/** an array (regular javascript array) of numbers can be interpreted as an array of formated binary numbers. */
export type NumericArrayType = `${NumericType}[]`

/** indicates either a variable bytes sized unsigned or signed integer. see [wikipedia](https://en.wikipedia.org/wiki/Variable-length_quantity) to understand how they're represented in binary. */
export type VarNumericType = "uv" | "iv"

/** numeric array version of {@link VarNumericType}. */
export type VarNumericArrayType = `${VarNumericType}[]`

/// NUMERICAL RANGES AN INTERVALS

/** a float number in the range `0.0` to `1.0` (inclusive) */
export type UnitInterval = number
export const isUnitInterval = (value: number): value is UnitInterval => value >= 0 && value <= 1 ? true : false

/** an integer number in the range `0` to `255` (inclusive) */
export type UByte = number
export const isUByte = (value: number): value is UByte => value >= 0 && value <= 255 && value === (value | 0) ? true : false

/** a float number in the range `0` to `360` (inclusive), indicating the degree rotation angle. */
export type Degrees = number
export const isDegrees = (value: number): value is Degrees => value >= 0 && value <= 360 ? true : false

/** a float number in the range `0` to `pi` (inclusive), indicating the radian rotation angle. */
export type Radians = number
export const isRadians = (value: number): value is Radians => value >= 0 && value <= Math.PI ? true : false

/// STRUCTURE DEFINITIONS
