# Author Book Library

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
