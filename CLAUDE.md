# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

The spec is GitHub issue #1 (`gh issue view 1`). Read it before any work; it is the source of truth for keys, FR/NFR numbers, and acceptance criteria. Domain terms are in `GLOSSARY.md`.

This repo is `Seigiard/jk-nav`, a GitHub fork of `johnnymatthews/vim-style-page-navigation` (MIT; remote `upstream`). The goal is a port to Manifest V3 with WXT, so one codebase builds for Chrome and Firefox. The WXT port adds `Shift+J`/`Shift+K` tab switching and fixes the upstream bugs listed in the spec's Problem Statement.

Upstream has two release branches:

- `firefox/stable` is the default branch: MV2, `.jpg` icons.
- `chrome/stable` is already MV3, has `.png` icons and a `privacy-policy.txt`, and has a newer `page-navigator.js` with `keyup` and `blur` handlers. It is the WXT baseline (spec, Implementation Decisions).

## Commands

These are the WXT defaults the spec plans for. Once `package.json` exists, its `scripts` win over this list.

- `npm run dev`: start Chrome with the extension loaded and hot reload.
- `npm run dev:firefox`: the same for Firefox.
- `npx wxt zip` and `npx wxt zip -b firefox`: build the store packages. Both must succeed (acceptance criterion 6).

## Architecture

Two entrypoints, joined by one message:

- `entrypoints/content.ts` is upstream `page-navigator.js` inside `defineContentScript({ matches: ['<all_urls>'] })`. It owns all key handling. On `J`/`K` it sends one `browser.runtime.sendMessage` carrying the direction, left or right (glossary: Left tab, Right tab).
- `entrypoints/background.ts` is stateless. Chrome runs it as a service worker and Firefox as an event page, so keep no state in module variables. It calls `tabs.query({ windowId: sender.tab.windowId })`, picks the target with wrap-around, skipping hidden tabs and tabs in collapsed groups, then calls `tabs.update(id, { active: true })`.
- `wxt.config.ts` replaces `manifest.json`. It must set `browser_specific_settings.gecko.id`, which Firefox needs for signing.

Tab switching needs a content script: the `commands` manifest API accepts only shortcuts with `Ctrl` or `Alt`.

## Constraints

- One API permission: `tabGroups`, to skip tabs in collapsed groups (spec FR-3a, NFR-2). `tabs.query` and `tabs.update` work without the `tabs` permission because the code reads only tab `index`, `id`, `active`, `hidden`, and `groupId`. Adding another permission changes the store review, so treat it as a product decision.
- No network, remote code, or analytics.
- The content script stays vanilla TypeScript with no UI framework.
- Keep the `J` = left tab, `K` = right tab mapping in one constant (FR-1).
- Keep the upstream MIT license and author credit in the README.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Seigiard/jk-nav`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
