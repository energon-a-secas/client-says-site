.DEFAULT_GOAL := help

PORT = 8803

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  make serve    Start dev server → http://localhost:$(PORT)"
	@echo "  make kill     Kill this project's HTTP server"
	@echo "  make test     Node tests for the Workspace adapter and the checks"
	@echo "  make test-browser   Playwright in three engines (needs the monorepo's playwright)"
	@echo ""

# ── Dev server ────────────────────────────────────────────────────────────────
.PHONY: serve
serve:
	@echo "Serving → http://localhost:$(PORT)"
	@if [ -f ../../scripts/serve.py ]; then python3 ../../scripts/serve.py $(PORT); else python3 -m http.server $(PORT); fi

# ── Kill ──────────────────────────────────────────────────────────────────────
.PHONY: kill
kill:
	@lsof -ti :$(PORT) | xargs kill 2>/dev/null && echo "Stopped server on port $(PORT)" || echo "No server running on port $(PORT)"

# ── Tests ─────────────────────────────────────────────────────────────────────
.PHONY: test test-browser
test:
	node --test tests/*.test.mjs

test-browser:
	node tests/browser.mjs
