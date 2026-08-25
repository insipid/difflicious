/**
 * Theme switching from the browser console.
 *
 * HACK — kept deliberately, called out deliberately.
 *
 * There is no theme picker in the UI yet, so the only way to change theme is to
 * set a cookie by hand (see docs/THEMING.md) or restart the server. This hangs a
 * method off a global for every registered theme so that typing
 * `Difflicious.theme.` in devtools autocompletes the list:
 *
 *     Difflicious.theme.riso()      // set the cookie, reload
 *     Difflicious.theme.clear()     // back to the server's own theme
 *
 * That autocompletion is the entire point, and the only justification for
 * generating a method per theme instead of exposing one honest
 * `setTheme(name)`. What is wrong with it, so nobody has to work it out again:
 *
 *   - it puts a name on `window`, which nothing else in this app does;
 *   - it ships a developer convenience to every user in every environment;
 *   - the methods reload the page, so they are statements wearing the costume
 *     of expressions.
 *
 * Delete the module and its two `window.DIFFLICIOUS_THEME*` lines in base.html
 * the moment a real theme control exists. The cookie is validated server-side
 * by config.theme_from_cookie, which accepts registered names only — so the
 * worst a wrong value here can do is nothing at all.
 */

/** A year, matching the max-age documented in docs/THEMING.md. */
const COOKIE_MAX_AGE_SECONDS = 31536000;

/**
 * Install `window.Difflicious.theme` with one method per registered theme.
 *
 * @param {object} [options] - Seams for testing; defaults read the page.
 * @param {Array<string>} [options.themes] - Registered theme names.
 * @param {string} [options.cookieName] - Name of the theme cookie.
 * @param {object} [options.target] - Object to hang the global off.
 * @param {Function} [options.reload] - How to reload after setting the cookie.
 * @returns {object|null} The installed theme object, or null if not installed
 */
export function installThemeConsole({
    themes = window.DIFFLICIOUS_THEMES,
    cookieName = window.DIFFLICIOUS_THEME_COOKIE,
    target = window,
    reload = () => window.location.reload()
} = {}) {
    if (!cookieName || !Array.isArray(themes) || themes.length === 0) return null;

    const write = (value, maxAge) => {
        document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
        reload();
        return value;
    };

    const theme = {};
    themes.forEach((name) => {
        theme[name] = () => write(name, COOKIE_MAX_AGE_SECONDS);
    });

    // Sits among the theme names on purpose: whoever finds the switcher by
    // autocompleting needs to find its undo the same way.
    theme.clear = () => write('', 0);

    target.Difflicious = target.Difflicious || {};
    target.Difflicious.theme = theme;
    return theme;
}
