import { Context } from "../src/context.ts"
import { RecordMemoSignal_Factory, RecordStateSignal_Factory } from "../src/mapped_signal.ts"
import { MemoSignal_Factory } from "../src/signal.ts"

type Rect = {
	top: number
	left: number
	bottom: number
	right: number
}

// A `LegalRect` must obey the physical constraints: `Rect.top <= Rect.bottom` and `Rect.left <= Rect.right`
type LegalRect = Rect

type BoundingBox = {
	minY: number
	minX: number
	maxY: number
	maxX: number
}

const
	ctx = new Context(),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createRecord = ctx.addClass(RecordStateSignal_Factory),
	createRecordMemo = ctx.addClass(RecordMemoSignal_Factory)

const
	[, getChangedRects, setRect, , delRect] = createRecord<number, Rect>([], {
		name: "AllRects",
		equals: (prev_rect, next_rect) => {
			const TOLERANCE = 10
			if (prev_rect === undefined || next_rect === undefined) { return false }
			if (
				Math.abs(prev_rect.top - next_rect.top) > TOLERANCE ||
				Math.abs(prev_rect.left - next_rect.left) > TOLERANCE ||
				Math.abs(prev_rect.bottom - next_rect.bottom) > TOLERANCE ||
				Math.abs(prev_rect.right - next_rect.right) > TOLERANCE
			) { return false }
			return true
		}
	}),
	[, getChangedLegalRects] = createRecordMemo<number, LegalRect>((id) => {
		// drop all illegal rects
		const
			[rects, ...changed_rect_keys] = getChangedRects(id),
			legal_rect_keys: number[] = [],
			legal_rect_values: LegalRect[] = []
		for (const i of changed_rect_keys) {
			const rect = rects[i]
			if (rect.top <= rect.bottom && rect.left <= rect.right) {
				legal_rect_keys.push(i)
				legal_rect_values.push(rect)
			} else {
				console.log("rect", i, "is illegal")
			}
		}
		return [legal_rect_keys, legal_rect_values]
	}, { name: "AllLegalRects", value: [] }),
	[, getBoundinBox] = createMemo<BoundingBox>((id) => {
		const [legal_rects, ...changed_keys] = getChangedLegalRects(id)
		const bb: BoundingBox = {
			minY: Math.min(2000, ...changed_keys.map((i) => legal_rects[i].top)),
			minX: Math.min(2000, ...changed_keys.map((i) => legal_rects[i].left)),
			maxY: Math.max(0, ...changed_keys.map((i) => legal_rects[i].bottom)),
			maxX: Math.max(0, ...changed_keys.map((i) => legal_rects[i].right))
		}
		console.log("bounding box update:", bb)
		return bb

	}, { name: "BoundingBoxMemo", equals: false, defer: false })
/** ### CONSOLE
UPDATE_CYCLE	visiting   :	undefined
UPDATE_CYCLE	propagating:	undefined
UPDATE_POSTRUNS:	[1]
GET:	AllRects     	by OBSERVER:	AllLegalRects  	with VALUE	[Array(0)]
GET:	AllLegalRects	by OBSERVER:	BoundingBoxMemo	with VALUE	[Array(0)]
bounding box update: {minY: 2000, minX: 2000, maxY: 0, maxX: 0}
GET:	BoundingBoxMemo	by OBSERVER:	untracked		with VALUE	{minY: 2000, minX: 2000, maxY: 0, maxX: 0}
undefined
*/

Deno.test("1", () => {
	setRect(1, { top: 10, left: 10, bottom: 990, right: 100 })
	/** ### CONSOLE
	UPDATE_CYCLE	visiting   :	AllRects
	UPDATE_CYCLE	propagating:	AllRects
	UPDATE_CYCLE	visiting   :	AllLegalRects
	GET:	AllRects		by OBSERVER:	untracked		with VALUE	(2) [Array(2), 1]
	UPDATE_CYCLE	propagating:	AllLegalRects
	UPDATE_CYCLE	visiting   :	BoundingBoxMemo
	GET:	AllLegalRects	by OBSERVER:	untracked		with VALUE	(2) [Array(2), 1]
	bounding box update: {minY: 10, minX: 10, maxY: 990, maxX: 100}
	UPDATE_CYCLE	propagating:	BoundingBoxMemo
	UPDATE_POSTRUNS:	(2) [2, 3]
	true
	*/
})

Deno.test("2", () => {
	ctx.batch.startBatching()
	setRect(0, { top: 10, left: 10, bottom: 990, right: 100 })
	setRect(2, { top: 500, left: 100, bottom: 300, right: 800 }) // this rect is illegal
	setRect(3, { top: 500, left: 500, bottom: 800, right: 800 })
	ctx.batch.endBatching()
	/**
	UPDATE_CYCLE	visiting   :	AllRects
	UPDATE_CYCLE	propagating:	AllRects
	UPDATE_CYCLE	visiting   :	AllLegalRects
	GET:	AllRects		by OBSERVER:	untracked	with VALUE	(4) [Array(4), 0, 2, 3]
	rect 2 is illegal
	UPDATE_CYCLE	propagating:	AllLegalRects
	UPDATE_CYCLE	visiting   :	BoundingBoxMemo
	GET:	AllLegalRects	by OBSERVER:	untracked	with VALUE	(3) [Array(4), 0, 3]
	bounding box update: {minY: 10, minX: 10, maxY: 990, maxX: 800}
	UPDATE_CYCLE	propagating:	BoundingBoxMemo
	UPDATE_POSTRUNS:	(2) [2, 3]
	undefined
	*/
})
