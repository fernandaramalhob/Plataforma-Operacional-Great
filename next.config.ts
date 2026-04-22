import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  distDir: ".next-local",
}

export default nextConfig
