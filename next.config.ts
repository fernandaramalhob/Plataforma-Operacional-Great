import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  distDir: process.env.NODE_ENV === "development" ? ".next-local" : ".next",
}

export default nextConfig
