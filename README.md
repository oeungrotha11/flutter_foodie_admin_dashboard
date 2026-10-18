# Foodie Admin

React (Vite + Tailwind) admin dashboard for the Spring Boot `backend_foodie_api`.

## Run

```bash
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:8080
npm run dev              # http://localhost:5173
```

Start the Spring Boot API first (port 8080). Log in with an account whose role is `ADMIN`
(the API seeds `admin@foodie.com` / `Admin@12345`). CORS is already open (`*`) on the backend.

## What's covered

| Page | Endpoints | Operations |
|---|---|---|
| Dashboard | `/orders`, `/products`, `/customers`, `/categories`, `/promos` | stats, 7-day revenue, status breakdown |
| Orders | `GET /orders`, `PUT /admin/orders/{id}/status`, `DELETE /orders/{id}` | list, view, change status, delete (processing only) |
| Products | `/products` (multipart), `/products/{id}/options`, `/product-options` | full CRUD + image upload, search/filter, sizes & add-ons (create, edit, show/hide) |
| Categories | `/categories` (multipart) | full CRUD + image upload |
| Promos | `/promos` | full CRUD + activate/deactivate |
| Customers | `GET /customers`, `PUT /customers/{id}` | list, edit |

## Notes

- The backend returns validation and access-denied errors as **HTTP 200** with `{ code, message, details }`
  in the body. `src/lib/api.js` converts these into real errors, so forms show per-field messages.
- On a 401 the client refreshes the token (`POST /auth/refresh`) once and retries; if that fails it signs out.
- Not in the UI because the API has no endpoint for them: listing users, deleting customers
  (`DELETE /user/{id}` needs a user id that customers don't expose), deleting product options, and editing order items.
- Dashboard revenue/status figures are computed from the latest 100 orders (there's no stats endpoint).
