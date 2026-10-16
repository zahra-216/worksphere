# WorkSphere frontend (React + Vite + Tailwind)

    npm install
    cp .env.example .env     # set VITE_API_URL to your Laravel /api address
    npm run dev              # http://localhost:5173
    npm run build            # output in dist/ -> upload to worksphere.ttmetrocampus.com

On the backend set FRONTEND_URL to the same address as this site so email links work.
Because it is a single-page app, point the web server's 404/fallback to index.html.

Accent colour: change --color-accent in src/index.css.
