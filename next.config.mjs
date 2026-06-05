/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', 'better-sqlite3', 'satori', '@resvg/resvg-js'],
};

export default nextConfig;