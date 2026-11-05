import { defineConfig, loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
	// Integration tests talk to the local Supabase stack. Mode is 'test' here,
	// so .env.production.local is never loaded — tests cannot reach production.
	const env = loadEnv(mode, process.cwd(), "PUBLIC_");

	return {
		resolve: {
			alias: {
				$lib: path.resolve("./src/lib"),
				"$env/static/public": path.resolve("./test/shims/publicEnv.js"),
			},
		},
		test: {
			environment: "node",
			include: ["src/**/*.test.js"],
			env,
			// Integration tests share one local database.
			fileParallelism: false,
		},
	};
});
