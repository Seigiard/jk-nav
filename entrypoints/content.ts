import {
  createKeyInterpreter,
  type KeyEffect,
  type KeyPress,
  type KeyResult,
} from '../utils/key-interpreter';
import { createTabSwitchMessage } from '../utils/tab-switch';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const SCROLL_AMOUNT = 60;
    const SCROLL_SPEED = 10;
    const NON_TYPING_INPUT_TYPES = new Set([
      'checkbox',
      'radio',
      'range',
      'color',
      'file',
      'button',
      'submit',
      'reset',
      'image',
    ]);

    type LinkHintType = 'link' | 'button' | 'input';

    interface LinkHint {
      element: HTMLDivElement;
      target: HTMLElement;
      code: string;
      type: LinkHintType;
    }

    interface VisibleElement {
      element: HTMLElement;
      type: LinkHintType;
    }

    const keyInterpreter = createKeyInterpreter();
    let linkHints: LinkHint[] = [];
    let visibleElements: VisibleElement[] = [];
    let scrollInterval: ReturnType<typeof setInterval> | null = null;

    createHintStyles();

    function startContinuousScroll(direction: 1 | -1): void {
      stopContinuousScroll();
      scrollInterval = setInterval(() => {
        window.scrollBy({
          top: SCROLL_AMOUNT * direction,
          behavior: 'auto',
        });
      }, SCROLL_SPEED);
    }

    function stopContinuousScroll(): void {
      if (scrollInterval !== null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    }

    function toKeyPress(event: KeyboardEvent): KeyPress {
      return {
        code: event.code,
        repeat: event.repeat,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey,
        isComposing: event.isComposing,
        typing: isUserTyping(event),
        trusted: event.isTrusted,
        timeStamp: event.timeStamp,
      };
    }

    function applyResult(result: KeyResult): void {
      for (const effect of result.effects) {
        applyEffect(effect);
      }

      if (result.consumed) {
        // The adapter owns the browser event. The interpreter owns the decision.
        currentEvent?.preventDefault();
      }
    }

    let currentEvent: KeyboardEvent | null = null;

    function applyEffect(effect: KeyEffect): void {
      switch (effect.kind) {
        case 'scrollStep':
          window.scrollBy({
            top: SCROLL_AMOUNT * effect.direction,
            behavior: 'auto',
          });
          return;
        case 'startContinuousScroll':
          startContinuousScroll(effect.direction);
          return;
        case 'stopContinuousScroll':
          stopContinuousScroll();
          return;
        case 'scrollToTop':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        case 'scrollToBottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          return;
        case 'historyBack':
          window.history.back();
          return;
        case 'historyForward':
          window.history.forward();
          return;
        case 'tabSwitch':
          void browser.runtime.sendMessage(createTabSwitchMessage(effect.direction)).catch(() => undefined);
          return;
        case 'collectLinkHintTargets':
          visibleElements = collectVisibleElements();
          applyResult(keyInterpreter.linkHintTargets(visibleElements.length));
          return;
        case 'showLinkHints':
          showLinkHints(effect.codes);
          return;
        case 'narrowLinkHints':
          narrowLinkHints(effect.visible);
          return;
        case 'activateLinkHint':
          activateLinkHint(effect.index);
          return;
        case 'exitLinkHints':
          exitLinkHintMode();
          return;
      }
    }

    function createHintStyles(): void {
      const style = document.createElement('style');
      style.id = 'vimnav-styles';
      style.textContent = `
        .vimnav-link-hint {
          position: fixed;
          background-color: #ffff00;
          color: #000000;
          border: 1px solid #000000;
          padding: 2px 4px;
          font-size: 12px;
          font-weight: bold;
          z-index: 2147483647;
          border-radius: 4px;
          box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3);
          font-family: monospace;
        }

        .vimnav-button-hint {
          background-color: #ffa500;
        }

        .vimnav-input-hint {
          background-color: #90ee90;
        }
      `;
      document.head.appendChild(style);
    }

    function collectVisibleElements(): VisibleElement[] {
      const elements: VisibleElement[] = [];
      const links = document.querySelectorAll('a');
      const buttons = document.querySelectorAll<HTMLElement>(
        'button, input[type="button"], input[type="submit"], [role="button"]',
      );
      const inputs = document.querySelectorAll<HTMLElement>(
        'input:not([type="button"]):not([type="submit"]), textarea, select',
      );

      links.forEach((element) => {
        if (isElementVisible(element)) {
          elements.push({ element, type: 'link' });
        }
      });
      buttons.forEach((element) => {
        if (isElementVisible(element)) {
          elements.push({ element, type: 'button' });
        }
      });
      inputs.forEach((element) => {
        if (isElementVisible(element)) {
          elements.push({ element, type: 'input' });
        }
      });

      return elements;
    }

    function isElementVisible(element: HTMLElement): boolean {
      const rect = element.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
        getComputedStyle(element).display !== 'none' &&
        getComputedStyle(element).visibility !== 'hidden' &&
        element.offsetParent !== null
      );
    }

    function showLinkHints(codes: string[]): void {
      clearLinkHints();

      visibleElements.forEach((item, index) => {
        const code = codes[index];
        if (code !== undefined) {
          createLinkHint(item.element, code, item.type);
        }
      });
    }

    function createLinkHint(element: HTMLElement, code: string, type: LinkHintType): void {
      const rect = element.getBoundingClientRect();
      const hintElement = document.createElement('div');
      hintElement.textContent = code;
      hintElement.className = 'vimnav-link-hint';

      if (type === 'button') {
        hintElement.classList.add('vimnav-button-hint');
      } else if (type === 'input') {
        hintElement.classList.add('vimnav-input-hint');
      }

      hintElement.style.top = `${rect.top - 10}px`;
      hintElement.style.left = `${rect.left - 10}px`;
      document.body.appendChild(hintElement);
      linkHints.push({ element: hintElement, target: element, code, type });
    }

    function narrowLinkHints(visible: number[]): void {
      const visibleSet = new Set(visible);
      linkHints.forEach((hint, index) => {
        if (visibleSet.has(index)) {
          hint.element.style.backgroundColor = '#88ff88';
        } else {
          hint.element.style.display = 'none';
        }
      });
    }

    function activateLinkHint(index: number): void {
      const hint = linkHints[index];
      if (hint !== undefined) {
        activateElement(hint.target, hint.type);
      }
    }

    function activateElement(element: HTMLElement, type: LinkHintType): void {
      if (type === 'input') {
        element.focus();
      } else {
        element.click();
      }
    }

    function exitLinkHintMode(): void {
      clearLinkHints();
      visibleElements = [];
    }

    function clearLinkHints(): void {
      linkHints.forEach((hint) => {
        hint.element.remove();
      });
      linkHints = [];
    }

    function isUserTyping(event: KeyboardEvent): boolean {
      for (const target of event.composedPath()) {
        if (!(target instanceof HTMLElement)) {
          continue;
        }

        if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
          return true;
        }

        if (target instanceof HTMLInputElement) {
          return !NON_TYPING_INPUT_TYPES.has(target.type);
        }

        return target.isContentEditable;
      }

      return false;
    }

    document.addEventListener('keydown', (event) => {
      currentEvent = event;
      applyResult(keyInterpreter.press(toKeyPress(event)));
      currentEvent = null;
    });

    document.addEventListener('keyup', (event) => {
      applyResult(keyInterpreter.release(event.code));
    });

    window.addEventListener('blur', () => {
      applyResult(keyInterpreter.blur());
    });
  },
});
