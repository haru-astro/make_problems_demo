import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親ディレクトリのロックファイルを拾わないようルートを固定する
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
