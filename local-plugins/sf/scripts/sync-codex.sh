#!/usr/bin/env bash
set -euo pipefail

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
codex_home="${CODEX_HOME:-$HOME/.codex}"
plugin_dir="${CODEX_PLUGIN_DIR:-$codex_home/plugins/sf}"
marketplace_dir="$HOME/.agents/plugins"
marketplace_file="$marketplace_dir/marketplace.json"
mkdir -p "$(dirname "$plugin_dir")" "$marketplace_dir"
stage="$(mktemp -d "${plugin_dir}.stage.XXXXXX")"
backup=""
cleanup() { [[ -z "$stage" || ! -d "$stage" ]] || rm -rf "$stage"; }
trap cleanup EXIT

for dir in skills scripts workflows roomserver docs; do
  if [[ -d "$source_dir/$dir" ]]; then
    mkdir -p "$stage/$dir"
    rsync -a --exclude='__pycache__/' --exclude='*.pyc' \
      --exclude='sync-codex.sh' "$source_dir/$dir/" "$stage/$dir/"
  fi
done

python3 - "$source_dir" "$stage" <<'PY'
import json
import re
import shutil
import sys
from pathlib import Path

source, output = map(Path, sys.argv[1:])
commands = source / "commands"
skills = output / "skills"
for command in sorted(commands.glob("*.md")):
    text = command.read_text()
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", text, re.S)
    frontmatter, body = (match.group(1), match.group(2)) if match else ("", text)
    description = next(
        (line.split(":", 1)[1].strip() for line in frontmatter.splitlines()
         if line.startswith("description:")),
        f"Run the SF {command.stem} workflow.",
    )
    if len(description) >= 2 and description[0] == description[-1] and description[0] in "\"'":
        description = description[1:-1]
    name = f"sf-{command.stem}"
    destination = skills / name
    if destination.exists():
        raise SystemExit(f"command skill would overwrite existing skill: {name}")
    destination.mkdir(parents=True)
    (destination / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {json.dumps(description, ensure_ascii=False)}\n---\n\n{body}"
    )

source_manifest = json.loads((source / ".claude-plugin/plugin.json").read_text())
author = source_manifest.get("author", {}).get("name", "SF")
manifest = {
    "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    "name": source_manifest["name"],
    "version": source_manifest["version"],
    "description": source_manifest["description"],
    "author": {"name": author},
    "extensions": {
        "com.openai": {
            "interface": {
                "displayName": "SF",
                "shortDescription": "Software factory workflows",
                "longDescription": source_manifest["description"],
                "developerName": author,
                "category": "Productivity",
                "capabilities": ["Instructions"],
                "defaultPrompt": ["Use the SF plugin skills to run or resume a software factory workflow."],
            }
        }
    },
}
(output / "plugin.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
if not any((folder / "SKILL.md").is_file() for folder in skills.iterdir()):
    raise SystemExit("generated plugin has no skills")
PY

if [[ -e "$plugin_dir" ]]; then
  [[ ! -L "$plugin_dir" ]] || { echo "Refusing to replace symlink: $plugin_dir" >&2; exit 1; }
  backup="${plugin_dir}.backup.$$"
  [[ ! -e "$backup" ]] || { echo "Backup path already exists: $backup" >&2; exit 1; }
  mv "$plugin_dir" "$backup"
fi
if mv "$stage" "$plugin_dir"; then
  stage=""
  [[ -z "$backup" ]] || rm -rf "$backup"
else
  [[ -z "$backup" ]] || mv "$backup" "$plugin_dir"
  exit 1
fi

python3 - "$marketplace_file" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
if path.exists():
    marketplace = json.loads(path.read_text())
else:
    marketplace = {
        "name": "joey-local",
        "interface": {"displayName": "Joey's local plugins"},
        "plugins": [],
    }
marketplace.setdefault("plugins", [])
entry = {
    "name": "sf",
    "source": {"source": "local", "path": "./.codex/plugins/sf"},
    "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
    "category": "Productivity",
    "interface": {"displayName": "SF"},
}
marketplace["plugins"] = [p for p in marketplace["plugins"] if p.get("name") != "sf"]
marketplace["plugins"].append(entry)
path.write_text(json.dumps(marketplace, indent=2, ensure_ascii=False) + "\n")
PY

printf 'Synced SF skills to %s\nRestart Codex to load the synced package; install SF from Joey's local plugins marketplace if it is not installed yet.\n' "$plugin_dir"
