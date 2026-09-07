# Author Book Library

[![CI](https://github.com/clivemisiko/author-book_RestAPIFormValidation-TrackC/actions/workflows/ci.yaml/badge.svg)](https://github.com/clivemisiko/author-book_RestAPIFormValidation-TrackC/actions/workflows/ci.yaml)

A full-stack library application with a Django REST API backend and a React/Vite frontend. Users can register and log in, manage authors, and create and browse books with optional cover images.

## Project Structure

- `config/` - Django project configuration
- `library/` - REST API views, serializers, models, permissions, and tests
- `frontend/` - React/Vite application and end-to-end tests
- `media/book-covers/` - uploaded book cover images

## Backend Setup

Create and activate a virtual environment, then install the Python dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Apply migrations and start the Django development server:

```powershell
python manage.py migrate
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/`.

## Frontend Setup

Install the frontend dependencies:

```powershell
cd frontend
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

To point the frontend at a separate API server, create `frontend/.env` with:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## API Endpoints

- `POST /register/` - register a user
- `POST /login/` - log in and receive an authentication token
- `GET, POST /authors/` - list or create authors
- `GET, PUT, PATCH, DELETE /authors/<id>/` - manage one author
- `GET /author-accounts/` - list author accounts
- `GET, POST /books/` - list or create books
- `GET, PUT, PATCH, DELETE /books/<id>/` - manage one book
- `/admin/` - Django administration

Authenticated requests use the `Authorization: Token <token>` header.

## Testing and Quality Checks

From the repository root, run backend tests with:

```powershell
python manage.py test
```

From `frontend/`, run the frontend checks:

```powershell
npm test
npm run lint
npm run build
npm run e2e
```

The end-to-end tests use the production preview server on port `4173`.

### GitHub Actions

The `CI` workflow in `.github/workflows/ci.yaml` runs automatically on every
push and pull request. It:

- Runs the backend lint check with `flake8`.
- Runs the Django test suite against PostgreSQL.
- Runs the frontend lint, unit tests, and production build.
- Tests Python 3.12 and 3.13 in parallel.
- Caches Python and npm dependencies.

The `main` branch is protected. Pull requests must pass both matrix checks
(`Python 3.12 checks` and `Python 3.13 checks`) before they can be merged.
Branches must also be up to date with `main`.

The workflow reads `DJANGO_SECRET_KEY` from GitHub repository Actions secrets.
Do not commit `.env` files or secret values. For local development, create a
`.env` file from the settings expected by the project and keep it ignored by
Git.

### E2 CI/CD Pipeline

The E2 CI/CD gate was completed and merged into `main`. The completed gate:

- Runs backend and frontend linting, tests, and builds on every push and pull request.
- Tests Python 3.12 and 3.13 in parallel with PostgreSQL.
- Builds backend and frontend Docker images after all checks pass.
- Publishes both images to GitHub Container Registry on successful pushes.
- Blocks publishing when any required check fails.

The gate was verified with successful checks on merged PR #18 and a deliberate
failing-test run that produced failed matrix checks.

## Docker Setup

Build and start the complete local stack with Docker Compose:

```powershell
docker compose up --build
```

This starts:

- Postgres on `localhost:5432`
- Django REST API on `http://localhost:8000`
- React frontend on `http://localhost:5173`

The backend service runs migrations before starting the development server. The frontend image is built with `VITE_API_BASE_URL=http://localhost:8000`, so browser requests go to the Dockerized API.

Stop the stack with:

```powershell
docker compose down
```

To remove the Postgres data volume as well:

```powershell
docker compose down -v
```

## Containerized Checks

Run backend tests inside the backend container:

```powershell
docker compose run --rm backend-test
```

Run frontend linting, unit tests, and build inside the frontend container:

```powershell
docker compose run --rm frontend-test
```

These test services use the `test` Compose profile, so they do not start during normal `docker compose up`.

## GitHub Automation and Hygiene

This repository includes GitHub collaboration and maintenance files under `.github/`:

- Issue templates for bug reports and feature requests
- A pull request template with validation and secret-check reminders
- `CODEOWNERS` to request review from the repository owner
- Dependabot configuration for Python, frontend npm packages, Docker, and GitHub Actions

Dependabot checks for updates weekly and opens pull requests for dependency changes. Review those pull requests like normal code changes: confirm tests pass, scan the diff for risky version jumps, and merge only after the app still builds and runs correctly.

Enable secret scanning in GitHub from repository `Settings` -> `Advanced Security` -> `Secret Protection`. After enabling it, secret scanning alerts appear in the repository security area when GitHub detects exposed credentials.

If a credential is leaked:

1. Treat it as compromised immediately.
2. Identify the secret type, owner, file, line, commit, and affected services.
3. Revoke or rotate the exposed credential at the provider.
4. Update the app or CI/CD settings to use the new secret from GitHub Actions secrets or another secret manager.
5. Check GitHub and provider audit logs for unauthorized use.
6. Remove the secret from current code and decide with maintainers whether Git history cleanup is required.
7. Close the secret scanning alert as revoked and document what happened.

See `docs/security/leaked-secret-response.md` for the full checklist.

## Docker Secrets

The Docker images do not copy `.env` files or bake real secrets into image layers. Local Compose uses `SECRET_KEY=dev-only-change-me` only for development. Production deployments should provide `SECRET_KEY`, database credentials, and other sensitive values through the deployment platform's secret manager.
