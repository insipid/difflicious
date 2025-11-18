pnpm run test:js     && \
pnpm run lint:js     && \
uv run pytest        && \
uv run mypy src/     && \
uv run ruff check .  && \
uv run black .       && \
echo "Success"
