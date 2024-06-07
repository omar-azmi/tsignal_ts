// reactively compute the bounding-boxes of many nested rectangles.
// the computation should be lazy: if the bounding-box of a child-rectangle hasn't changed, then it shouldn't invoke an update in its parent-rectangle.
// if the top-most rectangle's `right` or `top` bounding-box's sides exceed `600`, then we should log `"overflow"` in the console.
// at the end of every reaction cycle, log the number of computations done in the console.

import { Context } from "../src/context.ts"
import { EffectSignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"
import type { PureAccessor, PureSetter } from "../src/typedefs.ts"

/** `x` and `y` are relative to the parent-rectangle's top-left corner (which is their (x, y) position). */
interface Rect { x: number, y: number, width: number, height: number }

/** the bounding box of a `Rect` */
interface Box { left: number, top: number, right: number, bottom: number }

const signal_ctx = new Context()
const createState = signal_ctx.addClass(StateSignal_Factory)
const createMemo = signal_ctx.addClass(MemoSignal_Factory)
const createEffect = signal_ctx.addClass(EffectSignal_Factory)
const rectEqualityFn = (rect1: Rect | undefined, rect2: Rect): boolean => {
	return rect1 === undefined ? false :
		rect1.x === rect2.x &&
		rect1.y === rect2.y &&
		rect1.width === rect2.width &&
		rect1.height === rect2.height
}
const boxEqualityFn = (box1: Box | undefined, box2: Box): boolean => {
	return box1 === undefined ? false :
		box1.top === box2.top &&
		box1.left === box2.left &&
		box1.bottom === box2.bottom &&
		box1.right === box2.right
}

type RectangleObject = Rect & { children?: RectangleObject[] }

class Rectangle {
	rect: PureAccessor<Rect>
	setRect: PureSetter<Rect>
	box: PureAccessor<Box>
	children: Rectangle[] = []

	constructor(initial_rect: Rect) {
		const [idRect, getRect, setRect] = createState(initial_rect, { equals: rectEqualityFn })
		const [idBox, getBox] = createMemo<Box>((id) => {
			const { x, y, width, height } = getRect(id)
			const children_boxes = this.children.map((child) => child.box(idBox))
			const
				top = Math.min(y, ...children_boxes.map((child_box) => child_box.top)),
				left = Math.min(x, ...children_boxes.map((child_box) => child_box.left)),
				bottom = Math.max(y + height, ...children_boxes.map((child_box) => y + child_box.bottom)),
				right = Math.max(x + width, ...children_boxes.map((child_box) => x + child_box.right))
			return { top, left, bottom, right }
		}, { equals: boxEqualityFn })

		this.rect = getRect
		this.setRect = setRect
		this.box = getBox
	}

	render(ctx: CanvasRenderingContext2D) {
		const { x, y, width, height } = this.rect()
		const { top, left, bottom, right } = this.box()
		const children = this.children
		ctx.fillStyle = get_next_fillcolor()
		ctx.strokeStyle = get_next_strokecolor()
		ctx.fillRect(x, y, width, height)
		ctx.strokeRect(left, top, right - left, bottom - top)
		ctx.translate(x, y)
		for (const child of children) {
			child.render(ctx)
		}
		ctx.translate(-x, -y)
	}

	static fromObject(object: RectangleObject): Rectangle {
		const { children, ...rect } = object
		const instance = new Rectangle(rect)
		const children_instances = children?.map(Rectangle.fromObject) ?? []
		instance.children.push(...children_instances)
		return instance
	}
}

let color_idx = 0
const fillcolors = ["blue", "cyan", "goldenrod", "gray", "green", "khaki", "magenta", "orange", "orchid", "red", "salmon", "seagreen", "turquoise", "violet",]
const strokecolors = fillcolors.map((color) => "dark" + color)
const get_next_fillcolor = () => { return fillcolors[color_idx++ % fillcolors.length] }
const get_next_strokecolor = () => { return strokecolors[color_idx++ % strokecolors.length] }

const all_rectangles = Rectangle.fromObject({
	x: 10, y: 20, width: 70, height: 80, children: [
		{
			x: 15, y: 25, width: 50, height: 60, children: [
				{
					x: 20, y: 30, width: 40, height: 50, children: [
						{
							x: 25, y: 35, width: 30, height: 40, children: [
								{ x: 30, y: 40, width: 20, height: 30 },
								{ x: 35, y: 45, width: 10, height: 20 }
							]
						},
						{ x: 40, y: 50, width: 10, height: 20 }
					]
				},
				{
					x: 45, y: 55, width: 10, height: 15, children: [
						{ x: 0, y: 40, width: 30, height: 50 },
						{ x: 70, y: 80, width: 50, height: 20 }
					]
				}
			]
		},
		{ x: 50, y: 60, width: 40, height: 30 }
	]
})

const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")!
document.body.appendChild(canvas)

const [idRedraw, awaitRedraw, fireRedraw] = createEffect((id) => {
	// add dependence on all rectangles
	const add_dependence = (rect_object: Rectangle) => {
		rect_object.rect(id)
		rect_object.box(id)
		rect_object.children.forEach(add_dependence)
	}
	add_dependence(all_rectangles)

	color_idx = 0
	ctx.reset()
	ctx.scale(2, 2)
	all_rectangles.render(ctx)
})

fireRedraw()

// try the following lines in your console (one by one) to witness reactivity:
// all_rectangles.children[0].children[0].children[0].setRect({x:10, y:10, width: 20, height: 50})
// all_rectangles.children[0].children[1].setRect({x:50, y:50, width: 100, height: 50})

// unlike solidjs, you can define all derived signals, such as`MemoSignal`, before declaring the variables used in their computation function.
// this is because derived signals are deferred of their execution, until the first time someone actually uses them.
