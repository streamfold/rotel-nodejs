// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { Config } from './config';


class Agent {
    //pkg_path: string = path.dirname(__filename);
    agent_path: string; // = path.join(this.pkg_path, "rotel-agent");
    running: boolean = false;
    pid_file: string | null = null;

    constructor(agent_path: string) {
        this.agent_path = agent_path;
    }

    async start(config: Config): Promise<boolean> {
        const agent_env = config.build_agent_environment();

        const p = child_process.spawn(
            this.agent_path,
            ["start", "--daemon"],
            {
                env: agent_env,
                stdio: ['pipe', 'pipe', 'pipe']
            }
        );

        try {
            // In TypeScript, we need to handle the process output differently
            let outs = '';
            let errs = '';
            
            // Set up promise to collect output
            const stdoutPromise = new Promise<void>((resolve) => {
                p.stdout.on('data', (data) => {
                    outs += data.toString();
                });
                p.stdout.on('end', resolve);
            });
            
            const stderrPromise = new Promise<void>((resolve) => {
                p.stderr.on('data', (data) => {
                    errs += data.toString();
                });
                p.stderr.on('end', resolve);
            });
            
            // Set up timeout
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 1000);
            });
            
            // Wait for process to finish or timeout
            Promise.race([
                Promise.all([stdoutPromise, stderrPromise, new Promise<void>(resolve => {
                    p.on('close', resolve);
                })]),
                timeoutPromise
            ]).catch(() => {
                // Kill process on timeout
                p.kill();
            });
            
            return new Promise<boolean>(resolve => {
                p.on('close', (ret_code: number) => {
                    if (ret_code !== 0) {
                        const out = outs.trim();
                        const err = errs.trim();
                        const output = [out, err].filter(Boolean).join(" - ");
                        console.log(`Rotel agent is unable to start (return code: ${ret_code}): ${output}`);
                        resolve(false);
                    } else {
                        this.running = true;
                        this.pid_file = config.options.pid_file || null;
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            p.kill();
            console.log(`Error starting agent: ${error}`);
            return false;
        }
    }

    stop(): void {
        if (this.running === false) {
            console.log("Rotel agent is not running");
            return;
        }

        // Could this be bad if the agent died and the PID was recycled?
        // (alternatively could send a shutdown command over an RPC channel)
        if (this.pid_file !== null) {
            try {
                const line = fs.readFileSync(this.pid_file, 'utf8');
                const pid = parseInt(line);
                
                try {
                    // In Node.js we use process.kill for sending signals
                    process.kill(pid, 'SIGTERM');
                    
                    // wait up to 2.25 secs for this exit
                    setTimeout(() => {
                        const checkInterval = setInterval(() => {
                            try {
                                // Check if process exists
                                process.kill(pid, 0);
                            } catch (error) {
                                // Process doesn't exist anymore
                                clearInterval(checkInterval);
                                return;
                            }
                        }, 500);
                        
                        // Clear interval after 2 seconds (4 * 500ms)
                        setTimeout(() => clearInterval(checkInterval), 2000);
                    }, 250);
                } catch (error) {
                    // Process might not exist
                }
            } catch (error) {
                if (error instanceof Error) {
                    if ((error as any).code === 'ENOENT') { // Cast to any to access code property
                        console.log("Unable to locate agent pid file");
                    } else if ((error as any).code === 'ESRCH') { // Cast to any to access code property
                        // In multi-worker configs, the process may have already terminated
                    } else {
                        throw error;
                    }
                }
            }
        }
    }
}

function getExePath(): string {
    const arch = process.arch;
    let os = process.platform as string;

    try {
    // Since the binary will be located inside `node_modules`, we can simply call `require.resolve`
        return require.resolve(`rotel-agent-${os}-${arch}/bin/rotel-agent`);
    } catch (e) {
        throw new Error(
            `Couldn't find application binary inside node_modules for ${os}-${arch}`
        );
    }
} 

export const agent = new Agent(getExePath());

