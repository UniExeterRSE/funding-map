// The filter on index.md. Its facets come from the fields src/schema.yml marks `facet: true`, and its items from
// opportunities.json, which bin/opportunities.py writes after every render. Within a facet, ticked values are
// alternatives (OR); across facets, all must match (AND). A field's `umbrella` value matches any selection, so an
// opportunity open UK-wide shows for a search for GW4. The selection is kept in the URL, so it can be shared.
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
  for (const f of facets) {
    const picked = new Set((params.get(f.name) ?? "").split(",").filter(Boolean));
    form.append(el("fieldset", {}, el("legend", {}, f.label),
      ...f.values.filter((v) => v.id !== f.umbrella).map((v) =>
        el("label", { className: "chip" }, el("input", { type: "checkbox", name: f.name, value: v.id, checked: picked.has(v.id) }), v.label))));
  }
  const count = el("p", { className: "meta" });
  const list = el("ul", { className: "opportunity-list" });
  root.append(search, form, count, list);

  const statusOrder = (it) => byName.status?.values.findIndex((v) => v.id === it.status) ?? 0;
  // Open first; among the closed, those with a next round expected before those without.
  items.sort((a, b) => statusOrder(a) - statusOrder(b) || !a.next_round - !b.next_round || a.title.localeCompare(b.title));

  const render = () => {
    const selected = Object.fromEntries(facets.map((f) =>
      [f.name, new Set([...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((i) => i.value))]));
    const q = search.value.trim().toLowerCase();
    const shown = items.filter((it) =>
      (!q || `${it.title} ${it.scheme} ${it.funder}`.toLowerCase().includes(q)) &&
      facets.every((f) => {
        const want = selected[f.name];
        const have = asList(it[f.name]);
        return want.size === 0 || have.some((v) => want.has(v) || v === f.umbrella);
      }));

    const hash = new URLSearchParams();
    if (q) hash.set("q", q);
    for (const f of facets) if (selected[f.name].size) hash.set(f.name, [...selected[f.name]].join(","));
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
  form.addEventListener("change", render);
  search.addEventListener("input", render);
  render();
})();
