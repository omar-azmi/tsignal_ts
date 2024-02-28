import { Context, EffectSignal_Factory, MemoSignal_Factory, RecordStateSignal_Factory, StateSignal_Factory } from "../../src/mod.ts"

export const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createRecordState = ctx.addClass(RecordStateSignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory)


export const createLocalStore = <T extends Object>(
	name: string,
	init: T,
) => {
	const localState = localStorage.getItem(name)
	const [idRecord, getRecord, setRecord, , deleteRecord] = createRecordState(
		localState ? JSON.parse(localState) : init
	)
	createEffect(
		(id) => localStorage.setItem(name, JSON.stringify(getRecord(id)[0])),
		{ defer: false }
	)
	return [getRecord, setRecord, deleteRecord] as const
}

export const removeIndex = <T>(array: readonly T[], index: number): T[] => {
	return [...array.slice(0, index), ...array.slice(index + 1)]
}
