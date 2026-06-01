# Stockwell — Inventory & Order Management System

A full-stack inventory and order management platform built with **FastAPI** (backend) + **React** (frontend) + **PostgreSQL** (database).

---

## Live URLs

| Service | URL |
|---|---|
| **Frontend** (Vercel) | [https://inventory-order-management-system-jet-mu.vercel.app](https://inventory-order-management-system-jet-mu.vercel.app) |
| **Backend API** (Render) | [https://inventory-order-management-system-ks37.onrender.com](https://inventory-order-management-system-ks37.onrender.com) |
| **API Docs** (Swagger) | [https://inventory-order-management-system-ks37.onrender.com/docs](https://inventory-order-management-system-ks37.onrender.com/docs) |

## Docker Images

| Image | Pull Command | Size |
|---|---|---|
| **Backend** | `docker pull vinay883/stockwell-backend:latest` | ~143 MB |
| **Frontend** | `docker pull vinay883/stockwell-frontend:latest` | ~27 MB |

**Docker Hub:** [https://hub.docker.com/u/vinay883](https://hub.docker.com/u/vinay883)

### Run Pre-Built Images

```bash
# Backend (uses SQLite for local testing)
docker run -p 8080:8000 \
  -e DATABASE_URL=sqlite:///./inventory.db \
  vinay883/stockwell-backend:latest

# Frontend (nginx on port 80)
docker run -p 3000:80 \
  -e REACT_APP_API_URL=http://localhost:8080/api \
  vinay883/stockwell-frontend:latest
```

### Push New Builds

```bash
docker tag inventroyordermanagementsystem-backend:latest vinay883/stockwell-backend:latest
docker tag inventroyordermanagementsystem-frontend:latest vinay883/stockwell-frontend:latest
docker push vinay883/stockwell-backend:latest
docker push vinay883/stockwell-frontend:latest
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/inventory_db` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | `change-this-to-a-random-secret-key` | Secret for JWT token signing |
| `REACT_APP_API_URL` | `http://localhost:8080/api` | Backend API URL |

> **Production:** Set `REACT_APP_API_URL` to `https://inventory-order-management-system-ks37.onrender.com/api` in Vercel dashboard (Settings > Environment Variables > Redeploy).

## Source Code

| Resource | URL |
|---|---|
| **GitHub Repository** | [https://github.com/vinay-kumarr/Inventory-Order-Management-System](https://github.com/vinay-kumarr/Inventory-Order-Management-System) |

---

## Features

- **Authentication** — JWT-based register/login with protected routes
- **Dashboard** — Revenue charts, order status pie chart, low stock alerts, quick actions
- **Products** — CRUD, search/filter, CSV export, bulk select & delete
- **Customers** — CRUD, search/filter, CSV export
- **Orders** — Create with line items, status workflow (confirmed > shipped > delivered), invoice print, CSV export
- **Dark Mode** — Persistent toggle (sidebar + mobile)
- **Skeleton Loading** — Shimmer placeholders on every page
- **Responsive** — Mobile sidebar drawer, adaptive grid
- **Bulk Operations** — Multi-select products with bulk delete
- **Keyboard Shortcuts** — Ctrl/Cmd+K (search), Escape (close modal), N (new product)
- **Animated Counters** — Dashboard stats count up on load

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Recharts, CSS Custom Properties |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, JWT (python-jose), bcrypt |
| **Database** | PostgreSQL 15 (production) / SQLite (development) |
| **Containerization** | Docker, Docker Compose |
| **Deployment** | Vercel (frontend), Render (backend + database) |

---

## Local Development

```bash
# Clone
git clone https://github.com/vinay-kumarr/Inventory-Order-Management-System.git
cd Inventory-Order-Management-System

# Docker (recommended)
docker compose up --build

# Or manually:
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend
cd frontend && npm install
npm start
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/dashboard` | Dashboard stats & charts |
| GET/POST | `/api/products/` | List / Create products |
| GET/PUT/DELETE | `/api/products/{id}` | Get / Update / Delete product |
| GET/POST | `/api/customers/` | List / Create customers |
| GET/DELETE | `/api/customers/{id}` | Get / Delete customer |
| GET/POST | `/api/orders/` | List / Create orders |
| GET/DELETE | `/api/orders/{id}` | Get / Cancel order |
| PATCH | `/api/orders/{id}/status` | Update order status |
