#!/usr/bin/env bash
# install-hooks.sh
#
# Installs the project's Git hooks into .git/hooks/.
# Run once after cloning:  bash scripts/install-hooks.sh
#
# The pre-commit hook runs the i18n regression guard on staged JSX/JS files
# and blocks the commit if the hardcoded-string count would increase above
# the current budget.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌  .git/hooks directory not found. Are you inside a Git repository?"
  exit 1
fi

# ── Write pre-commit hook ────────────────────────────────────────────────────
cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# Pre-commit hook: i18n regression guard
# Installed by scripts/install-hooks.sh — do not edit directly.
# Re-run install-hooks.sh to update.

set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Only run when JSX/JS files are staged
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(jsx?|tsx?)$' || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

echo "🌐  Running i18n regression guard on staged files…"

# Run the full check against the current budget.
# If findings exceed the budget, the commit is blocked.
cd "$REPO_ROOT"
if ! node scripts/i18n-check.js --max-findings="$(node -e "
  const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
  const script = pkg.scripts['release:check'] || '';
  const m = script.match(/--max-findings=(\d+)/);
  console.log(m ? m[1] : 99999);
")"; then
  echo ""
  echo "❌  Commit blocked: new hardcoded strings detected."
  echo "   Fix the flagged strings with t(\"namespace.key\") before committing."
  echo "   See docs/i18n-check.md for the full workflow."
  echo ""
  exit 1
fi

echo "✅  i18n check passed."
HOOK

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅  Git hooks installed successfully."
echo ""
echo "   Hook installed: .git/hooks/pre-commit"
echo "   The hook runs 'npm run i18n:check' on every commit and blocks"
echo "   commits that introduce new hardcoded user-facing strings."
echo ""
echo "   To skip the hook in an emergency (not recommended):"
echo "   git commit --no-verify"
