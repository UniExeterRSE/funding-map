---
title: "Add an opportunity"
description: "One file per opportunity; the filter picks it up."
---

Know a fund, bursary, placement or fellowship open to UK research software engineers, data scientists or other digital
research technical professionals, or a funded place on a set programme or event (a workshop with travel paid, say)?
Add it. Concise beats complete: readers follow the link for details.

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
form: grant                        # grant: money for your own plan; place: a funded place on a set programme
purpose: [conference, training]    # what it pays for
career_stage: [any, student]
region: [UK]                       # where applicants must be based
max_gbp: ~                         # ~ means not stated
fec_percent: 80                    # 100 if the funder does not say
deadline: rolling                  # YYYY-MM-DD, rolling, or a phrase
next_round: ~                      # if closed: when the next call is expected; ~ if none announced
status: rolling                    # rolling | closed | unknown | open; ~ if deadline is a date
last_checked: 2026-11-02
---

One to three sentences: what it pays for, for whom, and any catch.
```

Keep it objective: what the funder says, not who got it.

## The fields

Every field, and every value a list field may take, is defined once in
[`src/schema.yml`](https://github.com/UniExeterRSE/funding-map/blob/main/src/schema.yml). The build fails on a field or
value not in it, so the filter never shows a misspelling.

- **A new value** (another region, say): add it to that field's `values` in the schema. It appears on the filter. A
  region inside another says so, as Exeter is `within: GW4`, so a search for Exeter also finds what is open to GW4.
- **A new field**: add it to the schema, then `pixi run add-field <name> [default]` writes it, as `~` (not stated) by
  default, into every opportunity. Mark it `facet: true` to filter on it.

## Out of date?

An opportunity whose deadline is a date has no `status` of its own: it shows as open until the end of that day and
closed after, saying "no next round announced" unless `next_round` says otherwise. So when a call closes, the useful
edit is to fill in `next_round` if the funder has said when the next one is.

Where the funder doesn't say something, we make a reasonable guess, such as 100% FEC, and say nothing else. Anything
here can be wrong; the link is the authority. If you know better, open an issue or a pull request.

Details change. If one is wrong, use *Edit this page* on it, fix it, and update `last_checked`.
