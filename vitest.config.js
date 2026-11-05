import { defineConfig, loadEnv } from "vite";
import path from "node:path";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

/**
 * Integration tests in this suite CREATE and ARCHIVE rows, and their
 * documented cleanup is `supabase db reset`. Against production that is
 * destructive.
 *
 * Checking which .env file loads is not a safeguard: .env.local is exactly
 * the file this project tells you to overwrite with production credentials
 * when testing against live (see the comment in .env.local). So assert the
 * resolved HOST instead, and fail closed before a single test runs.
 *
 * @param {string | undefined} url
 */
function assertLocalSupabase(url) {
	if (!url) {
		throw new Error(
			"PUBLIC_SUPABASE_URL is not set. Integration tests need the local stack: `supabase start --exclude logflare,vector`.",
		);
	}

	let hostname;
	try {
		hostname = new URL(url).hostname;
	} catch {
		throw new Error(`PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
	}

	if (!LOCAL_HOSTS.has(hostname)) {
		throw new Error(
			`Refusing to run tests against a non-local Supabase host: ${hostname}.\n` +
				"These tests create and archive rows. Point .env.local back at the local " +
				"Docker stack (http://127.0.0.1:54321) before running them.",
		);
	}
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "PUBLIC_");
	assertLocalSupabase(env.PUBLIC_SUPABASE_URL);

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
