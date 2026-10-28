# Vim-Style Page Navigation fork: tab switching + Chrome/Firefox — Requirements

Oct 28, 2026 · @Andrej

## 1. Goal

Fork [johnnymatthews/vim-style-page-navigation](https://github.com/johnnymatthews/vim-style-page-navigation) (MIT license). Keep all existing behavior. Add tab switching with `Shift+J`/`Shift+K`. Ship one codebase that builds for both Chrome and Firefox.

## 2. Upstream baseline

Checked on 2026-10-28.

- **Repository.** The old name `simple-vim-scrolling` redirects to `vim-style-page-navigation`; both are the same repo.
- **Default branch = Firefox build.** Manifest V2, one content script `page-navigator.js` (\~350 lines, vanilla JS), no permissions, no background script.
- **Chrome build.** The Chrome Web Store item "Simple Vim Scrolling" (v1.0, 2025-03-16) links its privacy policy to branch `feat/chrome-extension`. That branch's `manifest.json` returned 404, so the Chrome-specific source is missing or renamed. The fork starts from the default branch.
- **Existing keys (keep all):** `j`/`k` scroll, `gg` top, `G` bottom, `H`/`L` history back/forward, `f` link hints, `Esc` exits hints.

### Issues found in upstream code

- **No modifier check.** `Ctrl+F` also enters link-hint mode, because the handler only looks at `event.key`.
- **Continuous scroll may never stop.** Holding `j`/`k` starts a `setInterval`. No `keyup` handler that calls `stopContinuousScroll()` was found in the file. To verify by running the extension.
- **Window-only scrolling.** `window.scrollBy` does nothing on pages where an inner container scrolls (Gmail, Slack).
- **Typing detection is shallow.** `isUserTyping()` checks only `document.activeElement`, so inputs inside Shadow DOM are missed. It also treats a focused `<button>` as typing, so `j`/`k` stop working after clicking a button.
- **Icons.** `manifest.json` references `.jpg` icons, the README lists `.png`. Check which files exist.
- **Manifest V2.** Current Chrome no longer runs MV2 extensions, so a port to MV3 is required.

## 3. Functional requirements

### 3.1 New: tab switching

| Key | Action |
| --- | --- |
| `j` | Scroll down by one step |
| `k` | Scroll up by one step |
| `Shift+J` | Switch to the previous (left) tab |
| `Shift+K` | Switch to the next (right) tab |

- **FR-1.** Tab direction follows Vimium: `J` = left tab, `K` = right tab. The mapping lives in one constant so it can be swapped.
- **FR-2.** Switching wraps around: `Shift+K` on the last tab goes to the first, `Shift+J` on the first goes to the last.
- **FR-3.** Switching stays within the current window.
- **FR-4.** `J`/`K` follow the same ignore rules as the other keys: no action while typing or while link-hint mode is active.

### 3.2 Keep: existing behavior

- **FR-5.** All existing keys (`j`, `k`, `gg`, `G`, `H`, `L`, `f`, `Esc`) behave as upstream in both browsers.
- **FR-6.** The constants `SCROLL_AMOUNT` (60 px) and `SCROLL_SPEED` (10 ms) stay configurable in code.

### 3.3 Fixes (in scope)

- **FR-7.** Keys with `Ctrl`, `Alt`, or `Meta` held are ignored, so `Ctrl+F` opens the browser's find bar again. Link-hint mode opens only on a plain f key press with no modifiers held.
- **FR-8.** Keys are ignored during IME composition (`event.isComposing`).
- **FR-9.** Continuous scroll stops on `keyup` of `j`/`k` and on window `blur`.
- **FR-10.** Typing detection uses `event.composedPath()` to catch Shadow DOM inputs and `contenteditable`. A focused `<button>` does not count as typing.

### 3.4 Later (v2)

- Scroll the nearest scrollable container when the window itself does not scroll (Gmail, Slack).
- Per-site disable list.

## 4. Non-functional requirements

- **NFR-1. Manifest V3** for both browsers.
- **NFR-2. Permissions.** No API permissions. `tabs.query` and `tabs.update` work without the `tabs` permission because only tab `index` and `id` are used. Host access stays the content-script match `<all_urls>`.
- **NFR-3. No network.** No remote code, analytics, or requests.
- **NFR-4. Small.** The content script stays vanilla TypeScript with no UI framework.

## 5. Framework: WXT

WXT builds one codebase for Chrome, Firefox, Edge, and Safari. It generates the manifest per browser and handles the `chrome.*` vs `browser.*` API differences. It was actively maintained as of August 2026 (v0.21.4).

For this fork, WXT means a small restructure: `page-navigator.js` moves into `entrypoints/content.ts` almost unchanged, and `manifest.json` is replaced by `wxt.config.ts`.

| Option | Verdict |
| --- | --- |
| **WXT** | **Chosen.** Cross-browser builds, dev mode opens the browser with the extension loaded. |
| Plasmo | Rejected. React-first; repo still labelled alpha, last core release May 2025. |
| CRXJS | Rejected. A Vite plugin; less help with Firefox specifics. |
| No framework | Viable. Keep a hand-written MV3 manifest and test it in both browsers. Choose only if zero build tooling matters more than convenience. |

A content script is required for `J`/`K`: the `commands` manifest API only allows shortcuts with `Ctrl`/`Alt`.

## 6. Architecture

```
entrypoints/
  content.ts      // upstream page-navigator.js + J/K handling
  background.ts   // receives messages, switches tabs
public/icon/      // upstream icons
wxt.config.ts     // name, version, gecko id
```

- **content.ts** keeps the upstream `keydown` logic. On `J`/`K` it sends `{ cmd: "prevTab" }` or `{ cmd: "nextTab" }` via `browser.runtime.sendMessage`.
- **background.ts** handles the message: `tabs.query({ currentWindow: true })`, compute the target index with wrap-around, `tabs.update(id, { active: true })`.
- **Background lifetime.** Chrome runs it as a service worker, Firefox as an event page. WXT emits the right manifest key. The background stays stateless.
- **Firefox ID.** Set `browser_specific_settings.gecko.id` in `wxt.config.ts`; Firefox requires it for signing.
- **Credit.** Keep the upstream MIT license and author credit in the README.

## 7. Known limitations

- **Restricted pages.** No effect on `chrome://`, `about:`, Chrome Web Store, `addons.mozilla.org`, PDF viewers. Browsers block content scripts there.
- **Firefox host access.** In Firefox MV3 the user may need to allow access to all websites once after install. To verify.
- **Site conflicts.** Sites with their own `j`/`k` shortcuts (Gmail, GitHub, X) are overridden while focus is outside text fields. Accepted for v1.

## 8. Acceptance criteria

Done when, in the latest Chrome and the latest Firefox:

1. All upstream keys work on a normal article page.
2. Releasing `j`/`k` stops scrolling immediately.
3. `Shift+K` on the last tab activates the first; `Shift+J` on the first activates the last.
4. Typing `j`, `k`, `J`, `K`, `f` into a search field inserts the letters.
5. `Ctrl+F` opens the browser's find bar, not link hints.
6. `wxt zip` and `wxt zip -b firefox` both produce installable packages.

## 9. Setup steps

1. Fork `johnnymatthews/vim-style-page-navigation` on GitHub and clone it.
2. Run `npx wxt@latest init` in a new folder with the vanilla TypeScript template.
3. Copy the WXT scaffold (`package.json`, `wxt.config.ts`, `tsconfig.json`, `entrypoints/`) into the fork.
4. Delete the template's popup entrypoint.
5. Move `page-navigator.js` into `entrypoints/content.ts` inside `defineContentScript({ matches: ['<all_urls>'] })`.
6. Move the icons into `public/icon/` and delete the old `manifest.json`.
7. Add `entrypoints/background.ts` with the tab-switch handler.
8. Run `npm run dev` for Chrome or `npm run dev:firefox` for Firefox.

## Sources

- [vim-style-page-navigation (GitHub)](https://github.com/johnnymatthews/vim-style-page-navigation)
- [Simple Vim Scrolling (Chrome Web Store)](https://chromewebstore.google.com/detail/simple-vim-scrolling/abmmjelbbmjnlbeccocaepgefggghpbj)
- [WXT: Compare](https://wxt.dev/guide/resources/compare)
- [Plasmo vs WXT vs CRXJS vs Extension.js (merginit, Aug 2026)](https://merginit.com/blog/23082026-plasmo-vs-wxt-vs-crxjs-extension-js)
