import { resolveKey, type KeyAction, type KeyInput } from '../utils/key-mapper';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
/**
 * Vim-Style Page Navigation for Chrome
 * 
 * Navigation controls:
 * - j: Scroll down
 * - k: Scroll up
 * - gg: Go to top of page
 * - G: Go to bottom of page
 * - f: Enter link-hint mode, display 2-letter codes for links
 *     (type the code to navigate to that link)
 * - H: Go back in browsing history
 * - L: Go forward in browsing history
 */

// Scroll amount for each j/k press (in pixels)
const SCROLL_AMOUNT = 60;

// To track multi-key sequences (for "gg")
let pendingG = false;
let keySequenceTimer: ReturnType<typeof setTimeout> | null = null;
const KEY_SEQUENCE_TIMEOUT = 1000; // 1 second timeout for key sequence

// Continuous scrolling support
let isScrolling = false;
let scrollDirection = 0;
let scrollInterval: ReturnType<typeof setInterval> | null = null;
const SCROLL_SPEED = 10; // Lower is faster (milliseconds between scroll steps)

// Link hint mode variables
let isLinkHintMode = false;
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

let linkHints: LinkHint[] = [];
let currentHintCode = '';
const EXCLUDED_CHARS = ['j', 'k', 'g', 'f']; // Characters we don't use for hints
const HINT_CHARS = 'abcdehilmnopqrstuvwxyz12345678'; // Characters we do use
const NON_TYPING_INPUT_TYPES = new Set(['checkbox', 'radio', 'range', 'color', 'file', 'button', 'submit', 'reset', 'image']);

// Create and inject CSS for link hints
const createHintStyles = () => {
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
};

// Initialize styles
createHintStyles();

// Function to start continuous scrolling
function startContinuousScroll(direction: number): void {
  // Clear any existing interval
  if (scrollInterval) {
    clearInterval(scrollInterval);
  }
  
  // Set scrolling state
  isScrolling = true;
  scrollDirection = direction;
  
  // Start interval for continuous scrolling
  scrollInterval = setInterval(() => {
    window.scrollBy({
      top: SCROLL_AMOUNT * direction,
      behavior: 'auto' // Use 'auto' for continuous scrolling to be more responsive
    });
  }, SCROLL_SPEED);
}

// Function to stop continuous scrolling
function stopContinuousScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
  isScrolling = false;
  scrollDirection = 0;
}

function clearPendingG(): void {
  pendingG = false;
  if (keySequenceTimer) {
    clearTimeout(keySequenceTimer);
    keySequenceTimer = null;
  }
}

function startPendingG(): void {
  if (keySequenceTimer) {
    clearTimeout(keySequenceTimer);
  }
  pendingG = true;
  keySequenceTimer = setTimeout(() => {
    pendingG = false;
    keySequenceTimer = null;
  }, KEY_SEQUENCE_TIMEOUT);
}

function toKeyInput(event: KeyboardEvent): KeyInput {
  return {
    code: event.code,
    repeat: event.repeat,
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey,
    isComposing: event.isComposing,
    typing: isUserTyping(event),
    linkHintMode: isLinkHintMode,
    pendingG,
  };
}

function isIgnoredInput(input: KeyInput): boolean {
  return input.ctrl || input.alt || input.meta || input.isComposing || input.typing;
}

function handleKeyAction(action: KeyAction, event: KeyboardEvent): void {
  switch (action.kind) {
    case 'pendingG':
      startPendingG();
      return;
    case 'top':
      clearPendingG();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    case 'bottom':
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      return;
    case 'scroll':
      window.scrollBy({
        top: SCROLL_AMOUNT * action.direction,
        behavior: 'auto'
      });
      return;
    case 'continuousScroll':
      if (!isScrolling || scrollDirection !== action.direction) {
        startContinuousScroll(action.direction);
      }
      return;
    case 'back':
      window.history.back();
      return;
    case 'forward':
      window.history.forward();
      return;
    case 'enterLinkHints':
      event.preventDefault();
      enterLinkHintMode();
      return;
    case 'none':
      return;
    case 'hintInput':
    case 'exitLinkHints':
      return;
  }
}

// Keyboard event listeners
document.addEventListener('keydown', (event) => {
  // If in link hint mode, handle differently
  if (isLinkHintMode) {
    handleLinkHintModeKeypress(event);
    return;
  }

  const keyInput = toKeyInput(event);
  const action = resolveKey(keyInput);

  if (!isIgnoredInput(keyInput) && (event.code !== 'KeyG' || event.shiftKey)) {
    clearPendingG();
  }

  handleKeyAction(action, event);
});

// Add keyup event listener to stop scrolling when key is released
document.addEventListener('keyup', (event) => {
  if (event.code === 'KeyJ' || event.code === 'KeyK') {
    stopContinuousScroll();
  }
});

// Stop scrolling when window loses focus
window.addEventListener('blur', () => {
  stopContinuousScroll();
});

/**
 * Enter link hint mode - show link hints and prepare for hint selection
 */
function enterLinkHintMode() {
  isLinkHintMode = true;
  currentHintCode = '';
  showLinkHints();
}

/**
 * Display link hints for all clickable elements on the page
 */
function showLinkHints() {
  // Clear any existing hints
  clearLinkHints();
  
  // Find all clickable elements on the page
  const links = document.querySelectorAll('a');
  const buttons = document.querySelectorAll<HTMLElement>('button, input[type="button"], input[type="submit"], [role="button"]');
  const inputs = document.querySelectorAll<HTMLElement>('input:not([type="button"]):not([type="submit"]), textarea, select');
  
  // Count visible elements to generate enough codes
  const visibleElements: VisibleElement[] = [];
  
  // Collect visible links
  links.forEach(link => {
    if (isElementVisible(link)) {
      visibleElements.push({
        element: link,
        type: 'link'
      });
    }
  });
  
  // Collect visible buttons
  buttons.forEach(button => {
    if (isElementVisible(button)) {
      visibleElements.push({
        element: button,
        type: 'button'
      });
    }
  });
  
  // Collect visible inputs
  inputs.forEach(input => {
    if (isElementVisible(input)) {
      visibleElements.push({
        element: input,
        type: 'input'
      });
    }
  });
  
  // Generate hint codes for all visible elements
  const hintCodes = generateHintCodes(visibleElements.length);
  
  // Create hint elements for each clickable element
  visibleElements.forEach((item, index) => {
    const hintCode = hintCodes[index]!;
    createLinkHint(item.element, hintCode, index, item.type);
  });
}

/**
 * Check if an element is visible in the viewport
 */
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

/**
 * Generate 2-character hint codes for links
 */
function generateHintCodes(count: number): string[] {
  const codes: string[] = [];
  const charsLength = HINT_CHARS.length;
  
  // Generate 2-letter codes
  for (let i = 0; i < charsLength; i++) {
    for (let j = 0; j < charsLength; j++) {
      codes.push(HINT_CHARS[i]! + HINT_CHARS[j]!);
      if (codes.length >= count) {
        return codes;
      }
    }
  }
  
  return codes;
}

/**
 * Create and position a link hint element
 */
function createLinkHint(element: HTMLElement, hintCode: string, index: number, type: LinkHintType): void {
  const rect = element.getBoundingClientRect();
  
  // Create hint element
  const hintElement = document.createElement('div');
  hintElement.textContent = hintCode;
  hintElement.className = 'vimnav-link-hint';
  
  // Add different styling based on element type
  if (type === 'button') {
    hintElement.classList.add('vimnav-button-hint');
  } else if (type === 'input') {
    hintElement.classList.add('vimnav-input-hint');
  }
  
  // Position the hint element
  hintElement.style.top = `${rect.top - 10}px`;
  hintElement.style.left = `${rect.left - 10}px`;
  
  document.body.appendChild(hintElement);
  
  // Add to link hints array to keep track
  linkHints.push({
    element: hintElement,
    target: element,
    code: hintCode,
    type: type
  });
}

/**
 * Handle keypresses while in link hint mode
 */
function handleLinkHintModeKeypress(event: KeyboardEvent): void {
  const action = resolveKey(toKeyInput(event));

  if (action.kind === 'exitLinkHints') {
    exitLinkHintMode();
    event.preventDefault();
    return;
  }

  if (action.kind !== 'hintInput') {
    return;
  }

  const key = action.char;
  
  // If this is the first character, filter to only show matching hints
  if (currentHintCode === '') {
    // Check if any hints start with this character
    const matchingHints = linkHints.filter(hint => 
      hint.code.startsWith(key)
    );
    
    // If no matches, exit hint mode
    if (matchingHints.length === 0) {
      exitLinkHintMode();
      return;
    }
    
    // Hide all hints that don't match
    linkHints.forEach(hint => {
      if (!hint.code.startsWith(key)) {
        hint.element.style.display = 'none';
      } else {
        hint.element.style.backgroundColor = '#88ff88'; // Highlight matching hints
      }
    });
  }
  
  currentHintCode += key;
  
  // Check if the current input matches any hint
  const matchedHint = linkHints.find(hint => hint.code === currentHintCode);
  
  // If we have an exact match, activate the element
  if (matchedHint) {
    activateElement(matchedHint.target, matchedHint.type);
    exitLinkHintMode();
    event.preventDefault();
    return;
  }
  
  // Check if we still have potential matches
  const potentialMatches = linkHints.filter(hint => 
    hint.code.startsWith(currentHintCode)
  );
  
  // If no potential matches, exit hint mode
  if (potentialMatches.length === 0) {
    exitLinkHintMode();
  } else {
    // Update highlighting of potential matches
    linkHints.forEach(hint => {
      if (hint.code.startsWith(currentHintCode)) {
        hint.element.style.backgroundColor = '#88ff88'; // Brighter green for better matches
      } else if (hint.element.style.display !== 'none') {
        hint.element.style.backgroundColor = '#ffff88'; // Dimmer yellow for less relevant
      }
    });
  }
  
  event.preventDefault();
}

/**
 * Activate the targeted element based on its type
 */
function activateElement(element: HTMLElement, type: LinkHintType): void {
  if (type === 'input') {
    element.focus();
  } else {
    // For links and buttons, simulate a click
    element.click();
  }
}

/**
 * Exit link hint mode and clean up
 */
function exitLinkHintMode() {
  isLinkHintMode = false;
  currentHintCode = '';
  clearLinkHints();
}

/**
 * Remove all link hint elements from the page
 */
function clearLinkHints() {
  linkHints.forEach(hint => {
    if (hint.element && hint.element.parentNode) {
      hint.element.parentNode.removeChild(hint.element);
    }
  });
  linkHints = [];
}

/**
 * Check if user is currently typing in a form element
 * to avoid intercepting keyboard inputs when typing
 */
function isUserTyping(event: KeyboardEvent): boolean {
  return event.composedPath().some((target) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return true;
    }

    return target instanceof HTMLInputElement && !NON_TYPING_INPUT_TYPES.has(target.type);
  });
}

  },
});
