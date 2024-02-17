import { assert } from "https://deno.land/std@0.204.0/testing/asserts.ts"
import { AsyncStateSignal_Factory } from "../src/async_signal.ts"
import { Context } from "../src/context.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"

const wait = (time_ms: number) => {
	return new Promise<void>((resolve, reject) => { setTimeout(resolve, time_ms) })
}

const eval_after = <T, ARGS extends any[]>(time_ms: number, fn: (...args: ARGS) => T, ...args: ARGS) => {
	return new Promise<T>((resolve, reject) => {
		setTimeout(() => { resolve(fn(...args)) }, time_ms)
	})
}

const reject_after = <T, ARGS extends any[]>(time_ms: number, fn: (...args: ARGS) => T, ...args: ARGS) => {
	return new Promise<T>((resolve, reject) => {
		setTimeout(() => { reject(fn(...args)) }, time_ms)
	})
}

const
	ctx = new Context(),
	createAsyncState = ctx.addClass(AsyncStateSignal_Factory),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createLazy = ctx.addClass(LazySignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory),
	setFn = ctx.dynamic.setFn

const
	[, A, setPromiseA] = createAsyncState(1, { name: "A" }),
	[, B, setB] = createState(2, { name: "B" }),
	[, C, setPromiseC] = createAsyncState(3, { name: "C" }),
	[, H] = createMemo((id) => (A(id) + G(id)), { name: "H" }),
	[, G] = createMemo((id) => (- D(id) + E(id) + 100), { name: "G" }),
	[, D] = createMemo((id) => (A(id) * 1 + 10), { name: "D" }),
	[, E] = createMemo((id) => (B(id) + F(id) + D(id) + C(id)), { name: "E" }),
	[, F] = createMemo((id) => (C(id) + 20), { name: "F" }),
	[, I] = createMemo((id) => (F(id) - 100), { name: "I" })
I()
H()

Deno.test("test synchronous behavior when non-promise value is used", () => {
	// non-promise values set on an AsyncStateSignal should fire immediately, and not await
	console.log("\n\tsynchronously firing: A, then B, then C")
	assert(H() === 129 && A() === 1 && B() === 2 && C() === 3)
	setPromiseA(5).then(() => {
		assert(H() === 140 && A() === 5 && B() === 5 && C() === 5)
		console.log("all values of signals A, B and C were synchronously set (followed with an update cycle) before this async log was made")
	})
	setB(5)
	setPromiseC(5)
})

Deno.test("test asynchronous behavior when promise value is used", async () => {
	setPromiseA(5)
	setB(5)
	setPromiseC(5)

	// promise values set on an AsyncStateSignal should be awaited before being fired
	console.log("\n\tasynchronously firing: A and C")
	const promise_c = eval_after(400, () => 40)
	const promise_a = eval_after(200, () => 20)
	setPromiseC(promise_c).then(() => console.log("promise_c was fulfilled, then an update cycle was fired, then this log was printed"))
	setPromiseA(promise_a).then(() => console.log("promise_a was fulfilled, then an update cycle was fired, then this log was printed"))
	assert((H() === 5 + 135) && (H() === A() + G()))
	await promise_a
	assert((H() === 20 + 135) && (H() === A() + G()))
	await promise_c
	assert((H() === 20 + 205) && (H() === A() + G()))
})

Deno.test("test asynchronous behavior when old promise is replaced", async () => {
	setPromiseA(5)
	setB(5)
	setPromiseC(5)

	console.log("\n\tasynchronously firing: A with three promises")
	const promise_a1 = eval_after(200, () => 22)
	const promise_a2 = eval_after(400, () => 21)
	const promise_a3 = eval_after(600, () => 20)

	eval_after(0, () => {
		setPromiseA(promise_a1).then((v) => {
			console.log("promise_a1 fulfilled and NOT overwritten by promise_a2. THIS SHOULD NOT HAPPEN!")
			assert(false && v === 22)
		})
	})
	eval_after(100, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a1 remains unresolved, hence the initial values
	eval_after(150, () => {
		setPromiseA(promise_a2).then((v) => {
			console.log("promise_a2 overridden promise_a1 (which then was unresolved), and promise_a2 is now fulfilled")
			assert(true && v === 21)
		})
	})
	eval_after(250, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a2 remains unresolved, however, promise_a1 must have resolved by now. but due to overriding, we should still expect initial values
	eval_after(450, () => assert(A() === 21 && (H() === 21 + 135) && (H() === A() + G()))) // promise_a2 should now be resolved, and we should expect `A() === 21`, and its consequent signal side-effects
	eval_after(500, () => {
		setPromiseA(promise_a3).then((v) => {
			console.log("promise_a3 fulfilled.")
			assert(true && v === 20)
		})
	})
	eval_after(700, () => assert(A() === 20 && (H() === 20 + 135) && (H() === A() + G()))) // promise_a3 should now be resolved, and we should expect `A() === 20`, and its consequent signal side-effects
	await wait(800)
})

Deno.test("test promise rejection with rejectable option", async () => {
	setPromiseA(5)
	setB(5)
	setPromiseC(5)

	console.log(
		"\n\tasynchronously firing: A with three promises.",
		"\n\t\tpromise_a1 should be overridden by promise_a2.",
		"\n\t\tpromise_a2 should be rejected then caught.",
		"\n\t\tpromise_a3 should be fulfilled"
	)
	const promise_a1 = eval_after(200, () => 22)
	const promise_a2 = reject_after(400, () => 21)
	const promise_a3 = reject_after(600, () => 20)

	eval_after(0, () => {
		setPromiseA(promise_a1).then((v) => {
			console.log("promise_a1 fulfilled and NOT overwritten by promise_a2. THIS SHOULD NOT HAPPEN!")
			assert(false && v === 22)
		})
	})
	eval_after(100, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a1 remains unresolved, hence the initial values
	eval_after(150, () => {
		setPromiseA(promise_a2, true).then(
			(v) => {
				console.log("promise_a2 overridden promise_a1, and promise_a2 is now fulfilled. THIS SHOULD NOT HAPPED!")
				assert(false && v === 21)
			},
			(reason) => {
				console.log("promise_a2 overridden promise_a1, and promise_a2 is now rejected.\n\tthis was logged because setPromiseA was set to be \"rejectable = true\".\n\treason for rejection: ", reason)
				assert(true)
			}
		)
	})
	eval_after(250, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a2 remains unresolved, however, promise_a1 must have resolved by now. but due to overriding, we should still expect initial values
	eval_after(450, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a2 should now be rejected, and we should still expect initial values
	eval_after(500, () => {
		setPromiseA(promise_a3).then(
			(v) => {
				console.log("promise_a3 fulfilled. THIS SHOULD NOT HAPPED!")
				assert(false && v === 20)
			},
			(reason) => {
				console.log("promise_a3 rejected. THIS SHOULD NOT HAPPEN!.\n\tbecause setPromiseA was set to be defaulted to \"rejectable = false\".\n\ttherefore, we should have expected setPromiseA to remain unresolved forever.\n\treason for rejection: ", reason)
				assert(false)
			}
		)
	})
	eval_after(700, () => assert(A() === 5 && (H() === 5 + 135) && (H() === A() + G()))) // promise_a3 should now be rejected, and we should still expect initial values
	await wait(800)
})
