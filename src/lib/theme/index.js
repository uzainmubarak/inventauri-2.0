// Light, dark or follow the system. The choice is kept in localStorage and applied as
// a `dark` class on <html>; app.css has the dark tokens. src/app.html applies it
// before first paint so there is no flash.

const KEY = "theme";
/** @typedef {"light" | "dark" | "system"} Theme */

/** @returns {Theme} */
export function getTheme() {
	try {
		const saved = localStorage.getItem(KEY);
		if (saved === "light" || saved === "dark") return saved;
	} catch {}
	return "system";
}

/** @param {Theme} theme */
export function isDark(theme) {
	return theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
}

/** Apply a theme to the page without saving it. @param {Theme} theme */
export function applyTheme(theme) {
	document.documentElement.classList.toggle("dark", isDark(theme));
}

/** Save and apply a theme. @param {Theme} theme */
export function setTheme(theme) {
	try {
		if (theme === "system") localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, theme);
	} catch {}
	applyTheme(theme);
}

/** Keep "system" in step with the OS. Returns a function that stops listening. */
export function watchSystemTheme() {
	const query = matchMedia("(prefers-color-scheme: dark)");
	const onChange = () => getTheme() === "system" && applyTheme("system");
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}
