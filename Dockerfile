# Multi-stage build for minimal image size
# FROM python:3.11-slim
FROM python:3.11-alpine AS builder

# Build argument for port configuration
ARG PORT=5000

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory
WORKDIR /app

# Copy dependency files, source code, and README (needed for dynamic version and package metadata)
COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/

# Create virtual environment and install dependencies
RUN uv sync --frozen --no-cache --no-dev

# Build the package
RUN uv build

# Runtime stage - minimal image
# FROM python:3.11-slim
FROM python:3.11-alpine

# Re-declare build arg for runtime stage
ARG PORT=5000

# Install git (required for difflicious functionality)
# RUN apt-get update && \
#     apt-get install -y --no-install-recommends git && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*
RUN apk add git

# Create non-root user for security
# RUN useradd --create-home --shell /bin/bash app
RUN adduser -D -h /home/app -s /bin/bash app

# Copy uv from builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory
WORKDIR /app

# Copy built package from builder
COPY --from=builder /app/dist/*.whl /tmp/

# Create new venv and install the built package
RUN uv venv && \
    uv pip install /tmp/*.whl && \
    rm /tmp/*.whl

# Change ownership to app user
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE ${PORT}

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/status || exit 1

# Start the application
CMD ["sh", "-c", "difflicious --host 0.0.0.0 --port ${PORT}"]
