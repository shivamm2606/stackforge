# QuickStack ⚡

> Build full-stack MERN apps in seconds - not hours.

[![npm version](https://img.shields.io/npm/v/create-quickstack-app.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/create-quickstack-app)
[![node](https://img.shields.io/node/v/create-quickstack-app.svg?color=339933&logo=node.js)](https://nodejs.org)
[![downloads](https://img.shields.io/npm/dm/create-quickstack-app.svg?color=blue&logo=npm)](https://www.npmjs.com/package/create-quickstack-app)
[![license](https://img.shields.io/npm/l/create-quickstack-app.svg?color=blue)](./LICENSE)

I got tired of spending the first hour of every new project setting up the same Express server, connecting Mongoose, setting up Vite, and configuring CORS. So I built QuickStack.

One command and you get a fully working MERN app with client and server running, zero config needed.

```bash
npx create-quickstack-app my-app
```

---

## What you get

| Layer           | Technology (Stable)                   | Technology (Latest)                   |
| --------------- | ------------------------------------- | ------------------------------------- |
| Frontend        | React 18 · Vite 5 · Tailwind 3        | React 19 · Vite 6 · Tailwind 4        |
| Backend         | Express.js · Mongoose · dotenv        | Express.js · Mongoose · dotenv        |
| Auth (optional) | JWT · bcryptjs · cookie-parser        | JWT · bcryptjs · cookie-parser        |
| Tooling         | NPM Workspaces · Axios · concurrently | NPM Workspaces · Axios · concurrently |

---

## 🚀 Getting started

**Step 1 - Create the project**

```bash
npx create-quickstack-app my-app
cd my-app
```

**Step 2 - Fill in your environment variables**

A `.env` file is auto-created from `.env.example` - just open it and fill in your values.

- `MONGO_URI` - your MongoDB connection string ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or a local instance)
- `JWT_SECRET` - only required if you chose `auth`

**Step 3 - Run it**

```bash
npm run dev
```

| URL                              | What's there          |
| -------------------------------- | --------------------- |
| `http://localhost:5173`          | React frontend (Vite) |
| `http://localhost:5000`          | Express API           |
| `http://localhost:5000/api/test` | Health check          |

---

## 📦 Installing Packages (Important)

QuickStack uses **NPM Workspaces** to keep your project setup fast and clean. This means there is only **one** `node_modules` folder at the root of your project.

**You don't need to `cd` into the `client` or `server` folders!** Whenever you need to install a new package, run it from the root folder explicitly passing the workspace flag:

**For the React Frontend:**

```bash
npm install framer-motion --workspace=client

# or
npm i framer-motion -w client
```

**For the Express Backend:**

```bash
npm install stripe --workspace=server

# or
npm i stripe -w server
```

> **Note:** Always remember to use the `--workspace` or `-w` flag so your packages deploy correctly when you push to production.

---

## Authentication

By default, the CLI will prompt you to include authentication while creating the project.

If you already know you want it, you can skip the prompt using the flag:

```bash
npx create-quickstack-app my-app --auth
```

**Endpoints you get:**

| Method | Route                | Description                      |
| ------ | -------------------- | -------------------------------- |
| `POST` | `/api/user/register` | Create account                   |
| `POST` | `/api/user/login`    | Login, sets JWT cookie           |
| `POST` | `/api/user/logout`   | Clears the session cookie        |
| `GET`  | `/api/user/me`       | Returns current user (protected) |

**Frontend routing (with `auth`)**

| Route     | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `/`       | Home page - protected, redirects to `/login` if not authenticated |
| `/login`  | Login page                                                        |
| `/signup` | Signup page                                                       |

After a successful login you are redirected to `/`. All pages are fully customizable starter templates located in `client/src/pages/` - modify them however you like.

**Frontend routing (without `--auth`)**

The app has a single route `/` rendering `Home.jsx`. Build from there.

---

## Stability Presets

QuickStack allows you to choose between two production-ready stability tiers:

- **Stable (`--stable`)**: Uses React 18.3, Tailwind v3, and React Router v6.
- **Latest (`--latest`)**: Uses React 19, Tailwind v4, and React Router v7.

If you don't specify a flag, the CLI will ask you to choose.

---

## ⚙️ CLI flags

| Flag                 | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `--auth`             | Includes full-stack JWT authentication                    |
| `--stable`           | Uses Stable preset (React 18, Tailwind 3)                 |
| `--latest`           | Uses Latest preset (React 19, Tailwind 4)                 |
| `--yes`              | Skips all prompts, uses defaults (Stable preset, No Auth) |
| `-v`, `--version`    | Shows the current version                                |
| `--help`             | Show help                                                 |

```bash
npx create-quickstack-app my-app
npx create-quickstack-app my-app --auth
npx create-quickstack-app shop-app-2   # hyphens, underscores, numbers all work
```

---

## Scripts

From the project root:

| Script           | What it does                      |
| ---------------- | --------------------------------- |
| `npm run dev`    | Starts client and server together |
| `npm run client` | Frontend only                     |
| `npm run server` | Backend only                      |

---

## 🗂️ Project structure

```
my-app/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── vite.config.js
│   └── package.json
├── server/                  # Express backend
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── routes/
│   └── index.js
├── .env
├── .env.example
├── .gitignore
└── package.json
```

<details>
<summary>With <code>--auth</code> - extra files added</summary>

```
server/
  models/user.model.js           # User schema
  controllers/user.controller.js # register, login, logout, getUser
  routes/user.routes.js          # mounted at /api/user
  middleware/authMiddleware.js   # JWT verification, supports header + cookie

client/src/
  pages/Login.jsx
  pages/Signup.jsx
  components/ProtectedRoute.jsx  # Redirects to /login if not authenticated
  services/auth.js               # Thin wrapper around the auth API
  App.jsx                        # Routes with auth
```

</details>

---

## ✅ Requirements

- Node.js ≥ 16
- npm ≥ 7
- Git (optional - only used for `git init` on the new project)

---

## 🤝 Contributing

Clone the repo, link it locally, and use it like a normal user would:

```bash
git clone https://github.com/shivamm2606/quickstack.git
cd quickstack
npm install
npm link
create-quickstack-app test-app
```

For larger changes, open an issue first to discuss the approach.

---

## 📄 License

MIT © [Shivam Gupta](https://github.com/shivamm2606)
