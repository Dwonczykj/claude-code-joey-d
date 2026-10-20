#!/usr/bin/env bash
# Prints the directory new worktrees go in, creating it if needed. $1 is the plugin's worktreeRoot
# option: blank (or the token left unsubstituted) means beside the main checkout; a relative path is
# taken from the main checkout, and ~/ from the home directory.
set -euo pipefail

# The shared .git directory lives in the main checkout. Not `git worktree list | head -1`: with
# hundreds of worktrees, head closes the pipe early and pipefail turns git's SIGPIPE into exit 141.
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
root=${1:-}
case "$root" in
  '' | *user_config.worktreeRoot*) root=$(dirname "$main") ;;
  '~/'*) root="$HOME/${root#'~/'}" ;;
  /*) ;;
  *) root="$main/$root" ;;
esac
mkdir -p "$root"
printf '%s\n' "$root"
