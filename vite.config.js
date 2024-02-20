import { defineConfig } from "vite";
import { ViteEjsPlugin } from "vite-plugin-ejs";
//import設定を追記
import { resolve } from "path";
//import設定を追記
import handlebars from "vite-plugin-handlebars";
// HTMLの複数出力を自動化する
//./src配下のファイル一式を取得
import fs from "fs";
import path from "path";

const assetsPath = "menu/kaki";
const files = [];
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

      files.push({ name, path: filePath });
    }
  }
}
readDirectory(path.resolve(__dirname, "src"));
const inputFiles = {};
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  inputFiles[file.name] = resolve(__dirname, "./src" + file.path);
}


//HTML上で出し分けたい各ページごとの情報
const pageData = {
  "/products/asanocyaji/index.html": {
  },
};

export default defineConfig({
  root: "./src", //開発ディレクトリ設定
  server: {
    host: true,
  },
  publicDir: "./public",
  build: {
    assetsInlineLimit: 0,
    outDir: "../dist", //出力場所の指定
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
            return `assets/${assetsPath}/css/style.css`;
          }
          console.log("assetInfo:", assetInfo);
          return `assets/${assetsPath}/${extType}/[name][extname]`;
        },
        entryFileNames: `assets/${assetsPath}/js/main.js`,
        chunkFileNames: `assets/${assetsPath}/js/[name].js`,
      },
      input: inputFiles,
    },
  },

  plugins: [
    ViteEjsPlugin(),

    handlebars({
      //コンポーネントの格納ディレクトリを指定
      partialDirectory: [
        resolve(__dirname, "./src/components"),
        resolve(__dirname, "./src/components/Top"),
        resolve(__dirname, "./src/components/Invest"),
      ],
      //各ページ情報の読み込み
      context(pagePath) {
        return pageData[pagePath];
      },
    }),
  ],
});
