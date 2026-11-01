<video width="960" height="540" alt="garden-type-garden-breathe" src="https://github.com/user-attachments/assets/a2e641a0-080a-4327-8e41-967e40f8018a" />


Type Garden is a beautiful, generative typography art project built with Vanilla JavaScript and CSS, perfect for exploring the connection between words and nature. Users can type a message, choose from a variety of flower designs, and watch their words blossom into a unique, evolving garden.

## Installing the Project

```sh
git clone https://github.com/priyamd22/type-garden.git
cd type-garden
npm install
npm run dev
```
<img width="960" height="499" alt="Screenshot 2026-10-31 132719" src="https://github.com/user-attachments/assets/e0ad449e-7d4a-4de1-a21a-44538e36c272" />


## 🚀 Project Structure

Inside of the project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

The project uses Astro to build a static site.

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
