import { assert } from "https://deno.land/std/testing/asserts.ts"
import { Context } from "../src/context.ts"
import { EffectSignal_Factory, LazySignal_Factory, MemoSignal_Factory, StateSignal_Factory, } from "../src/signal.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createLazy = ctx.addClass(LazySignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory)

Deno.test("create a signal and test getter and setter functions", () => {
	const [, getValue, setValue] = createState<number>(0)
	assert(getValue() === 0)
	setValue(42)
	assert(getValue() === 42)
})

Deno.test("create a memo and test its memorization and reactivity with signals", () => {
	let counter = 0
	const [, memo1] = createMemo((id) => (counter++))
	assert(memo1() === 0)
	assert(memo1() === 0) // memoized value remains the same

	const [, getCounter, setCounter] = createState<number>(0)
	let times_memo_was_run: number = 0
	const [, memo2] = createMemo((id) => {
		times_memo_was_run++
		let double = getCounter(id) * 2
		return double
	})
	assert((memo2() === 0) && (times_memo_was_run === 1 as number))
	setCounter(5)
	assert((memo2() === 10) && (times_memo_was_run === 2 as number))
	setCounter(5.0) // same value as before, therefore, signal should NOT notify its `memo2` observer to rerun
	assert((memo2() === 10) && (times_memo_was_run === 2 as number))
})

Deno.test("create and execute an effect", () => {
	// test option `{ defer?: false }`, to fire the effect right after initialization
	let times_effect_was_run: number = 0
	const [, getEffect1, fireEffect1] = createEffect((id) => {
		times_effect_was_run++
	}, { defer: false })
	assert(times_effect_was_run === 1)

	const [, getCounter, setCounter] = createState<number>(0)
	let times_effect_was_run2: number = 0

	// test option `{ defer?: true }` and dependance on another effect signal
	const [, getEffect2, fireEffect2] = createEffect((id) => {
		getEffect1(id) // here, we declare that we are depending on `effect1`, therefore `effect2` must rerun each time `effect1` is run
		times_effect_was_run2++
		console.log(times_effect_was_run2)
		let double = getCounter(id) * 2
		return undefined
	})
	assert(times_effect_was_run2 === 0 && times_effect_was_run === 1)
	setCounter(2)
	assert(times_effect_was_run2 === 0 && times_effect_was_run === 1) // because `effect2` has never been run before (due to `{ defer: undefined }`), it must at least run once so as to capture all of its dependencies
	fireEffect2() // dependencies of `effect2` have been captured now, and `effect2` will now react to any of its two dependencies
	assert(times_effect_was_run2 === 1 as number && times_effect_was_run === 1 as number)
	setCounter(5)
	assert(times_effect_was_run2 === 2 as number)
	setCounter(5.0) //same value as before, therefore, signal should NOT notify its `effect2` observer to rerun
	assert(times_effect_was_run2 === 2 as number)
	fireEffect2() // manually firing `effect2` to run again
	assert(times_effect_was_run2 === 3 as number)
	fireEffect1() // manually firing and running `effect1`, and running `effect2` as a consequence
	assert(times_effect_was_run2 === 4 as number && times_effect_was_run === 2 as number)
	//TODO trigger cleanup and implement async testing
})

Deno.test("batch set", () => {
	let counter = 0
	const [, getCounter1, setCounter1] = createState<number>(0)
	const [, getCounter2, setCounter2] = createState<number>(0)
	const [, getCounter3, setCounter3] = createState<number>(0)

	createEffect((id) => {
		getCounter1(id)
		getCounter2(id)
		getCounter3(id)
		counter++
	}, { defer: false })
	assert(counter === 1)
	// begin batching. this prevents any update cycle from firing, until `endBatching` is called,
	// upon which all fired events are ran all at once (of course, still respecting their topological ordering)
	ctx.batch.startBatching()
	setCounter1(1)
	setCounter2(2)
	setCounter3(3)
	ctx.batch.endBatching()
	assert((getCounter1() === 1) && (getCounter2() === 2) && (getCounter3() === 3))
	assert(counter === 2 as number)
})

Deno.test("untrack reactive dependencies", () => {
	let counter = 0
	const [, getCounter1, setCounter1] = createState<number>(0)
	const [, getCounter2, setCounter2] = createState<number>(0)
	const [, getCounter3, setCounter3] = createState<number>(0)
	createEffect((id) => {
		// not passing an `id` to dependency signals (or passing `id = 0`) will result in the signal not becoming a dependency
		getCounter1()
		getCounter2()
		getCounter3()
		counter++
	}, { defer: false })
	assert(counter === 1)
	setCounter1(1)
	setCounter2(2)
	setCounter3(3)
	assert((getCounter1() === 1) && (getCounter2() === 2) && (getCounter3() === 3))
	assert(counter === 1) // had `id` been passed to all 3 signals, this would have been: `counter === 1`
})

/*
Deno.test("evaluate function with explicit dependencies", () => {
	let counter = 0
	const [, getA, setA] = createState<number>(0)
	const [, getB, setB] = createState<number>(0)
	const [, getC, setC] = createState<number>(0)
	const dependencyFn = createMemo(dependsOn([getA, getB, getC], () => {
		counter++
		return getA() + getB()
	}))
	setA(1)
	setB(2)
	setC(3)
	assert(counter === 4)
	assert(dependencyFn() === 3)
})

Deno.test("create effect with explicit dependencies", () => {
	let counter = 0
	const [getA, setA] = createState<number>(0)
	const [getB, setB] = createState<number>(0)
	const [getC, setC] = createState<number>(0)
	createEffect(dependsOn([getA, getB, getC], () => {
		counter++
	}))
	assert(counter === 1 as number)
	setA(1)
	assert(counter === 2 as number)
	setB(2)
	assert(counter === 3 as number)
	setC(3)
	assert(counter === 4 as number)
})
*/
