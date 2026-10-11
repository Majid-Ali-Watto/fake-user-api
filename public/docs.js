import { el } from "./dom.js";

const $docs = document.getElementById("docs");
const METHODS = ["get", "post", "put", "patch", "delete"];

const pretty = (value) => JSON.stringify(value, null, 2);
const refName = (node) => node.$ref.split("/").pop();
const resolve = (spec, node) => (node?.$ref ? spec.components.schemas[refName(node)] : node);

const typeOf = (schema = {}) => {
  const base = schema.type === "array" ? `${schema.items?.type ?? "any"}[]` : (schema.type ?? "any");
  return schema.format ? `${base} (${schema.format})` : base;
};

// Short, human-readable rules for a field, from its schema.
const rulesOf = (schema = {}) => {
  const rules = [];
  if (schema.description) rules.push(schema.description);
  const items = schema.items ?? {};
  const values = schema.enum ?? items.enum;
  if (values) rules.push(`one of: ${values.join(", ")}`);
  if (schema.minLength != null || schema.maxLength != null) rules.push(`${schema.minLength ?? 0} to ${schema.maxLength ?? "∞"} characters`);
  if (schema.minimum != null || schema.maximum != null) rules.push(`${schema.minimum ?? "-∞"} to ${schema.maximum ?? "∞"}`);
  if (schema.default != null) rules.push(`default ${schema.default}`);
  return rules.join(". ");
};

const table = (headers, rows) =>
  el(
    "table",
    {},
    el("thead", {}, el("tr", {}, ...headers.map((h) => el("th", { textContent: h })))),
    el("tbody", {}, ...rows.map((row) => el("tr", {}, ...row.map((cell) => (cell instanceof Node ? el("td", {}, cell) : el("td", { textContent: cell })))))),
  );

const required = () => el("span", { className: "req", textContent: "required" });

function parametersTable(op) {
  if (!op.parameters?.length) return null;
  return table(
    ["Name", "In", "Type", "Description"],
    op.parameters.map((p) => [
      el("span", {}, el("code", { textContent: p.name }), p.required ? " " : "", p.required ? required() : ""),
      p.in,
      typeOf(p.schema),
      rulesOf({ ...p.schema, description: p.description }),
    ]),
  );
}

function bodySection(spec, op) {
  const media = op.requestBody?.content?.["application/json"];
  if (!media) return [];
  const schema = resolve(spec, media.schema) ?? {};
  const needed = new Set(schema.required ?? []);
  const rows = Object.entries(schema.properties ?? {}).map(([name, field]) => [
    el("span", {}, el("code", { textContent: name }), needed.has(name) ? " " : "", needed.has(name) ? required() : ""),
    typeOf(field),
    rulesOf(field),
  ]);
  return [
    el("h4", { textContent: "Request body (JSON)" }),
    schema.description ? el("p", { className: "muted", textContent: schema.description }) : "",
    table(["Field", "Type", "Rules"], rows),
    el("pre", { textContent: pretty(media.example) }),
  ];
}

function curlFor(spec, method, path, op) {
  const example = (p) => p.example ?? p.schema?.default ?? "";
  const params = op.parameters ?? [];
  let url = location.origin + path.replace(/\{(\w+)\}/g, (_, name) => example(params.find((p) => p.name === name) ?? {}));
  const query = params.filter((p) => p.in === "query" && p.required).map((p) => `${p.name}=${example(p)}`);
  if (query.length) url += `?${query.join("&")}`;

  const lines = [`curl${method === "get" ? "" : ` -X ${method.toUpperCase()}`} "${url}"`];
  if (op.security) lines.push('  -H "Authorization: Bearer <accessToken>"');
  const media = op.requestBody?.content?.["application/json"];
  if (media) lines.push('  -H "Content-Type: application/json"', `  -d '${JSON.stringify(media.example)}'`);
  return lines.join(" \\\n");
}

function responsesSection(op) {
  return [
    el("h4", { textContent: "Responses" }),
    ...Object.entries(op.responses).flatMap(([status, response]) => [
      el(
        "div",
        { className: "resp-status" },
        el("span", { className: Number(status) < 300 ? "ok" : "", textContent: status }),
        ` ${response.description}`,
      ),
      el("pre", { textContent: pretty(response.content?.["application/json"]?.example ?? {}) }),
    ]),
  ];
}

function renderOperation(spec, path, method, op) {
  return el(
    "details",
    { className: "op" },
    el(
      "summary",
      {},
      el("span", { className: `method ${method}`, textContent: method.toUpperCase() }),
      el("span", { className: "path", textContent: path }),
      el("span", { className: "summary-text", textContent: op.summary }),
      el("span", { className: "badge", textContent: op["x-access"] ?? "public" }),
    ),
    el(
      "div",
      { className: "op-body" },
      op.description ? el("p", { textContent: op.description }) : "",
      ...(op.parameters?.length ? [el("h4", { textContent: "Parameters" }), parametersTable(op)] : []),
      ...bodySection(spec, op),
      el("h4", { textContent: "Example" }),
      el("pre", { textContent: curlFor(spec, method, path, op) }),
      ...responsesSection(op),
    ),
  );
}

function render(spec) {
  const byTag = Object.fromEntries(spec.tags.map((t) => [t.name, []]));
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS.filter((m) => item[m])) {
      byTag[item[method].tags[0]].push(renderOperation(spec, path, method, item[method]));
    }
  }
  $docs.replaceChildren(...Object.entries(byTag).flatMap(([tag, ops]) => [el("h3", { className: "docs-group", textContent: tag }), ...ops]));
}

try {
  const res = await fetch("/openapi.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  render(await res.json());
} catch (error) {
  $docs.replaceChildren(el("p", { className: "notice error", textContent: `Couldn't load the API reference (${error.message}). The OpenAPI spec is at /openapi.json.` }));
}
