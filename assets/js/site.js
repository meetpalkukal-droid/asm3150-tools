// Shared behavior across all pages of the ASM 3150/5150 Tools site.
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderMathFormulas();
});

// Renders every element with a data-latex attribute as typeset math (KaTeX).
// Block-level .formula-box elements render in display mode; anything else
// (e.g. an inline <span data-latex="...">) renders inline. Pages that don't
// need math simply don't load katex.min.js, so this silently no-ops.
function renderMathFormulas() {
  if (typeof katex === "undefined") return;
  document.querySelectorAll("[data-latex]").forEach((el) => {
    const displayMode = el.classList.contains("formula-box");
    try {
      katex.render(el.getAttribute("data-latex"), el, { throwOnError: false, displayMode });
    } catch (e) {
      // Leave the element's fallback text in place if rendering fails.
    }
  });
}
