import { createPackageJson, createTSConfigJson, dntBuild, emptyDir, getDenoJson, pathJoin } from "./build_tools.ts"


const npm_dir = "./npm/"
const deno_json_dir = "./"
const {
	name: library_name = "library",
	exports,
	node_packageManager,
} = await getDenoJson(deno_json_dir)
const mainEntrypoint = exports["."]

const package_json = await createPackageJson(deno_json_dir, {
	scripts: {
		"build-dist": `npm run build-esm && npm run build-esm-minify && npm run build-iife && npm run build-iife-minify`,
		"build-esm": `npx esbuild "${mainEntrypoint}" --bundle --format=esm --outfile="./dist/${library_name}.esm.js"`,
		"build-esm-minify": `npx esbuild "${mainEntrypoint}" --bundle --minify --format=esm --outfile="./dist/${library_name}.esm.min.js"`,
		"build-iife": `npx esbuild "${mainEntrypoint}" --bundle --format=iife --outfile="./dist/${library_name}.iife.js"`,
		"build-iife-minify": `npx esbuild "${mainEntrypoint}" --bundle --minify --format=iife --outfile="./dist/${library_name}.iife.min.js"`,
	}
})
const tsconfig_json = await createTSConfigJson(deno_json_dir)
// we must delete the `exports` property, as it will override the correct version generated by `dntBuild`.
delete package_json["exports"]

await emptyDir(npm_dir)
await dntBuild({
	entryPoints: Object.entries(exports).map(([export_path, source_path]) => ({
		name: export_path,
		path: source_path,
	})),
	outDir: npm_dir,
	shims: { deno: "dev" },
	packageManager: node_packageManager,
	package: {
		...package_json
	},
	compilerOptions: { ...tsconfig_json.compilerOptions, target: "Latest" },
	typeCheck: false,
	declaration: "inline",
	esModule: true,
	scriptModule: false,
	test: false,
	// override the test pattern, so that no tests are included, and no Deno.test shims are created for the entirety of the transpiled package.
	// see the details here: "https://github.com/denoland/dnt?tab=readme-ov-file#test-file-matching"
	testPattern: "TEST_NOTHING",
	// TODO: there's no need for mapping, as jsr imports are converted into npm-compatible packages on the fly.
	// however, I loose the ability to map it from my package's npm releases as a consequence.
	// consider whether or not I'd like to have my dependencies as jsr imports or npm imports.
	// mappings: Object.fromEntries(
	// 	["binder", "builtin_aliases_deps", "lambda", "struct", "typedefs",].map((submodule_path) => {
	// 		return [
	// 			"jsr:@oazmi/kitchensink@0.7.5/" + submodule_path,
	// 			{
	// 				name: "@oazmi/kitchensink",
	// 				version: "0.7.5-a",
	// 				subPath: submodule_path,
	// 			}
	// 		]
	// 	})
	// )
})

// copy other files
await Deno.copyFile("./readme.md", pathJoin(npm_dir, "readme.md"))
await Deno.copyFile("./license.md", pathJoin(npm_dir, "license.md"))
await Deno.copyFile("./.github/code_of_conduct.md", pathJoin(npm_dir, "code_of_conduct.md"))
await Deno.writeTextFile(pathJoin(npm_dir, ".gitignore"), "/node_modules/\n")
await Deno.writeTextFile(pathJoin(npm_dir, "tsconfig.json"), JSON.stringify(tsconfig_json))
await Deno.writeTextFile(pathJoin(npm_dir, ".npmignore"), `
code_of_conduct.md
dist/
docs/
docs_config/
test/
tsconfig.json
typedoc.json
`, { append: true })
