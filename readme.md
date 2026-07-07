# Card Notes App

Local-first Electron card notes application with a NestJS backend and React/Vite frontend.

## Scripts

- `npm install` installs all workspace dependencies.
- `npm run build` builds backend, frontend, and Electron shell.
- `npm run dev:backend` starts the NestJS backend on port 3000.
- `npm run dev:frontend` starts the Vite frontend.
- `npm run dev:electron` starts the Electron shell after it is built.

The backend health endpoint is available at `/health`, and Swagger is exposed at `/api/docs`.
