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
	[, A, setA] = createState(1, { equals: false, name: "A" }),
	[, B] = createMemo((id) => A(id), { equals: false, name: "B" }),
	[, C] = createMemo((id) => A(id), { equals: false, name: "C" }),
	[, D] = createMemo((id) => B(id), { equals: false, name: "D" }),
	[, E] = createMemo((id) => C(id), { equals: false, name: "E" }),
	[, F] = createMemo((id) => B(id) + C(id) + D(id) + E(id), { equals: false, name: "F" }),
	[, G] = createMemo((id) => D(id), { equals: false, name: "G" }),
	[, H] = createMemo((id) => E(id), { equals: false, name: "H" }),
	[, I] = createMemo((id) => F(id) + G(id) + H(id), { equals: false, name: "I" }),
	[, J] = createMemo((id) => I(id), { equals: false, name: "J" })

// @ts-ignore: enums can't be modified, but we want to control our logging here
// DEBUG.LOG = 1
// I()
// J()

Deno.test("test1", () => {
	// @ts-ignore: enums can't be modified, but we want to control our logging here
	DEBUG.LOG = 1
	I()
	J()
})

Deno.test("test2", () => {
	DEBUG.LOG = 1
	setA(2)
})
