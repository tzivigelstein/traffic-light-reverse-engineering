const SVG_NS = "http://www.w3.org/2000/svg";

/** Shorthand for document.getElementById. */
export const $ = (id) => document.getElementById(id);

/** Create an SVG element with attributes, optionally appended to a parent. */
export function svgEl(tag, attrs = {}, parent) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) element.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(element);
  return element;
}

/** Escape text for safe interpolation into an HTML template string. */
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
