import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // simzzy-backend is a TS workspace package (exports the Prisma client) — let Next compile it.
  transpilePackages: ["simzzy-backend"],
  // Keep Prisma engine + bcrypt out of the bundle; required from node_modules at runtime.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "bcryptjs"],
};

export default nextConfig;
