// Set signal, Array signal, Map signal, etc... with method overloading to signal dirty when mutated
// use a "depends-on" array of ids approach?

import { ConstructorOf, StaticImplements } from "./deps.ts"
import { ID, Signal, SignalClass } from "./typedefs.ts"

// also, in context.ts, add a reversible action function

type Reactive<T> = T

interface ReactiveSignal<T> extends Signal<T> {
	value: Reactive<T>
	dirty: boolean
}

type OmitConstructorSignature<CLASS> = (
	CLASS extends new (...args: infer ARGS) => infer T ?
	(...args: ARGS) => T :
	/*
	(CLASS extends new (...args: ARGS) => infer T ?
		(...args: ARGS) => Signal<T> :
		never) :
	*/
	never
)


interface ReactiveSignalClass<T> {
	new(...args: ConstructorParameters<ConstructorOf<T>>): ReactiveSignal<T>
	create(...args: ConstructorParameters<ConstructorOf<T>>): [id: ID, ReactiveSignal<T>["get"]]
}

interface ReactiveSignalClass2<CLASS> {
	new(...args: any[]): Signal<any>
	create: OmitConstructorSignature<CLASS>
}

type MAPS = ReactiveSignalClass<Map<any, any>>
declare const za: MAPS
const [, ree] = za.create([[1, "kill"], [2, "za"]])
const kee = new za([[1, "kill"], [2, "za"]])

const classToSignal_Factory = <CLASS extends ConstructorOf<T>, T>(obj_class: CLASS) /* & { new(...args: ConstructorParameters<CLASS>) => (InstanceType<CLASS> & Signal<any>) } */ => {
	return class ZReactiveSignal<T> extends obj_class /*implements StaticImplements<ReactiveSignalClass2<CLASS>, typeof ZReactiveSignal<T>>*/ {
		static create(...args: ConstructorParameters<CLASS>) {
			return new this(...args)
		}
	}
}

const createKlass = <CLASS extends ConstructorOf<any>, T extends (CLASS extends ConstructorOf<infer R> ? R : any)>(base_class: CLASS) => {
	return class SubKlass extends base_class {
		static create(...args: ConstructorParameters<CLASS>): T {
			return new this(...args)
		}
	}
}

const RAAA = <K, V>(iterable?: Iterable<readonly [K, V]>) => {
	return new Map(iterable)
}

const RIZZ = (...args: Parameters<typeof RAAA>) => {
	return RAAA(...args)
}

RIZZ([[1, 1]])

const REEE = <ARGS extends ConstructorParameters<MapConstructor>>(...args: ARGS) => {
	return new Map(...args)
}

REEE([[1, 1]])

type Constructor<T = any> = new (...args: any[]) => T

function create<
	T,
	ARGS extends any[],
// CLASS extends ConstructorOf<T, ARGS> & { new(...args: ARGS): any },
// T extends (CLASS extends new (...args: ARGS) => infer B ? B : never),
>(base: (new (...args: ARGS) => any), ...args: ARGS): (typeof base extends new (...args: ARGS) => infer B ? B : never) {
	return new base(...args)
}

// Define a helper function to handle the type inference for the constructor
function inferConstructor<T extends Constructor, P extends ConstructorParameters<T>>(cls: T, ...args: P): T {
	return cls
}

type NewToFunc<CLASS extends { new(...args: any[]): any }> = { [K in keyof CLASS]: CLASS[K] }

const qqqa = create(Map, [[1, 1], [22, 22]])
declare const GAAA: NewToFunc<MapConstructor>

type EEIE = ConstructorOf<In, [iterable?: Iterable<readonly [number, number]> | null | undefined]>
declare const ZEEW: EEIE
const eeqe = new ZEEW([[2, 2], [2, 2]])

GAAA.prototype

const qqq = createKlass(Map).create([[1, 1]])

declare const a: ConstructorOf<Map<any, any>>

type M = typeof Map
interface Z extends M {
	new(arg1: number, arg2: string): Record<number, string>
}
declare const d: Z
type X = ConstructorParameters<MapConstructor>


const r = new d()




const b = classToSignal_Factory(Array<number>)
const c = b.create(244)
c.id
