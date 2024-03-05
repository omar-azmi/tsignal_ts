/** @jsx h */
/** @jsxFrag hf */

import { createHyperScript } from "../../src/jsx-runtime/mod.ts"
import { createEffect, createLocalStore, createMemo, createState, ctx } from "./utils.ts"

/** in the esbuild build options (`BuildOptions`), you must set `jsxFactory = "h"` and `jsxFragment = "hf"` */
export const [h, hf] = createHyperScript(ctx)

// const batch = ctx.batch.scopedBatching
const onInit = ctx.onInit

type TodoItem = { title: string; done: boolean }

const App = () => {
	const [, newTitle, setTitle] = createState("")
	const [getTodos, setTodos, deleteTodo] = createLocalStore<TodoItem[]>("todos", [])

	const addTodo = (e: SubmitEvent) => {
		e.preventDefault()
		// batch(() => {
		setTodos((getTodos()[0] as unknown as TodoItem[]).length, {
			title: newTitle(),
			done: false,
		})
		setTitle("")
		form_input.value = newTitle()
		// })
	}

	const form_input: HTMLInputElement = <input
		placeholder="enter todo and click +"
		required
	/>
	const form: HTMLFormElement = <form>
		{form_input}
		<button>+</button>
	</form>
	form.onsubmit = addTodo
	form_input.oninput = (e) => setTitle((e.currentTarget as typeof form_input)!.value ?? "")

	const todo_divs: (HTMLDivElement | undefined)[] = []
	const todos_div = <div>{...todo_divs}</div>
	createEffect((id) => {
		let [todos, ...changed_keys] = getTodos(id) as unknown as [TodoItem[], ...number[]]
		onInit(id, () => {
			changed_keys = [...todos.keys()].filter((key) => {
				const value = todos[key]
				return value !== undefined && value !== null
			})
		})
		for (const key of changed_keys) {
			const todo = todos[key]
			if (todo && key >= todo_divs.length) {
				// add a new div associated with the new key. existing keys are not processed, because they are reactive anyway
				const check_box: HTMLInputElement = <input
					type="checkbox"
					checked={createMemo((id) => {
						return (getTodos(id)[0][key] as TodoItem)?.done ? "" : undefined
					})[1]}
				/>
				const title_input: HTMLInputElement = <input
					type="text"
					value={createMemo((id) => {
						return (getTodos(id)[0][key] as TodoItem)?.title ?? ""
					})[1]}
				/>
				const delete_button: HTMLButtonElement = <button>x</button>
				const input_event_handler = (e: Event) => setTodos(key, {
					done: check_box.checked,
					title: title_input.value,
				})
				check_box.onchange = input_event_handler
				title_input.onchange = input_event_handler
				delete_button.onclick = () => deleteTodo(key)
				const todo_div: HTMLDivElement = <div>
					{check_box}
					{title_input}
					{delete_button}
				</div>
				todo_divs[key] = todo_div
				todos_div.append(todo_div)
			} else if (todo) {
				// modifying existing key
			} else {
				// remove the div associated with the key from the DOM (but it still exists within the memory, and so does its signals)
				todo_divs[key]?.remove()
				todo_divs[key] = undefined
			}
		}
	}, { defer: false })

	return (<>
		<h3>Simple Todos Example</h3>
		{form}
		{todos_div}
	</>)
}

document.getElementById("root")!.append(...App())
