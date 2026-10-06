import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `output: 'standalone'` se usa solo en Docker (donde generamos un
  // servidor Node autocontenido). Vercel tiene su propio sistema de
  // empaquetado y no lo necesita; activarlo ahí rompe el post-build
  // (no encuentra .next/next-server.js.nft.json).
  ...(process.env.NEXT_STANDALONE === "true"
    ? { output: "standalone" as const }
    : {}),
};

export default nextConfig;
