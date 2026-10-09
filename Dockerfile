# One container: builds the React app, then serves it with the FastAPI backend.
FROM node:22-slim AS web
WORKDIR /app
COPY prompts ./prompts
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
# Only what the API needs at run time; requirements.txt also covers the data scripts.
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" clickhouse-connect openai python-dotenv
COPY backend ./backend
COPY prompts ./prompts
COPY server.py ./
COPY --from=web /app/frontend/dist ./frontend/dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
