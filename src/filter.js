// The filter on index.md. Its facets come from the fields src/schema.yml marks `facet: true`, and its items from
// opportunities.json, which bin/opportunities.py writes after every render. Each value is a chip, clicked through
// don't care, include and exclude. An opportunity's values are alternatives (what it pays for, who may apply), so it
// shows if any of them is included, when one is, and hides if all of them are excluded; across facets, all must match
// (AND). A field's `umbrella` value has no chip and matches anything included, so an opportunity open UK-wide shows
// for an included GW4, though not for an included value marked `exact`. A value covers one `within` it: GW4 shows for
// an included Exeter, and excluding GW4 excludes Exeter too. An opportunity whose deadline is a date
// is open until the end of that day, UK time, and closed after, worked out here so it never waits for a rebuild.
// The selection is kept in the URL, an excluded value prefixed with "-", so it can be shared.
(async () => {
  const root = document.getElementById("funding-filter");
  const { fields, items } = await (await fetch("opportunities.json")).json();
  const facets = fields.filter((f) => f.facet);
  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
  const labelOf = (field, id) => field.values?.find((v) => v.id === id)?.label ?? id;
  const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const el = (tag, attrs = {}, ...children) => {
    const e = Object.assign(document.createElement(tag), attrs);
    e.append(...children.filter((c) => c != null));
    return e;
  };

  const params = new URLSearchParams(location.hash.slice(1));
  const search = el("input", { type: "search", className: "form-control search", placeholder: "Search titles and schemes", value: params.get("q") ?? "" });
  const form = el("form", { className: "facets" });
  const next = { "": "include", include: "exclude", exclude: "" };
  const spoken = { "": "don't care", include: "included", exclude: "excluded" };
  const setState = (chip, state) => {
    chip.dataset.state = state;
    chip.setAttribute("aria-label", `${chip.dataset.label}: ${spoken[state]}`);
  };
  for (const f of facets) {
    const picked = new Map((params.get(f.name) ?? "").split(",").filter(Boolean)
      .map((p) => (p.startsWith("-") ? [p.slice(1), "exclude"] : [p, "include"])));
    form.append(el("fieldset", {}, el("legend", {}, f.label),
      ...f.values.filter((v) => v.id !== f.umbrella).map((v) => {
        const chip = el("button", { type: "button", className: "chip", name: f.name, value: v.id, title: "Click: include, exclude, don't care" }, v.label);
        chip.dataset.label = v.label;
        setState(chip, picked.get(v.id) ?? "");
        return chip;
      }),
      f.note ? el("div", { className: "note" }, f.note) : null));
  }
  const count = el("p", { className: "meta" });
  const list = el("ul", { className: "opportunity-list" });
  root.append(search, form, count, list);

  // Today in the UK, as YYYY-MM-DD.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  for (const it of items) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(it.deadline ?? "")) it.status = it.deadline < today ? "closed" : "open";
  }
  const valueOf = (f, id) => f.values.find((v) => v.id === id);
  // A value and those it is within, e.g. Exeter, GW4.
  const chain = (f, id) => {
    const out = [];
    for (let v = id; v != null; v = valueOf(f, v)?.within) out.push(v);
    return out;
  };
  // Whether an opportunity with `have` shows for an included `want`.
  const covers = (f, have, want) =>
    (have === f.umbrella && !valueOf(f, want)?.exact) || chain(f, want).includes(have);

  const statusOrder = (it) => byName.status?.values.findIndex((v) => v.id === it.status) ?? 0;
  // Open first; among the closed, those with a next round expected before those without.
  items.sort((a, b) => statusOrder(a) - statusOrder(b) || !a.next_round - !b.next_round || a.title.localeCompare(b.title));

  const render = () => {
    const chipsOf = (f, state) =>
      [...form.querySelectorAll(`.chip[name="${f.name}"][data-state="${state}"]`)].map((c) => c.value);
    const selected = Object.fromEntries(facets.map((f) =>
      [f.name, { include: chipsOf(f, "include"), exclude: chipsOf(f, "exclude") }]));
    const q = search.value.trim().toLowerCase();
    const shown = items.filter((it) =>
      (!q || `${it.title} ${it.scheme} ${it.funder}`.toLowerCase().includes(q)) &&
      facets.every((f) => {
        const { include, exclude } = selected[f.name];
        const have = asList(it[f.name]);
        const kept = have.filter((h) => !chain(f, h).some((v) => exclude.includes(v)));
        if (have.length && !kept.length) return false;
        return include.length === 0 || kept.some((h) => include.some((w) => covers(f, h, w)));
      }));

    const hash = new URLSearchParams();
    if (q) hash.set("q", q);
    for (const f of facets) {
      const { include, exclude } = selected[f.name];
      if (include.length || exclude.length) hash.set(f.name, [...include, ...exclude.map((v) => `-${v}`)].join(","));
    }
    history.replaceState(null, "", hash.size ? `#${hash}` : location.pathname);

    count.textContent = `${shown.length} of ${items.length} opportunities`;
    list.replaceChildren(...shown.map((it) => {
      const facts = [
        it.funder,
        it.max_gbp != null ? `up to £${it.max_gbp.toLocaleString("en-GB")}` : null,
        it.fec_percent != null ? `${it.fec_percent}% FEC` : null,
        it.deadline ? `deadline: ${it.deadline}` : null,
        labelOf(byName.status, it.status),
      ].filter(Boolean).join(" · ");
      return el("li", {},
        el("a", { className: "title", href: it.href }, it.title),
        el("div", { className: "meta" }, facts),
        it.status === "closed"
          ? el("div", { className: "meta signpost" }, it.next_round ? `Next round: ${it.next_round}` : "No next round announced yet")
          : null,
        el("div", {}, ...asList(it.purpose).map((p) => el("span", { className: "tag" }, labelOf(byName.purpose, p)))));
    }));
  };
  form.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    setState(chip, next[chip.dataset.state]);
    render();
  });
  search.addEventListener("input", render);
  render();
})();
