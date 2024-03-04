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
	mappings: Object.fromEntries(
		// TODO: ISSUE: `dnt` won't currently work with `jsr` imports, not until the following issue is resolved: https://github.com/denoland/dnt/issues/378
		["binder", "builtin_aliases_deps", "lambda", "struct", "typedefs",].map((submodule_path) => {
			return [
				"jsr:@azmi/kitchensink@0.7.5/" + submodule_path,
				{
					name: "@azmi/kitchensink",
					version: "^0.7.5",
					subPath: submodule_path,
				}
			]
		})
	)
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
