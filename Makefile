.PHONY: all install dev build test lint typecheck check clean coverage ci

# Default target.
all: check build

# Install dependencies.
install:
	bun install

# Development with watch mode.
dev:
	bun run dev

# Production build.
build:
	bun run build

# Run all tests.
test:
	bun run test

# Run tests with watch mode.
test-watch:
	bun run test:watch

# Run unit tests only.
test-unit:
	bun run test:unit

# Run integration tests only.
test-integration:
	bun run test:integration

# Run property-based tests only.
test-property:
	bun run test:property

# Run tests with coverage.
coverage:
	bun run test:coverage

# Run ESLint.
lint:
	bun run lint

# Run ESLint with auto-fix.
lint-fix:
	bun run lint:fix

# TypeScript type checking.
typecheck:
	bun run typecheck

# Run all checks (typecheck + lint + test).
check:
	bun run check

# CI pipeline (used in GitHub Actions).
ci: install typecheck lint coverage build
	@echo "CI pipeline complete"

# Clean build artifacts.
clean:
	rm -rf main.js coverage node_modules/.cache

# Generate coverage report and open in browser.
coverage-report: coverage
	@open coverage/index.html || xdg-open coverage/index.html 2>/dev/null || echo "Open coverage/index.html manually"

# Quick sanity check for development.
quick:
	bun run typecheck && bun run test:unit

# Show available targets.
help:
	@echo "Available targets:"
	@echo "  install         - Install dependencies"
	@echo "  dev             - Development with watch mode"
	@echo "  build           - Production build"
	@echo "  test            - Run all tests"
	@echo "  test-watch      - Run tests with watch mode"
	@echo "  test-unit       - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  test-property   - Run property-based tests only"
	@echo "  coverage        - Run tests with coverage"
	@echo "  coverage-report - Generate and open coverage report"
	@echo "  lint            - Run ESLint"
	@echo "  lint-fix        - Run ESLint with auto-fix"
	@echo "  typecheck       - TypeScript type checking"
	@echo "  check           - Run all checks (typecheck + lint + test)"
	@echo "  ci              - Full CI pipeline"
	@echo "  clean           - Clean build artifacts"
	@echo "  quick           - Quick sanity check (typecheck + unit tests)"
