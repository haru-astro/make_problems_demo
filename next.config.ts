import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリのロックファイルを拾わないようルートを固定する
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    serverActions: {
      // 画像アップロードのため既定の 1MB から引き上げる
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
