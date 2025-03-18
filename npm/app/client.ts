//import { spawnSync } from "child_process";

// /**
//  * Returns the executable path which is located inside `node_modules`
//  * The naming convention is app-${os}-${arch}
//  * If the platform is `win32` or `cygwin`, executable will include a `.exe` extension.
//  * @see https://nodejs.org/api/os.html#osarch
//  * @see https://nodejs.org/api/os.html#osplatform
//  * @example "x/xx/node_modules/app-darwin-arm64"
//  */
// export class Client {
//   private getExePath(): string | Error {
//     const arch = process.arch;
//     let os = process.platform as string;

//     try {
//       // Since the binary will be located inside `node_modules`, we can simply call `require.resolve`
//       return require.resolve(`rotel-agent-${os}-${arch}/bin/rotel-agent`);
//     } catch (e) {
//       throw new Error(
//         `Couldn't find application binary inside node_modules for ${os}-${arch}`
//       );
//     }
//   }

//   /**
//    * Runs the application with args using nodejs spawn
//   */
//   public run(): void {
//     const args = process.argv.slice(2);
//       const path = this.getExePath();
//       if (path instanceof Error) {
//         console.error(path.message);
//       } else {
//         const processResult = spawnSync(path, args, { stdio: "inherit" });
//         process.exit(processResult.status ?? 0);
//       }
//   }
// }

// SPDX-License-Identifier: Apache-2.0

import { agent } from './agent';
import { Config, Options } from './config';

let _client: Client | null = null;

class Client {
    config: Config;

    constructor(options: Options) {
        this.config = new Config(options);
        _client = this;
    }

    static get(): Client | null {
        return _client;
    }

    async start(): Promise<void> {
        if (this.config.is_active()) {
            const res = await agent.start(this.config);
            console.log(res);
        }
    }

    stop(): void {
        if (this.config.is_active()) {
            agent.stop();
        }
    }
}

export { Client };

