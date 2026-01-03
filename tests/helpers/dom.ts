import { vi } from "vitest";

// Clean up DOM after each test.
export function cleanup(): void {
  document.body.innerHTML = "";
  document.head.innerHTML = "";
}

// Wait for DOM updates to settle.
export function waitForDom(timeout = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

// Wait for an element to appear in the DOM.
export async function waitForElement(
  selector: string,
  container: HTMLElement = document.body,
  timeout = 1000
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = container.querySelector<HTMLElement>(selector);
    if (element) {
      return element;
    }
    await waitForDom(10);
  }

  throw new Error(`Element "${selector}" not found within ${timeout}ms`);
}

// Wait for text to appear in an element.
export async function waitForText(
  text: string,
  container: HTMLElement = document.body,
  timeout = 1000
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const elements = container.querySelectorAll("*");
    for (const el of elements) {
      if (el.textContent?.includes(text)) {
        return el as HTMLElement;
      }
    }
    await waitForDom(10);
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
}

// Simulate a click event.
export function click(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

// Simulate typing in an input.
export function type(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  element.value = text;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

// Simulate a keyboard event.
export function keydown(
  element: HTMLElement,
  key: string,
  options?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }
): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
}

export function keyup(element: HTMLElement, key: string): void {
  element.dispatchEvent(
    new KeyboardEvent("keyup", {
      key,
      bubbles: true,
      cancelable: true,
    })
  );
}

// Simulate pressing Enter.
export function pressEnter(element: HTMLElement, shiftKey = false): void {
  keydown(element, "Enter", { shiftKey });
}

// Simulate pressing Escape.
export function pressEscape(element: HTMLElement): void {
  keydown(element, "Escape");
}

// Get all elements matching a selector.
export function queryAll<T extends HTMLElement>(
  selector: string,
  container: HTMLElement = document.body
): T[] {
  return Array.from(container.querySelectorAll<T>(selector));
}

// Get first element matching a selector or throw.
export function query<T extends HTMLElement>(
  selector: string,
  container: HTMLElement = document.body
): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element "${selector}" not found`);
  }
  return element;
}

// Check if element is visible.
export function isVisible(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

// Get computed style value.
export function getStyle(element: HTMLElement, property: string): string {
  return getComputedStyle(element).getPropertyValue(property);
}

// Create a container element for testing.
export function createContainer(className?: string): HTMLElement {
  const container = document.createElement("div");
  if (className) {
    container.className = className;
  }
  document.body.appendChild(container);
  return container;
}
