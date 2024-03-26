/** some build specific utility functions */
export type {
	BuildOptions as ESBuildOptions,
	OutputFile as ESOutputFile,
	TransformOptions as ESTransformOptions
} from "https://deno.land/x/esbuild@v0.20.1/mod.js"
export { build as dntBuild } from "jsr:@deno/dnt@0.41.0"
export { copy as copyDir, emptyDir, ensureDir, ensureFile, walk as walkDir } from "jsr:@std/fs@0.218.2"
export { dirname as pathDirname, join as pathJoin, relative as relativePath } from "jsr:@std/path@0.218.2"
import {
	BuildOptions as ESBuildOptions,
	OutputFile as ESOutputFile,
	TransformOptions as ESTransformOptions,
	build as esbuild, stop as esstop, transform as estransform
} from "https://deno.land/x/esbuild@v0.20.1/mod.js"
import { BuildOptions, PackageJson } from "jsr:@deno/dnt@0.41.0"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9.0"
import { ensureDir } from "jsr:@std/fs@0.218.2"
import { join as pathJoin } from "jsr:@std/path@0.218.2"


export interface LeftoverArtifacts {
	cleanup: () => Promise<void>
}

export interface TemporaryFiles extends LeftoverArtifacts {
	dir: string
	files: string[]
}

interface NPM_Artifacts extends TemporaryFiles {
	files: ["package.json", "tsconfig.json"]
}

const get_deno_json = async () => { return (await import("./deno.json", { with: { type: "json" } })).default }
const add_leading_relative_path_slash = (path: string) => path.startsWith("./") ? path : "./" + path
let deno_json: ReturnType<typeof get_deno_json>
export const getDenoJson = async (base_dir: string = "./") => {
	deno_json ??= (await import(
		add_leading_relative_path_slash(pathJoin(base_dir, "./deno.json")),
		{ with: { type: "json" } })
	).default
	return deno_json
}

export const createPackageJson = async (deno_json_dir: string = "./", overrides: Partial<PackageJson> = {}): Promise<PackageJson> => {
	const { name, version, description, author, license, repository, bugs, exports, package_json } = await getDenoJson(deno_json_dir)
	// note that if you use dnt (deno-to-node), then you will have to delete the `exports` property, otherwise it will ruin the output.
	return {
		name: name ?? "",
		version: version ?? "0.0.0",
		description, author, license, repository, bugs, exports,
		...package_json,
		...overrides
	}
}

export const createTSConfigJson = async (deno_json_dir: string = "./", overrides: Partial<{ compilerOptions: BuildOptions["compilerOptions"] }> = {}): Promise<{ "$schema": string, compilerOptions: BuildOptions["compilerOptions"] }> => {
	const { compilerOptions } = await getDenoJson(deno_json_dir)
	// remove "deno.ns" from compiler options, as it breaks `dnt` (I think)
	compilerOptions.lib = (compilerOptions.lib).filter((v) => v.toLowerCase() !== "deno.ns")
	Object.assign(compilerOptions,
		{
			target: "ESNext",
			forceConsistentCasingInFileNames: true,
			skipLibCheck: true,
			moduleResolution: "nodenext",
		},
		overrides.compilerOptions,
	)
	delete overrides.compilerOptions
	return {
		"$schema": "https://json.schemastore.org/tsconfig",
		...overrides,
		compilerOptions,
	} as any
}

export const createNPMFiles = async (
	deno_json_dir: string = "./",
	npm_base_dir: string = "./",
	package_json_overrides: Partial<PackageJson> = {},
	tsconfig_json_overrides: any = {}
): Promise<NPM_Artifacts> => {
	const
		package_json_path = pathJoin(npm_base_dir, "package.json"),
		tsconfig_json_path = pathJoin(npm_base_dir, "tsconfig.json")

	await ensureDir(npm_base_dir)
	await Promise.all([
		createPackageJson(deno_json_dir, package_json_overrides)
			.then((package_json_output) => Deno.writeTextFile(
				pathJoin(npm_base_dir, "package.json"),
				JSON.stringify(package_json_output)
			)),
		createTSConfigJson(deno_json_dir, tsconfig_json_overrides)
			.then((tsconfig_json_output) => Deno.writeTextFile(
				pathJoin(npm_base_dir, "tsconfig.json"),
				JSON.stringify(tsconfig_json_output)
			)),
	])

	return {
		dir: npm_base_dir,
		files: ["package.json", "tsconfig.json"],
		cleanup: async () => {
			await Promise.all([
				Deno.remove(package_json_path, { recursive: true }),
				Deno.remove(tsconfig_json_path, { recursive: true }),
			])
		}
	}
}

export const doubleCompileFiles = async (
	compile_file_path: string,
	out_dir: string,
	override_bundle_options: ESBuildOptions = {},
	override_minify_options: ESTransformOptions = {},
	stop: boolean = true
) => {
	let t0 = performance.now(), t1: number

	const bundled_code = await esbuild({
		entryPoints: [compile_file_path],
		outdir: out_dir,
		bundle: true,
		minifySyntax: true,
		platform: "neutral",
		format: "esm",
		target: "esnext",
		plugins: [...denoPlugins()],
		...override_bundle_options,
		write: false,
	})

	const bundled_files = await Promise.all(bundled_code.outputFiles.map(
		async ({ text, path, hash }, file_number): Promise<ESOutputFile> => {
			const
				js_text = (await estransform(text, {
					minify: true,
					platform: "browser",
					format: "esm",
					target: "esnext",
					...override_minify_options
				})).code,
				js_text_uint8 = (new TextEncoder()).encode(js_text)
			console.log("bundled file", file_number, "\n\t", "output path:", path, "\n\t", "binary size:", js_text_uint8.byteLength / 1024, "kb")
			return {
				path,
				hash,
				text: js_text,
				contents: js_text_uint8
			}
		}
	))

	if (stop) { esstop() }
	t1 = performance.now()
	console.log("bundling time:", t1 - t0, "ms")
	return bundled_files
}
