# RentOut Monorepo

This is the full-stack monorepo for the RentOut peer-to-peer electronics rental marketplace. It contains a Next.js frontend and an Express backend, managed with Turborepo workspaces.

## Structure

- `frontend/`: Next.js 14 App Router application with Tailwind CSS and TypeScript.
- `backend/`: Express.js application with TypeScript, Prisma ORM, PostgreSQL, and Socket.io.

## Getting Started

1. Copy `.env.example` to `.env` in both the `frontend` and `backend` directories and fill in the values.
2. At the root of the project, run:
   ```bash
   npm install
   ```
3. To start both development servers concurrently, run:
   ```bash
   npm run dev
   ```

## CORS Configuration (Vercel & Railway)

CORS (Cross-Origin Resource Sharing) is configured on the backend using the `FRONTEND_URL` environment variable.

### Local Development
In local development, the frontend runs on `http://localhost:3000` and the backend on `http://localhost:5000`. The `.env` file in your `backend` directory should have:
```env
FRONTEND_URL=http://localhost:3000
```

### Production Deployment
When you deploy the frontend to Vercel and the backend to Railway, you need to configure the CORS settings so they can communicate securely:

1. **Deploy the Frontend (Vercel)**: Once deployed, Vercel will give you a domain (e.g., `https://paperrentel-frontend.vercel.app`).
2. **Deploy the Backend (Railway)**: Once deployed, Railway will give you a domain (e.g., `https://paperrentel-backend.up.railway.app`).
3. **Set Environment Variables**:
   - In your **Railway Dashboard**, go to your backend service settings > Variables, and set:
     ```env
     FRONTEND_URL=https://paperrentel-frontend.vercel.app
     ```
   - In your **Vercel Dashboard**, go to your frontend project settings > Environment Variables, and set:
     ```env
     NEXT_PUBLIC_API_URL=https://paperrentel-backend.up.railway.app
     ```

This approach allows you to secure your backend API so it only accepts requests from your specific Vercel domain, preventing unauthorized access.
