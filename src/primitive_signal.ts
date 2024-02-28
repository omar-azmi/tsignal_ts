// Set signal, Array signal, Map signal, etc... with method overloading to signal dirty when mutated
// use a "depends-on" array of ids approach?

import { ConstructorOf, bind_map_get, bind_map_set, isFunction, object_entries } from "./deps.ts"
import { parseEquality } from "./funcdefs.ts"
import { ID, Signal, SignalClass } from "./typedefs.ts"

// also, in context.ts, add a reversible action function

type Reactive<T> = T

interface ReactiveSignal<T> extends Signal<T> {
	value: Reactive<T>
	dirty: boolean
}

interface ReactiveSignalClass<
	T,
	ARGS extends ConstructorParameters<ConstructorOf<T>> = any
> extends SignalClass {
	new(...args: ARGS): ReactiveSignal<T>
	create(...args: ARGS): [id: ID, ReactiveSignal<T>["get"]]
}

const classToSignal_Factory = <CLASS extends ConstructorOf<T>, T>(obj_class: CLASS) /* & { new(...args: ConstructorParameters<CLASS>) => (InstanceType<CLASS> & Signal<any>) } */ => {
	return class ReactiveSignal<T> extends obj_class /*implements StaticImplements<ReactiveSignalClass2<CLASS>, typeof ZReactiveSignal<T>>*/ {
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

type SomeMethod<THIS, ARGS extends any[], RET> = (this: THIS, ...args: ARGS) => RET

type InterceptMutationMethods<T extends object> = {
	[M in keyof T]?: T[M] extends SomeMethod<T, infer ARGS, any> ?
	(undefined | false | ((this: T, ...args: ARGS) => boolean)) :
	never
}

type InterceptMutationMembers<T extends object> = {
	[M in keyof T]?: undefined | false | ((this: T, prev_value: T[M] | undefined, new_value: T[M]) => boolean)
}

/*
type MutationInterceptionMap<T extends object, M extends keyof T = any> = Map<M, T[M] extends SomeMethod<T, infer ARGS, any> ?
	(undefined | false | ((this: T, ...args: ARGS) => boolean)) :
	never
>

type MapUnion<M1 extends Map<any, any>, M2 extends Map<any, any>> = M1 extends Map<infer K1, infer V1> ? M2 extends Map<infer K2, infer V2> ? Map<K1 | K2, V1 | V2> : never : never

type Zo2 = MapUnion<Map<string, number>, Map<boolean, number>>

// type MappedTypeToMap<MAPPED> = { [M in keyof MAPPED]?: Map<M, MAPPED[M]> }[keyof MAPPED]
type MappedTypeToMap<MAPPED> = Map<keyof MAPPED, MAPPED[keyof MAPPED]>

type MutationInterceptionMap2<T extends object> = MappedTypeToMap<MutationInterception<T>>
*/

const falsey_mutation = () => false

const createProxyHandler = <T extends object>(
	intercept_members: InterceptMutationMembers<T> | undefined = {},
	intercept_methods: InterceptMutationMethods<T> | undefined = {},
): ProxyHandler<T> => {
	const
		mutation_members_map = new Map<keyof T, <PROP extends T[keyof T]>(this: T, prev_value: PROP | undefined, new_value: PROP) => boolean>(),
		mutation_methods_map = new Map<keyof T, (this: T, ...args: any[]) => boolean>(),
		mutation_members_map_get = bind_map_get(mutation_members_map),
		mutation_methods_map_get = bind_map_get(mutation_methods_map),
		mutation_members_map_set = bind_map_set(mutation_members_map),
		mutation_methods_map_set = bind_map_set(mutation_methods_map)

	for (const [member_key, member_equals_fn] of object_entries(intercept_members) as unknown as [keyof T, undefined | false | (<PROP extends T[keyof T]>(this: T, prev_value: PROP | undefined, new_value: PROP) => boolean)][]) {
		mutation_members_map_set(member_key, parseEquality(member_equals_fn))
	}
	for (const [method_key, method_mutation_equals_fn] of object_entries(intercept_methods) as unknown as [keyof T, undefined | false | ((this: T, ...args: any[]) => boolean)][]) {
		const
			equals_fn: (this: T, ...args: any[]) => boolean = method_mutation_equals_fn || falsey_mutation,
			overloaded_method = function (this: T, ...args: any[]) {
				(this[method_key] as CallableFunction)(...args)
				return equals_fn.apply(this, args)
			}
		mutation_methods_map_set(method_key, overloaded_method)
	}

	return {
		get(target: T, key) {
			const prop = mutation_methods_map_get(key as keyof T) ?? Reflect.get(target, key)
			console.log("get key:", key)
			console.log("got item:", prop)
			return isFunction(prop) ? prop.bind(target) : prop
		},
		set(target: T, key, new_value) {
			mutation_members_map_get(key as keyof T)?.call(target,
				target[key as keyof T], new_value
			) ?? Reflect.set(target, key, new_value)
			return true
		},
	}
}

const my_map = new Map<number, string>()
const my_map_proxy = new Proxy(my_map, createProxyHandler<typeof my_map>({
	size: function (old_size, new_size) {
		console.log("you may not set old size:", old_size, "to new size:", new_size)
		return false
	}
}, {
	delete: function (key) {
		console.log("you tried to delete", key)
		console.log(this)
		if (this.has(key)) {
			console.log("fire the deletion squad")
			return false
		}
		return true
	}
}))

my_map_proxy.delete(123)
my_map_proxy.set(123, "wahid, ithnan, thalatha")
my_map_proxy.delete(123)


// addEdge(id, idObj)



