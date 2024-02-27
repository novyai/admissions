/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@repo/db", "@repo/ui", "@repo/graph"]
}

module.exports = nextConfig
