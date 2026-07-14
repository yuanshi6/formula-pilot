export async function finishRenderMath(): Promise<void> {}

export function renderMath(source: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "math-block";
  element.textContent = `rendered:${source}`;
  return element;
}
