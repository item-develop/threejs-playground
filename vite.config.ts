import fs from "fs";
import path from "path"; import liveReload from 'vite-plugin-live-reload';
import { rm } from "node:fs/promises";
import { loadEnv, defineConfig, UserConfigExport } from "vite";
import { ViteEjsPlugin } from "vite-plugin-ejs";
import { resolve } from "path";

// vite-glsl-plugin.js
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { glslify } from 'vite-plugin-glslify'
import glsl from 'vite-plugin-glsl';

const files: any = [];
function readDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const itemPath = path.join(dirPath, item);

    if (fs.statSync(itemPath).isDirectory()) {
      // componentsディレクトリを除外する
      if (item === "components") {
        continue;
      }

      readDirectory(itemPath);
    } else {
      // htmlファイル以外を除外する
      if (path.extname(itemPath) !== ".html") {
        continue;
      }

      // nameを決定する
      let name;
      if (dirPath === path.resolve(__dirname, "src")) {
        name = path.parse(itemPath).name;
      } else {
        const relativePath = path.relative(
          path.resolve(__dirname, "src"),
          dirPath
        );
        const dirName = relativePath.replace(/\//g, "_");
        name = `${dirName}_${path.parse(itemPath).name}`;
      }

      // pathを決定する
      const relativePath = path.relative(
        path.resolve(__dirname, "src"),
        itemPath
      );
      const filePath = `/${relativePath}`;
      (files as any).push({ name, path: filePath });
    }
  }
}


readDirectory(path.resolve(__dirname, "src"));

const pageData = {};

const inputFiles = {};
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  inputFiles[file.name] = resolve(__dirname, "./src" + file.path);
}


export default ({ command, mode }): UserConfigExport => {
  const CWD = process.cwd();
  const { VITE_DIST_PATH, VITE_PUBLIC_PATH } = loadEnv(mode, CWD);
  return {
    base: VITE_PUBLIC_PATH,
    root: "./src", //開発ディレクトリ設定
    server: {
      host: true,
      watch: {
        usePolling: true,
        interval: 100,
        depth: 5,
      }
    },
    publicDir: "./public",
    build: {
      outDir: resolve(__dirname, VITE_DIST_PATH),
      assetsInlineLimit: 0,

      rollupOptions: {
        //ファイル出力設定
        output: {
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name?.split(".")[1] ?? "";
            //Webフォントファイルの振り分け
            if (/ttf|otf|eot|woff|woff2/i.test(extType)) {
              extType = "fonts";
            }
            if (/png|jpe?g|svg|webp|gif|tiff|bmp|ico/i.test(extType)) {
              extType = "images";
            }
            //ビルド時のCSS名を明記してコントロールする
            if (extType === "css") {
              return `assets/css/style.css`;
            }
            return `assets/${extType}/[name][extname]`;
          },
          entryFileNames: `assets/js/main.js`,
          chunkFileNames: `assets/js/[name].js`,
        },
        input: inputFiles,
      },
    },

    plugins: [
      //glslify(),
      glsl(
        {
          include: [
            '**/*.glsl', '**/*.wgsl',
            '**/*.vert', '**/*.frag',
            '**/*.vs', '**/*.fs'
          ],
          exclude: undefined,          // Glob pattern, or array of glob patterns to ignore
          warnDuplicatedImports: true, // Warn if the same chunk was imported multiple times
          defaultExtension: 'glsl',    // Shader suffix when no extension is specified
          compress: false,             // Compress output shader code
          watch: true,                 // Recompile shader on change
          root: '/'                    // Directory for root imports
        }
      ),
      command == "build"
        ? {
          name: "Cleaning assets folder",
          async buildStart() {
            const path = resolve(__dirname, VITE_DIST_PATH + "assets");
            console.log("path:", path);
            await rm(resolve(__dirname, VITE_DIST_PATH + "assets"), {
              recursive: true,
              force: true,
            });
          },
        }
        : null,

      ViteEjsPlugin({
        baseURL: VITE_PUBLIC_PATH,
      }),

      liveReload(['components/**/*.ejs']),
    ],
  };
};
