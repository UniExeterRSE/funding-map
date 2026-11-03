-- Puts an opportunity's front matter at the top of its page, as a table of the fields in src/schema.yml, in the
-- schema's order and with its labels, and above it a note when the opportunity is closed, saying whether a next round
-- is expected. Applied to src/opportunities/ by its _metadata.yml.
--
-- As in bin/opportunities.py, an opportunity whose deadline is a date is open until the end of that day and closed
-- after. One still open at the build gets a script that closes it in the reader's browser once the date passes, the
-- status saying so and the note appearing, so the page never waits for a rebuild.

local function dir_of(path)
  return path:match("(.*[/\\])") or "./"
end

-- pandoc has no YAML reader of its own, but it parses YAML front matter: wrap the schema in one.
local function load_schema()
  local path = dir_of(PANDOC_SCRIPT_FILE) .. "../schema.yml"
  local f = assert(io.open(path, "r"), "cannot open " .. path)
  local text = f:read("a")
  f:close()
  return pandoc.read("---\n" .. text .. "\n---\n", "markdown").meta.fields
end

local function escape(s)
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;"))
end

local function thousands(s)
  local int, rest = s:match("^(%d+)(.*)$")
  if not int then return s end
  return int:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", "") .. rest
end

local function labels_of(field)
  local labels = {}
  for _, v in ipairs(field.values or {}) do
    labels[pandoc.utils.stringify(v.id)] = pandoc.utils.stringify(v.label)
  end
  return labels
end

local function show(field, value)
  local stringify = pandoc.utils.stringify
  local labels = labels_of(field)
  local function label(v)
    v = stringify(v)
    return escape(labels[v] or v)
  end
  if value == nil or (pandoc.utils.type(value) == "List" and #value == 0) or stringify(value) == "" then
    return "<em>" .. escape(field.empty and stringify(field.empty) or "not stated") .. "</em>"
  end
  local kind = stringify(field.type)
  if kind == "choices" then
    local out = {}
    for _, v in ipairs(value) do table.insert(out, label(v)) end
    return table.concat(out, ", ")
  elseif kind == "choice" then
    return label(value)
  elseif kind == "url" then
    local url = escape(stringify(value))
    return '<a href="' .. url .. '">' .. url .. "</a>"
  elseif kind == "number" then
    return thousands(escape(stringify(value)))
  end
  return escape(stringify(value))
end

-- Works out a dated deadline's status: "closed" if the date has passed, "open" otherwise, and nil if it is no date.
local function status_from_deadline(meta)
  local deadline = meta.deadline and pandoc.utils.stringify(meta.deadline) or ""
  if not deadline:match("^%d%d%d%d%-%d%d%-%d%d$") then return nil, nil end
  return deadline < os.date("%Y-%m-%d") and "closed" or "open", deadline
end

local function closed_note(meta, by_date, closes_after)
  local next_round = meta.next_round and pandoc.utils.stringify(meta.next_round) or ""
  local text = next_round ~= ""
    and ("Next round: " .. next_round .. ". Terms can change between rounds, so check the link.")
    or "No next round has been announced. Check the link, or the funder's mailing list, for news."
  local attrs = closes_after and (' hidden data-closes-after="' .. closes_after .. '"') or ""
  -- A Bootstrap alert, not a Quarto callout: Quarto has already turned callouts into HTML by the time this runs.
  return pandoc.RawBlock("html", '<div class="alert alert-info" role="note"' .. attrs .. "><strong>"
    .. (by_date and "Deadline passed." or "Closed.") .. "</strong> " .. escape(text) .. "</div>")
end

-- Shows what is marked data-closes-after once that date has passed, UK time, and sets the status to closed.
local CLOSE_SCRIPT = [[<script>
(() => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  for (const e of document.querySelectorAll("[data-closes-after]")) {
    if (e.dataset.closesAfter >= today) continue;
    if (e.dataset.closed != null) e.textContent = e.dataset.closed;
    else e.hidden = false;
  }
})();
</script>]]

function Pandoc(doc)
  local by_date, deadline = status_from_deadline(doc.meta)
  if by_date then doc.meta.status = by_date end
  local status = pandoc.utils.stringify(doc.meta.status or "")
  -- Open by its date at the build: closes in the browser once the date passes.
  local closes_after = by_date == "open" and deadline or nil
  local rows = {}
  for _, field in ipairs(load_schema()) do
    local name = pandoc.utils.stringify(field.name)
    if name ~= "title" then
      local cell = show(field, doc.meta[name])
      if name == "status" and closes_after then
        cell = '<span data-closes-after="' .. closes_after .. '" data-closed="'
          .. escape(labels_of(field).closed or "Closed") .. '">' .. cell .. "</span>"
      end
      table.insert(rows, "<tr><th>" .. escape(pandoc.utils.stringify(field.label)) .. "</th><td>" .. cell .. "</td></tr>")
    end
  end
  local html = '<table class="table table-sm opportunity-facts"><tbody>' .. table.concat(rows) .. "</tbody></table>"
  doc.blocks:insert(1, pandoc.RawBlock("html", html))
  if status == "closed" or closes_after then
    doc.blocks:insert(1, closed_note(doc.meta, by_date ~= nil, closes_after))
  end
  if closes_after then doc.blocks:insert(pandoc.RawBlock("html", CLOSE_SCRIPT)) end
  return doc
end
