/** */

import { createContext } from "./context.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "./signal.ts"

const { createState, createMemo, createLazy, createEffect } = createContext({
	"createState": StateSignal_Factory,
	"createMemo": MemoSignal_Factory,
	"createLazy": LazySignal_Factory,
	"createEffect": EffectSignal_Factory,
})

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
let start = performance.now()
for (let A_value = 0; A_value < 100_000; A_value++) {
	setA(A_value)
}
let end = performance.now()
console.log("time:\t", end - start, " ms") // takes 160ms to 220ms for updating signal `A` 100_000 times (with `DEBUG` off) (dfs nodes to update/visit are cached after first run)

setA(10)
setB(10)
*/
