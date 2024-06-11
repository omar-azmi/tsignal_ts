
import { UnisetStateSignal_Factory } from "../src/collection_signal.ts"
import { Context } from "../src/context.ts"
import { EffectSignal_Factory, MemoSignal_Factory, StateSignal_Factory } from "../src/signal.ts"

interface BookMeta {
	title: string
	author: string
	/** time published in milliseconds, since epoch. */
	published: number
	/** a dictionary of chapter numbers, and their corresponding chapter titles. */
	chapters?: { [chapter_number: number]: string }
}

const
	ctx = new Context(),
	createState = ctx.addClass(StateSignal_Factory),
	createMemo = ctx.addClass(MemoSignal_Factory),
	createEffect = ctx.addClass(EffectSignal_Factory),
	createUniset = ctx.addClass(UnisetStateSignal_Factory)

const
	[idBookA, getBookA, setBookA] = createState<BookMeta>({
		title: "first book",
		author: "first author",
		published: 0,
		chapters: { 0: "preface", 1: "oh no, it\'s explodia!, but no one\'s ever been able to summon him!", 99: "final chapter" }
	}, { equals: false }),
	[idBookB, getBookB, setBookB] = createState<BookMeta>({
		title: "second book",
		author: "second author",
		published: 1000,
	}, { equals: false }),
	[idBookC, getBookC, setBookC] = createState<BookMeta>({
		title: "third book",
		author: "third author",
		published: 2000,
	}, { equals: false }),
	[idBookD, getBookD] = createMemo<BookMeta>((id) => {
		// BookD is derived from BookA and BookB
		const
			{ author, chapters } = getBookA(id),
			{ title, published } = getBookB(id)
		return { title, author: author + "\'s grandson", published, chapters }
	}),
	[idBookE, getBookE] = createMemo<BookMeta>((id) => {
		// BookE is derived from BookA, BookC, and BookD
		const
			title = getBookA(id).title + ", edition D",
			{ published } = getBookC(id),
			{ author } = getBookD(id)
		return { title, author, published }
	})

Deno.test("test1", () => {
	const [idBooksUniset, getBooksUniset, addBooks, delBooks] = createUniset([getBookD, getBookA])
	createEffect((id) => {
		const all_books = getBooksUniset(id)
		console.log(all_books)
	}, { defer: false })
	// adding pre-existing items should not rerun the signal.
	addBooks(getBookA, getBookD)
	// updating `setBookA` should ultimately update `BooksUniset`, and make the logging effect afterwards.
	setBookA((prev) => {
		prev!.author = "1st author"
		return prev!
	})
	// removing pre-existing items should rerun the signal.
	// TODO: investigate why deletion and addition of items does not cause the signal to rerun. could it have something to do with the `this.run` code? 
	// scratch the above, it now works, because I should've used `ctx.runId` instead of `this.run`
	delBooks(getBookA)
	delBooks(getBookD)
	// now, updating `setBookA` will not rerun/update `BooksUniset`, since it is no longer dependent (whether directly, or indirectly) in signals `getBookA` and `getBookD`.
	setBookA((prev) => {
		prev!.author = "nein-th author"
		return prev!
	})
	console.log(getBooksUniset())
})

