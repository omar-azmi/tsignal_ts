/** */

import { Context } from "./context.ts"
import { RecordSignal_Factory } from "./mapped_signal.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "./signal.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createLazy = ctx.addClass(LazySignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory),
	createRecord = ctx.addClass(RecordSignal_Factory),
	setFn = ctx.dynamic.setFn

const
	[, A, setA] = createState(1, { name: "A" }),
	[, B, setB] = createState(2, { name: "B" }),
	[, C, setC] = createState(3, { name: "C" }),
	[, H] = createMemo((id) => (A(id) + G(id)), { name: "H" }),
	[, G] = createMemo((id) => (- D(id) + E(id) + 100), { name: "G" }),
	[, D] = createMemo((id) => (A(id) * 0 + 10), { name: "D" }),
	[, E] = createMemo((id) => (B(id) + F(id) + D(id) + C(id)), { name: "E" }),
	[, F] = createMemo((id) => (C(id) + 20), { name: "F" }),
	[, I] = createMemo((id) => (F(id) - 100), { name: "I" }),
	[idK, K, fireK] = createEffect((id) => { console.log("this is effect K, broadcasting", A(id), B(id), E(id)); J(id) }, { name: "K", dynamic: true }),
	[, J, fireJ] = createEffect((id) => { console.log("this is effect J, broadcasting", H(id), D(id), E(id)) }, { name: "J" })

I()
H()
K()
fireK()
setFn(idK, () => { console.log("effect K is now free of all worldy dependencies, yet it is still fired when one of its previous dependiencies are updated. so saj...") })
fireK()

const [idL, getL, setL, setsL, delL, delsL] = createRecord<number, string>(["1", "2", "3", "abc"])

/*
let start = performance.now()
for (let A_value = 0; A_value < 100_000; A_value++) {
	setA(A_value)
}
let end = performance.now()
console.log("time:\t", end - start, " ms") // takes 70ms to 130ms for updating signal `A` 100_000 times (with `DEBUG` off) (dfs nodes to update/visit are cached after first run)

setA(10)
setB(10)
*/
