import * as path from "path";
import webpack = require("webpack");
import * as os from "os";
import * as fs from "fs";

let serial = 0;

export default function build(entry: string) {
  const outputPath = os.tmpdir();
  const outputFilename = Date.now().toString() + ++serial + ".js";
  const outputFilePath = path.join(outputPath, outputFilename);
  return new Promise<string>((resolve, reject) => {
    webpack(
      {
        mode: "production",
        entry,
        resolve: {
          extensions: [".js", ".ts", ".json"]
        },
        output: {
          libraryTarget: "commonjs",
          path: outputPath,
          filename: outputFilename
        },
        target: "node",
        externals: [/aws-sdk/],
        module: {
          rules: [
            {
              test: /\.ts$/,
              loader: "ts-loader",
              options: {
                transpileOnly: true
              }
            }
          ]
        },
        optimization: {
          usedExports: true
        }
      },
      (err, stats) => {
        if (err) {
          reject(err);
        } else if (stats.hasErrors()) {
          reject(stats);
        } else {
          resolve(fs.readFileSync(outputFilePath, "utf-8"));
        }
        if (fs.existsSync(outputFilePath)) {
          fs.unlinkSync(outputFilePath);
        }
      }
    );
  });
}
