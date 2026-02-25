# Copilot Instructions

## Linting & Code Quality

All code changes must pass the following checks before committing:

```bash
ruff check src/       # linting
ruff format src/      # formatting
mypy src/             # type checking
```

Run these after making any changes to Python files in `src/`. Fix all errors before considering the task complete.
