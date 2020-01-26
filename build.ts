import * as path from "path";
import webpack = require("webpack");
import * as os from "os";
import * as fs from "fs";

export default function build(entry: string) {
  const outputPath = os.tmpdir();
  const outputFilename = new Date() + ".js";
  const outputFilePath = path.join(outputPath, outputFilename);
  return new Promise<string>((resolve, reject) => {
    webpack(
      {
        mode: "production",
        entry: path.join(__dirname, entry),
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
        fs.unlinkSync(outputFilePath);
      }
    );
  });
}
