import autoprefixer from "autoprefixer"
import tailwindcss from "tailwindcss"
import { defineConfig } from "tsup"

export default defineConfig(options => {
	return {
		entry: ["src/**/*.ts"],
		dts: true,
		watch: options.watch,
		sourcemap: true,
		minify: true,
		target: "es2020",
		format: ["cjs", "esm"]
	}
})
