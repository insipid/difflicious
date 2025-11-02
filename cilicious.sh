npm run test:js     && \
npm run lint:js     && \
uv run pytest       && \
uv run mypy src/    && \
uv run ruff check . && \
uv run black .      && \
echo "Success"
