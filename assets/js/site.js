// Shared behavior across all pages of the ASM 3150/5150 Tools site.
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderMathFormulas();
});

// Keeps a range slider and a number box in sync, clamping the number box to
// the slider's min/max, and calling `onChange` whenever either changes.
function bindSliderNumber(slider, number, onChange) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);

  slider.addEventListener("input", () => {
    number.value = slider.value;
    onChange();
  });

  number.addEventListener("input", () => {
    if (number.value === "") return;
    const clamped = Math.min(Math.max(parseFloat(number.value), min), max);
    if (!isNaN(clamped)) slider.value = clamped;
    onChange();
  });

  number.addEventListener("blur", () => {
    const clamped = Math.min(Math.max(parseFloat(number.value) || min, min), max);
    number.value = clamped;
    slider.value = clamped;
    onChange();
  });
}

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
