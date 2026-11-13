export const discardMessage = "Hay cambios sin guardar. ¿Querés descartarlos y cerrar?";

export function confirmDiscard(dirty: boolean): boolean {
  return !dirty || window.confirm(discardMessage);
}

// Native showModal makes the rest of the document inert. Keep Tab wrapping
// explicit as well, including while controls appear/disappear or are disabled.
export function trapDialogFocus(dialog: HTMLDialogElement, event: { key: string; shiftKey: boolean; preventDefault(): void }) {
  if (event.key !== "Tab") return;
  const controls = [...dialog.querySelectorAll<HTMLElement>("a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]")].filter(element => {
    if (element.tabIndex < 0 || element.matches(":disabled") || element.closest("[hidden], [inert]")) return false;
    let parent: HTMLElement | null = element;
    while (parent && parent !== dialog) {
      if (getComputedStyle(parent).display === "none" || getComputedStyle(parent).visibility === "hidden") return false;
      if (parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector("summary")?.contains(element)) return false;
      parent = parent.parentElement;
    }
    return true;
  });
  const first = controls[0], last = controls.at(-1);
  if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
  if (!controls.includes(document.activeElement as HTMLElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
