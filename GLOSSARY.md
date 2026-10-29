# jk-nav

jk-nav is a browser extension that lets a person read and move around web pages with single keys, Vim-style. It is a fork of Upstream that adds Tab switches and runs in Chrome and Firefox from one codebase.

## Language

### Project

**Upstream**:
The project jk-nav is forked from: `johnnymatthews/vim-style-page-navigation`, also published as "Simple Vim Scrolling".
_Avoid_: original, base, parent

**Restricted page**:
A page where the browser does not let extensions act, such as `chrome://`, `about:`, the extension stores, and built-in PDF viewers. No jk-nav key works on it.
_Avoid_: system page, protected page

### Keys

**Key**:
A physical key on the keyboard, named by the letter it carries in the QWERTY layout. `j` is that key pressed alone and `J` is it pressed with Shift; the active keyboard layout and Caps Lock do not change which Key it is.
_Avoid_: character, letter, keystroke

**Typing**:
The state in which keyboard focus is on something that takes text: a text field, a text area, a drop-down list, or editable page content. While Typing, no jk-nav Key has an effect. Focus on a button, checkbox, radio button, slider, or other control is not Typing.
_Avoid_: input mode, editing, form focus

### Scrolling

**Scroll step**:
The fixed distance one tap of `j` or `k` scrolls the page.
_Avoid_: scroll amount, tick

**Continuous scroll**:
Scrolling that runs while `j` or `k` stays held after the system key repeat begins, and stops when the Key is released.
_Avoid_: auto-scroll

**Scroll animation**:
The frame-by-frame movement that carries a Scroll step over its fixed distance.
_Avoid_: smooth scroll

### Link hints

**Link-hint mode**:
The state in which Link hints are shown and key presses select a Hint code instead of running their normal action.
_Avoid_: hint mode, follow mode

**Link hint**:
A small label shown next to one visible element that a person can activate: a link, a button, or a form field.
_Avoid_: hint marker, badge

**Hint code**:
The two characters printed on a Link hint; typing them activates that element.
_Avoid_: label, shortcut

### Tabs

**Tab switch**:
Activation of the Left tab or the Right tab in the current window. It wraps around at the ends of the tab strip.
_Avoid_: tab navigation, tab cycling

**Left tab**:
The nearest tab to the left of the active tab in the tab strip, skipping hidden tabs and tabs in collapsed groups; for the first tab, the last one.
_Avoid_: previous tab (it also means the tab that was active before)

**Right tab**:
The nearest tab to the right of the active tab in the tab strip, skipping hidden tabs and tabs in collapsed groups; for the last tab, the first one.
_Avoid_: next tab
