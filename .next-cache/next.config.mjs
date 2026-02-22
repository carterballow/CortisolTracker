import path from "path";

export default {
  experimental: {
    turbopackFileSystemCache: true,
  },
  turbopack: {
    cacheDir: path.join(process.cwd(), ".next-cache"),
  },
};