# Multi-stage Dockerfile for minimal image size
# Target: <100MB final image

# Stage 1: Build stage - install dependencies and build package
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml README.md ./

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install build tools and dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir build

# Copy application source
COPY src/ ./src/

# Build the package
RUN python -m build --wheel --outdir /dist

# Stage 2: Runtime stage - minimal Alpine image
FROM python:3.11-alpine

# Install runtime dependencies (git needed for git operations)
RUN apk add --no-cache \
    git \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1000 difflicious && \
    adduser -D -u 1000 -G difflicious difflicious

# Create virtual environment in runtime image
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install the built wheel
COPY --from=builder /dist/*.whl /tmp/
RUN pip install --no-cache-dir /tmp/*.whl && \
    rm -rf /tmp/*.whl

# Set working directory (will be overridden by volume mount)
WORKDIR /workspace

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5000

# Switch to non-root user
USER difflicious

# Simple health check using Python
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/')" || exit 1

# Run the application
CMD ["difflicious", "--host", "0.0.0.0", "--port", "5000"]
