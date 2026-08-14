import { serveFile, serveDir } from "https://deno.land/std/http/file_server.ts";

async function handle(req) {
    const pathname = new URL(req.url).pathname;

    // ---- Static files ----
    return serveDir(req, {
        fsRoot: "web",
        urlRoot: "",
    });
}

if (import.meta.main) {
    console.log("Starting server...")
    Deno.serve(handle, { port: Deno.env.get("PORT") || 3000 });
}

// app.get('/', serveStatic({ path: "./web/index.html" }))
// app.get('/about', serveStatic({ path: "./web/about.html" }))
// app.get('/coding', serveStatic({ path: "./web/projects.html" }))
// app.get('/maps', serveStatic({ path: "./web/maps.html" }))