import { build as esbuild, stop as esstop, transform as estransform } from "https://deno.land/x/esbuild@v0.17.19/mod.js"
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts"

/** use:
 * - `"./src/mod.ts"` for bundling the main module (default if unspecified in `Deno.args`)
 * - `"./examples/${num}/${script}.ts"` for compiling an example
*/
const
	compile_file = Deno.args[0] ?? "./src/mod.ts",
	outdir = "./dist/",
	compiled_file = `${outdir}${compile_file.split("/").reverse()[0].slice(0, -3)}.js`
let t0 = performance.now(), t1: number
const bundled_code = await esbuild({
	entryPoints: [compile_file],
	outdir: outdir,
	bundle: true,
	minifySyntax: true,
	platform: "neutral",
	format: "esm",
	target: "esnext",
	plugins: [...denoPlugins()],
	write: false,
})

await Promise.all(bundled_code.outputFiles.map(
	async ({ text, path }, file_number) => {
		return Deno.writeTextFile(path, (await estransform(text, {
			minify: true,
			platform: "neutral",
			format: "esm",
			target: "esnext",
		})).code).then(() => {
			console.log("file ", file_number, " binary size:", Deno.statSync(path).size / 1024, "kb")
		})
	}
))

esstop()
t1 = performance.now()
console.log("execution time:", t1 - t0, "ms")
//console.log("dist binary size:", Deno.statSync(compiled_file).size / 1024, "kb")
