/** */

import { createContext } from "./context.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "./signal.ts"

const { createState, createMemo, createLazy, createEffect } = createContext(
	["createState", StateSignal_Factory],
	["createMemo", MemoSignal_Factory],
	["createLazy", LazySignal_Factory],
	["createEffect", EffectSignal_Factory],
)

const
	[A, setA] = createState(1, { name: "A" }),
	[B, setB] = createState(2, { name: "B" }),
	[C, setC] = createState(3, { name: "C" }),
	H = createMemo((id) => (A(id) + G(id)), { name: "H" }),
	G = createMemo((id) => (- D(id) + E(id) + 100), { name: "G" }),
	D = createMemo((id) => (A(id) * 0 + 10), { name: "D" }),
	E = createMemo((id) => (B(id) + F(id) + D(id) + C(id)), { name: "E" }),
	F = createMemo((id) => (C(id) + 20), { name: "F" }),
	I = createMemo((id) => (F(id) - 100), { name: "I" }),
	[K, fireK] = createEffect((id) => { console.log("this is effect K, broadcasting", A(id), B(id), E(id)); J(id) }, { name: "K" }),
	[J, fireJ] = createEffect((id) => { console.log("this is effect J, broadcasting", H(id), D(id), E(id)) }, { name: "J" })

I()
H()
K()
fireK()

/*
const fromEntries = <K extends PropertyKey, V extends any>(entries: Iterable<readonly [K, V]>): { [KEY in K]: V } => {
	return Object.fromEntries(entries) as { [KEY in K]: V }
}

const B = fromEntries([["a" as const, 2 as const] as const, ["b" as const, 3 as const] as const] as const)
*/
