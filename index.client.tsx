import { Platform } from "react-native";

// The plugin API can rename a workspace but not an agent, so a double-click opens the app's own
// right-click menu on the row or tab and picks its Rename item. testIDs come from
// sidebar-workspace-menu.tsx and workspace-tab-menu.ts in the Paseo app.
const TARGETS = '[data-testid^="sidebar-workspace-row-"], [data-testid^="workspace-tab-"]';
const RENAME_ITEM =
  '[data-testid^="sidebar-workspace-menu-rename-"], [data-testid^="workspace-tab-context-"][data-testid$="-rename"]';

// Typechecks without the DOM library; declare only what this file uses.
type El = {
  closest(selector: string): El | null;
  dispatchEvent(event: unknown): boolean;
  click(): void;
};
declare const document: {
  addEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
  removeEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
  querySelector(selector: string): El | null;
  dispatchEvent(event: unknown): boolean;
};
declare const MouseEvent: new (type: string, init: Record<string, unknown>) => unknown;
declare const KeyboardEvent: new (type: string, init: Record<string, unknown>) => unknown;
declare function requestAnimationFrame(fn: () => void): number;

function clickRenameItem(triesLeft: number) {
  const item = document.querySelector(RENAME_ITEM);
  if (item) return item.click();
  if (triesLeft > 0) requestAnimationFrame(() => clickRenameItem(triesLeft - 1));
  // No Rename item (e.g. a file tab): close the menu we opened.
  else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

export default function contribute() {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};

  const onDoubleClick = (event: any) => {
    // The app loads this once per daemon it is installed on. A second copy would find the menu
    // already used and send Escape, closing the dialog the first copy opened.
    if (event.paseo2clickRename) return;
    event.paseo2clickRename = true;
    // Keep native double-click (select a word) in text fields.
    if (event.target?.closest?.("input, textarea, [contenteditable='true']")) return;
    const target: El | null = event.target?.closest?.(TARGETS) ?? null;
    if (!target) return;
    event.preventDefault();
    target.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        button: 2,
      }),
    );
    clickRenameItem(10);
  };

  document.addEventListener("dblclick", onDoubleClick, true);
  return () => document.removeEventListener("dblclick", onDoubleClick, true);
}
