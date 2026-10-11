import { el } from "./dom.js";

const API = "/api/v1/users";
const LIMIT = 12;
const $ = (id) => document.getElementById(id);

const state = { page: 1, totalPages: 1, total: 0, editingId: null };

async function api(path = "", options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const minutes = Math.ceil(Number(res.headers.get("Retry-After")) / 60);
    throw new Error(`Rate limit reached. Try again in ${minutes > 0 ? `${minutes} min` : "a moment"}.`);
  }
  if (!res.ok) {
    throw new Error(body.errors?.join(", ") || body.data?.error || `Request failed (${res.status})`);
  }
  return body;
}

function showNotice(message) {
  const notice = $("notice");
  notice.textContent = message ?? "";
  notice.hidden = !message;
  notice.classList.toggle("error", Boolean(message));
}

function renderCard(user) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const place = [user.city, user.country].filter(Boolean).join(", ");
  const button = (label, action, className = "") => {
    const node = el("button", { type: "button", textContent: label, className });
    node.dataset.action = action;
    node.dataset.id = user.id;
    return node;
  };

  return el(
    "article",
    { className: "card" },
    el(
      "div",
      { className: "head" },
      el("div", { className: "avatar", textContent: initials, ariaHidden: "true" }),
      el(
        "div",
        {},
        el("h3", { textContent: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() }),
        el("div", { className: "meta", textContent: user.email ?? "" }),
      ),
    ),
    el("div", { className: "meta", textContent: [place, user.age && `${user.age} y/o`].filter(Boolean).join(" · ") }),
    el("div", { className: "row" }, button("View", "view"), button("Edit", "edit"), button("Delete", "delete", "danger")),
  );
}

async function load() {
  try {
    const { data, total, totalPages } = await api(`?page=${state.page}&limit=${LIMIT}`);
    if (state.page > totalPages && totalPages > 0) {
      state.page = totalPages; // e.g. the last item of the last page was deleted
      return load();
    }
    Object.assign(state, { total, totalPages: Math.max(totalPages, 1) });
    $("grid").replaceChildren(...(data.length ? data.map(renderCard) : [el("p", { className: "empty", textContent: "No users." })]));
    $("total").textContent = `(${total})`;
    $("page-info").textContent = `Page ${state.page} of ${state.totalPages}`;
    $("prev").disabled = state.page <= 1;
    $("next").disabled = state.page >= state.totalPages;
    showNotice();
  } catch (error) {
    showNotice(error.message);
  }
}

function openForm(user) {
  const form = $("user-form");
  state.editingId = user?.id ?? null;
  $("form-title").textContent = user ? "Edit user" : "New user";
  form.reset();
  for (const field of form.elements) {
    if (field.name && user?.[field.name] != null) field.value = user[field.name];
  }
  $("form-error").hidden = true;
  $("form-dialog").showModal();
}

async function submitForm(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));
  payload.age = Number(payload.age);
  try {
    if (state.editingId) {
      await api(`/${state.editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("", { method: "POST", body: JSON.stringify(payload) });
      state.page = Math.ceil((state.total + 1) / LIMIT); // new users are appended, so show the last page
    }
    $("form-dialog").close();
    await load();
  } catch (error) {
    $("form-error").textContent = error.message;
    $("form-error").hidden = false;
  }
}

async function handleCardAction({ target }) {
  const { action, id } = target.dataset;
  if (!action) return;
  try {
    if (action === "delete") {
      if (!confirm("Delete this user?")) return;
      await api(`/${id}`, { method: "DELETE" });
      await load();
      return;
    }
    const { data: user } = await api(`/${id}`);
    if (action === "edit") return openForm(user);
    $("detail-title").textContent = `${user.firstName} ${user.lastName}`;
    $("detail-json").textContent = JSON.stringify(user, null, 2);
    $("detail-dialog").showModal();
  } catch (error) {
    showNotice(error.message);
    load(); // the user may have been removed by a server restart
  }
}

function init() {
  const baseUrl = location.origin + API;
  $("base-url").textContent = baseUrl;
  $("snippet").textContent = `curl "${baseUrl}?page=1&limit=5"`;
  $("copy-base").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      $("copy-base").textContent = "Copied";
      setTimeout(() => ($("copy-base").textContent = "Copy"), 1500);
    } catch {
      /* clipboard unavailable: the URL is visible to copy by hand */
    }
  });

  $("grid").addEventListener("click", handleCardAction);
  $("new-user").addEventListener("click", () => openForm());
  $("user-form").addEventListener("submit", submitForm);
  $("cancel").addEventListener("click", () => $("form-dialog").close());
  $("detail-close").addEventListener("click", () => $("detail-dialog").close());
  $("prev").addEventListener("click", () => { state.page--; load(); });
  $("next").addEventListener("click", () => { state.page++; load(); });
  load();
}

init();
