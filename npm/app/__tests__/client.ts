import http from 'http';
import { AddressInfo } from 'net';
import { Client } from '../client';

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { trace } from '@opentelemetry/api';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

class MockServer {
    server: http.Server
    serverAddress?: string
    received: boolean
    constructor() {
        this.received = false;
        this.server = http.createServer((req, res) => {
            if (req.url === '/v1/traces') {
                this.received = true;
                res.writeHead(200);
                res.end();
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        this.server.listen(0, () => { });
    }

    getAddress(): string {
        const address = this.server.address() as AddressInfo;
        return `http://[::1]:${address.port}`;
    }

    async waitForVariable(
        timeoutMs: number = 3000
    ): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (this.received) {
                return Promise.resolve(true); 
            }
            // avoid busy waiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return Promise.resolve(false);
    }
}

describe('HTTP Server Mocking', () => {
    let mockServer: MockServer;
    let serverAddress: string | undefined;
    let provider: NodeTracerProvider;
    let exporter: OTLPTraceExporter;

    beforeEach((done) => {
        global.console = require('console');
        mockServer = new MockServer();
        serverAddress = mockServer.getAddress();
        done();

        exporter = new OTLPTraceExporter({
            url: 'http://127.0.0.1:4317', 
        });

        // Initialize the tracer provider
        provider = new NodeTracerProvider({
            spanProcessors: [
                new SimpleSpanProcessor(exporter)
            ],
        });

        // Register the provider as the global tracer provider
        provider.register();
    });

    it('Mock OTLP Endpoint should receive trace from rotel', async () => {
        process.env.ROTEL_ENABLED = "true";
        process.env.ROTEL_DEBUG_LOG = "[traces]";
        process.env.ROTEL_OTLP_EXPORTER_ENDPOINT = `${serverAddress}`;
        process.env.ROTEL_OTLP_EXPORTER_PROTOCOL = "http";
        process.env.ROTEL_OTLP_EXPORTER_COMPRESSION = "none";
        process.env.ROTEL_OTLP_EXPORTER_BATCH_TIMEOUT = "1ms";

        const client = new Client({
            enabled: true,
            debug_log: ["traces"],
        });
        client.start();
        const tracer = trace.getTracer('my-application-tracer');
        const mainSpan = tracer.startSpan('main');
        mainSpan.end();
        await provider.forceFlush();
        provider.shutdown
        const result = await mockServer.waitForVariable();
        expect(result).toBe(true)
        mockServer.server.close();
        client.stop();
    });
});
