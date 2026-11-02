---
title: "Add an opportunity"
description: "One file per opportunity; the filter picks it up."
---

Know a fund, bursary, placement or fellowship open to UK research software engineers, data scientists or other digital
research technical professionals? Add it. Concise beats complete: readers follow the link for details.

## One opportunity, one file

Each opportunity is a Markdown file in
[`src/opportunities/`](https://github.com/UniExeterRSE/funding-map/tree/main/src/opportunities). A scheme with
several distinct calls (CAKE's placements, events and fellowships, say) gets one file per call, sharing a `scheme`.

The quickest way, in the browser: open an existing file of the same kind, copy it, and
[create a new file](https://github.com/UniExeterRSE/funding-map/new/main/src/opportunities) from it, which opens a pull
request. Or, locally with [Pixi](https://pixi.sh):

```sh
pixi run new my-fund        # src/opportunities/my-fund.md, every field with a hint
pixi run check              # validate against the schema
pixi run preview            # see it on the site
```

A file looks like this:

```yaml
---
title: "CAKE Workshops & Events"   # the call, not just the scheme
scheme: CAKE                       # shared by sibling calls
funder: CAKE (UKRI Digital Research Infrastructure)
url: https://www.cake.ac.uk/about/placements/
purpose: [conference, training]    # what it pays for
career_stage: [any, student]
region: [UK]                       # where applicants must be based
max_gbp: ~                         # ~ means not stated
fec_percent: 80
deadline: rolling                  # YYYY-MM-DD, rolling, or a phrase
status: rolling                    # open | rolling | upcoming | closed | unknown
last_checked: 2026-11-02
---

One to three sentences: what it pays for, for whom, and any catch.
```

Keep it objective: what the funder says, not who got it.

## The fields

Every field, and every value a list field may take, is defined once in
[`src/schema.yml`](https://github.com/UniExeterRSE/funding-map/blob/main/src/schema.yml). The build fails on a field or
value not in it, so the filter never shows a misspelling.

- **A new value** (another region, say): add it to that field's `values` in the schema. It appears on the filter.
- **A new field**: add it to the schema, then `pixi run add-field <name> [default]` writes it, as `~` (not stated) by
  default, into every opportunity. Mark it `facet: true` to filter on it.

## Out of date?

Details change. If one is wrong, use *Edit this page* on it, fix it, and update `last_checked`.
