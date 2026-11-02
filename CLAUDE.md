# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A Quarto website mapping funding open to UK RSEs and other digital research technical professionals, published to
<https://uniexeterrse.github.io/funding-map/> by `.github/workflows/deploy.yml`. Source in `src/`, output in
`src/docs/` (gitignored). The theme follows blog.kolen.dev. Read `README.md` for how the pieces fit, and
`src/contributing.md` for the conventions of an opportunity.

- `src/schema.yml` is the one definition of the fields. Never add a field to an opportunity without adding it there;
  for a new field, `pixi run add-field <name> [default]` writes it into every opportunity.
- Opportunities are objective: what the funder says, not who applied or got it. Short, linking out for detail.
- Links within the site are relative: it lives under `/funding-map/`, so a root-relative link breaks.
  `pixi run linkcheck-internal` catches one.
- Markdown only; no `.qmd` unless there is no other way.

## Commands

All via Pixi (`pixi.toml`): `check` (validate the front matter), `build`, `serve`, `preview`, `clean`, `new`,
`add-field`, `linkcheck-internal`, `linkcheck`.

**Don't rebuild the whole site to preview a change.** The author may have a full build in `src/docs/` with
`pixi run serve` over it. For a change to one opportunity, `quarto render src/opportunities/<file>.md` from `src/`
is enough: the post-render script reads every opportunity, so `opportunities.json`, and with it the filter, is
always complete. A change to `_quarto.yml`, `custom.scss` or the filters needs `pixi run build`; ask before running
it. Don't start `pixi run preview` unprompted.
