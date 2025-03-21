#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "child_process";

/**
 * Returns the executable path which is located inside `node_modules`
 * The naming convention is app-${os}-${arch}
 * If the platform is `win32` or `cygwin`, executable will include a `.exe` extension.
 * @see https://nodejs.org/api/os.html#osarch
 * @see https://nodejs.org/api/os.html#osplatform
 * @example "x/xx/node_modules/app-darwin-arm64"
 */
function getExePath() {
  const arch = process.arch;
  let os = process.platform as string;

  try {
    // Since the binary will be located inside `node_modules`, we can simply call `require.resolve`
    return require.resolve(`@streamfold/rotel-${os}-${arch}/bin/rotel-agent`);
  } catch (e) {
    throw new Error(
      `Couldn't find application binary inside node_modules for ${os}-${arch}`
    );
  }
}

/**
 * Runs the application with args using nodejs spawn
 */
function run() {
  const args = process.argv.slice(2);
  const processResult = spawnSync(getExePath(), args, { stdio: "inherit" });
  process.exit(processResult.status ?? 0);
}

run();
