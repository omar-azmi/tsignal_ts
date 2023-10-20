import { Context } from "../src/context.ts"
import { MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory)

/** our signals are initally organized as follows:
 * A────┬──────────────┬──────────────┐
 *     ╭┼╮            ╭┼╮             │
 * B ──┘│└───┬────┬───┘│└────────┐    │
 *      │    │   ╭┼╮  ╭┼╮        │    │
 * C────┼────┼───┘│└──┘│└───┬────┤    │
 *      │    │    │    │    │    │    │
 *      ▼    ▼    │    │    │    │    │
 *      D    E    │    │    │    │    │
 *      │    └╮   ▼    ▼    │    │    │
 *      ├─────┼──►F───►G    │    │    │
 *      │    ┌╯             ▼    │    │
 *      │    └─────────────►H    │    │
 *      │                        ▼    ▼
 *      └───────────────────────►I───►J
*/

const
	[idA, A, setA] = createState(1, { name: "A", equals: false }),
	[idB, B, setB] = createState(2, { name: "B", equals: false }),
	[idC, C, setC] = createState(3, { name: "C", equals: false }),
	[idD, D] = createMemo((id) => { console.log("D"); return A(id) + C(id) }, { name: "D", equals: false }),
	[idE, E] = createMemo((id) => { console.log("E"); return B(id) + C(id) }, { name: "E", equals: false }),
	[idF, F] = createMemo((id) => { console.log("F"); return B(id) + D(id) }, { name: "F", equals: false }),
	[idG, G] = createMemo((id) => { console.log("G"); return A(id) + F(id) }, { name: "G", equals: false }),
	[idH, H] = createMemo((id) => { console.log("H"); return C(id) + E(id) }, { name: "H", equals: false }),
	[idI, I] = createMemo((id) => { console.log("I"); return B(id) + C(id) + D(id) }, { name: "I", equals: false }),
	[idJ, J] = createMemo((id) => { console.log("J"); return A(id) + I(id) }, { name: "J", equals: false })

G()
H()
J()
console.clear()

Deno.test("test signal node swapping", () => {
	console.log("setting A")
	setA(1)
	console.log("setting C")
	setC(3)
	console.log("swap A with C")
	ctx.swapId(idA, idC)
	/** now, our signals are organized as follows:
	 * C────┬──────────────┬──────────────┐
	 *     ╭┼╮            ╭┼╮             │
	 * B ──┘│└───┬────┬───┘│└────────┐    │
	 *      │    │   ╭┼╮  ╭┼╮        │    │
	 * A────┼────┼───┘│└──┘│└───┬────┤    │
	 *      │    │    │    │    │    │    │
	 *      ▼    ▼    │    │    │    │    │
	 *      D    E    │    │    │    │    │
	 *      │    └╮   ▼    ▼    │    │    │
	 *      ├─────┼──►F───►G    │    │    │
	 *      │    ┌╯             ▼    │    │
	 *      │    └─────────────►H    │    │
	 *      │                        ▼    ▼
	 *      └───────────────────────►I───►J
	*/
	console.log("setting A (which should now perform the same action to direct depends of former C)")
	setA(1)
	console.log("setting C (which should now perform the same action to direct depends of former A)")
	setC(3)
	console.log("swap A with C again to restore initial configuration")
	ctx.swapId(idA, idC)
	console.log("setting A (which should now behave just like the original)")
	setA(1)
	console.log("setting C (which should now behave just like the original)")
	setC(3)
})

Deno.test("test signal dependency edge deletion and manual addition", () => {
	console.log("setting A")
	setA(1)
	console.log("deleting the edge A -> D, which should in turn stop the updating of D, I, and J")
	ctx.delEdge(idA, idD)
	/** our signals are initally organized as follows:
	 * A───────────────────┬──────────────┐
	 *                    ╭┼╮             │
	 * B ────────┬────┬───┘│└────────┐    │
	 *           │   ╭┼╮  ╭┼╮        │    │
	 * C────┬────┼───┘│└──┘│└───┬────┤    │
	 *      │    │    │    │    │    │    │
	 *      ▼    ▼    │    │    │    │    │
	 *      D    E    │    │    │    │    │
	 *      │    └╮   ▼    ▼    │    │    │
	 *      ├─────┼──►F───►G    │    │    │
	 *      │    ┌╯             ▼    │    │
	 *      │    └─────────────►H    │    │
	 *      │                        ▼    ▼
	 *      └───────────────────────►I───►J
	*/
	console.log("setting A, with deleted A -> D edge")
	setA(1)
	console.log("re-adding edge A -> D, to return the initial configuration")
	ctx.addEdge(idA, idD)
	console.log("setting A, with edge A -> D re-added")
	setA(1)
})
