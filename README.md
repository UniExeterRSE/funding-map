# RSE Funding Map

Funding open to UK research software engineers and other digital research technical professionals — conferences,
training, placements, fellowships, events, projects — one page per opportunity, with a filter.

**Site:** <https://uniexeterrse.github.io/funding-map/>

**Adding an opportunity:** see [`src/contributing.md`](src/contributing.md). In short: one Markdown file per
opportunity in `src/opportunities/`, its front matter defined by `src/schema.yml`.

## How it works

- `src/schema.yml` defines every field, once.
- `bin/opportunities.py`, run after each render, validates the front matter against the schema and writes
  `opportunities.json`, which `src/filter.js` turns into the filter on the home page.
- `src/filters/opportunity.lua` shows each opportunity's fields at the top of its page.
- `.github/workflows/deploy.yml` builds on every pull request and publishes `main` to GitHub Pages.

```sh
pixi run check     # validate
pixi run build     # render into src/docs
pixi run preview   # live preview
```

The theme follows [blog.kolen.dev](https://blog.kolen.dev).
