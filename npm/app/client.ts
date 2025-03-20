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
            await agent.start(this.config);
        }
    }

    stop(): void {
        if (this.config.is_active()) {
            agent.stop();
        }
    }
}

export { Client };

