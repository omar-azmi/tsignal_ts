
import { ListSignal_Factory } from "../src/collection_signal.ts"
import { Context } from "../src/context.ts"
import { EffectSignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"
import type { ID } from "../src/typedefs.ts"


type Task = string

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory),
	createList = ctx.addClass(ListSignal_Factory)

const
	[idTask1, getTask1, setTask1] = createState<Task>("[ ] clean room"),
	[idTask2, getTask2, setTask2] = createState<Task>("[ ] wash dishes"),
	[idTask3, getTask3, setTask3] = createState<Task>("[ ] eat carrots"),
	[idTask4, getTask4] = createMemo<Task>((id: ID) => {
		const
			task1 = getTask1(id),
			task2 = getTask2(id),
			both_done = (task1[1] === "x" && task2[1] === "x") ? "x" : " ",
			both_tasks = task1.substring(4) + " AND " + task2.substring(4)
		return `[${both_done}] ${both_tasks}`
	}),
	[idTask5, getTask5] = createMemo<Task>((id: ID) => {
		const
			you_are_full = getTask3(id)[1] === "x" ? "full" : undefined,
			you_are_tired = getTask4(id)[1] === "x" ? "tired" : undefined,
			your_status = (you_are_full || you_are_tired)
				? "you are " + (you_are_full ?? you_are_tired) + (you_are_tired
					? " AND " + you_are_tired
					: ""
				)
				: undefined
		return `[${your_status ? "x" : " "}] status: ${your_status ?? "blank"}`
	})

Deno.test("test1", () => {
	const [idAllTasks, getAllTasks, allTasks] = createList([getTask1, getTask2, getTask3])
	let number_of_all_tasks_updates = 0
	createEffect((id) => {
		const all_tasks = getAllTasks(id)
		console.log("All tasks updated for the: ", number_of_all_tasks_updates++, "th time\n", all_tasks)
	}, { defer: false })
	// pushing pre-existing tasks will rerun the signal, since the array has mutated.
	// but it will not bother adding the new entries as _new dependencies_, since it is aware that they had pre-existed (thanks to reference counting).
	allTasks.push(getTask1, getTask2)
	// the four operations below are also mutative
	allTasks.set(3, getTask2)
	allTasks.swap(2, 4)
	allTasks.delete(2)
	allTasks.splice(2, 1)
	// swapping at the same index isn't mutative, so it doesn't fire an update signal
	allTasks.swap(0, 0)
	// you may also batch single actions together, so that only update cycle is fired, consisting of all the batched changes
	ctx.batch.scopedBatching(() => {
		allTasks.insert(0, getTask5)
		allTasks.insert(-2, getTask4)
	})
	// updating an entry inside of the List will cause the list to also update.
	ctx.batch.scopedBatching(() => {
		setTask1("[x] clean room")
		setTask3("[x] eat carrots")
	})
	// removing some dependencies (so that they are no longer connected to the subgraph containing the list),
	// and then updating those removed dependencies will not update the list.
	ctx.batch.scopedBatching(() => {
		allTasks.delete(0) // this is `getTask5` (your status)
		allTasks.delete(-1) // this is `getTask3` (eat carrot)
		allTasks.delete(1) // this is `getTask2` (wash dishes)
	})
	// since `getTask3` vertex is no longer either a direct or indirect dependency of the List, so updating it will not cause the List to update
	setTask3("[ ] eat carrots")
	// however, since `getTask2` is indirectly a dependency of the List (via `getTask4`), so updating it will cause the List to update
	setTask2("[x] wash dishes")
})
