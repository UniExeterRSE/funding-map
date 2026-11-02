-- Puts an opportunity's front matter at the top of its page, as a table of the fields in src/schema.yml, in the
-- schema's order and with its labels. Applied to src/opportunities/ by its _metadata.yml.

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

local function show(field, value)
  local stringify = pandoc.utils.stringify
  local labels = {}
  for _, v in ipairs(field.values or {}) do
    labels[stringify(v.id)] = stringify(v.label)
  end
  local function label(v)
    v = stringify(v)
    return escape(labels[v] or v)
  end
  if value == nil or (pandoc.utils.type(value) == "List" and #value == 0) or stringify(value) == "" then
    return "<em>not stated</em>"
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

function Pandoc(doc)
  local rows = {}
  for _, field in ipairs(load_schema()) do
    local name = pandoc.utils.stringify(field.name)
    if name ~= "title" then
      table.insert(rows, "<tr><th>" .. escape(pandoc.utils.stringify(field.label)) .. "</th><td>"
        .. show(field, doc.meta[name]) .. "</td></tr>")
    end
  end
  local html = '<table class="table table-sm opportunity-facts"><tbody>' .. table.concat(rows) .. "</tbody></table>"
  doc.blocks:insert(1, pandoc.RawBlock("html", html))
  return doc
end
