import { rm } from "node:fs/promises";
import { loadEnv, defineConfig } from "vite";
import { ViteEjsPlugin } from "vite-plugin-ejs";
import { resolve } from "path";


const inputSource = {
  main: resolve(__dirname, "src/index.html"),
};

const pageData = {};

export default ({ command, mode }) => {
  const CWD = process.cwd();
  console.log("command:", command);
  const { VITE_DIST_PATH, VITE_PUBLIC_PATH } = loadEnv(mode, CWD);
  return {
    base: VITE_PUBLIC_PATH,
    root: "./src", //開発ディレクトリ設定
    server: {
      host: true,
    },
    publicDir: "./public",
    build: {
      outDir: resolve(__dirname, VITE_DIST_PATH),
      assetsInlineLimit: 0,

      rollupOptions: {
        //ファイル出力設定
        output: {
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split(".")[1];
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
        input: inputSource,
      },
    },

    plugins: [
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


    ],
  };
};
