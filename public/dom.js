// Build DOM with textContent only: API data is arbitrary and must never be parsed as HTML.
export const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
