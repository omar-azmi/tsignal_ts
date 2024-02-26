import { Context } from "../src/context.ts"
import { DEBUG } from "../src/deps.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createLazy = ctx.addClass(LazySignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory),
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
	[, I] = createMemo((id) => (F(id) - 100), { name: "I" })

Deno.test("test logging", () => {
	// to see logging, make sure that `DEBUG.LOG === 1` in `deps.ts`, because setting it manually below simply does not work for some reason
	// @ts-ignore: enums can't be modified, but we want to control our logging here
	DEBUG.LOG = 1
	I()
	H()
})

Deno.test("test cached performance", () => {
	// @ts-ignore: don't want our performance test impacted by console logging
	DEBUG.LOG = 0
	let start = performance.now()
	for (let A_value = 0; A_value < 100_000; A_value++) {
		setA(A_value)
	}
	let end = performance.now()
	// takes 190ms to 235ms for updating signal `A` 100_000 times (with `DEBUG` off) (dfs nodes to update/visit are cached after first run)
	console.log("time:\t", end - start, " ms")
	setA(10)
	setB(10)
})

Deno.test("test uncached performance", () => {
	// @ts-ignore: don't want our performance test impacted by console logging
	DEBUG.LOG = 0
	// twice as slow as cached's performance
	const clear_dfs_cache = ctx.clearCache
	let start = performance.now()
	for (let A_value = 0; A_value < 100_000; A_value++) {
		clear_dfs_cache()
		setA(A_value)
	}
	let end = performance.now()
	// takes 520ms to 750ms for updating signal `A` 100_000 times (with `DEBUG` off)
	console.log("time:\t", end - start, " ms")
	setA(10)
	setB(10)
})

const
	[idK, K, fireK] = createEffect((id) => { console.log("this is effect K, broadcasting", A(id), B(id), E(id)); J(id) }, { name: "K" }),
	[, J, fireJ] = createEffect((id) => { console.log("this is effect J, broadcasting", H(id), D(id), E(id)) }, { name: "J" })

Deno.test("test effect and dynamic function modification", () => {
	// @ts-ignore: we wish to log signal update cycles once again
	DEBUG.LOG = 1
	K()
	fireK()
	setFn(idK, () => { console.log("effect K is now free of all worldy dependencies, yet it is still fired when one of its previous dependiencies are updated. so saj...") })
	fireK()
})
