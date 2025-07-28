# rotel 🌶️ 🍅
Node.js package for the Rotel lightweight OpenTelemetry collector.

[![npm version](https://badge.fury.io/js/@streamfold%2Frotel.svg)](https://badge.fury.io/js/@streamfold%2Frotel)
## Description

This package provides an embedded OpenTelemetry collector, built on the lightweight Rotel collector. When started, it spawns a background daemon that accepts OpenTelemetry metrics, traces, and logs. Designed for minimal overhead, Rotel reduces resource consumption while simplifying telemetry collection and processing in Node.js applications—without requiring additional sidecar containers.

| Telemetry Type | Support     |
|----------------|-------------|
| Metrics        | Alpha       |
| Traces         | Alpha       |
| Logs           | Alpha       |

## How it works

By default, the Rotel agent listens for OpenTelemetry data over **gRPC (port 4317)** and **HTTP (port 4318)** on _localhost_. It efficiently batches telemetry signals and forwards them to a configurable OpenTelemetry protocol (OTLP) compatible endpoint.

In your application, you use the [OpenTelemetry Javascript SDK](https://opentelemetry.io/docs/languages/js/) to add instrumentation for traces, metrics, and logs. The SDK by default will communicate over ports 4317 or 4318 on _localhost_ to the Rotel agent. You can now ship your instrumented application and efficiently export OpenTelemetry data to your vendor or observability tool of choice with a single deployment artifact.

Future updates will introduce support for filtering data, transforming telemetry, and exporting to different vendors and tools.

## Getting started

### Rotel configuration

Add the `rotel` npm package to your project's dependencies. There are two approaches to configuring rotel:
1. Typescript or Javascript 
2. Environment variables

#### JS / TS config 

In the startup section of your `index.js` or `index.ts` add the following code block. Replace the endpoint with the endpoint of your OpenTelemetry vendor and any required API KEY headers. 

---
```javascript
const { Rotel,Config } = require("@streamfold/rotel");
const { Client } require("@streamfold/rotel/client");

const rotel = new Rotel({
  enabled: true,
  exporters: {
    "otlp" : Config.otlp_exporter({
        endpoint: "https://foo.example.com",
        headers: {
          "x-api-key": "xxxxx",
        },
    }),             
  },
  exporters_traces: ["otlp"],
  exporters_metrics: ["otlp"],
  exporters_logs: ["otlp"],
})
rotel.start()
```

#### Environment variables

You can also configure rotel entirely with environment variables. In your application startup, insert:
```javascript
const { Rotel } = require("@streamfold/rotel");
new Rotel().start();
```

In your application deployment configuration, set the following environment variables. These match the typed configuration above:
* `ROTEL_ENABLED=true`
* `ROTEL_EXPORTERS=otlp`
* `ROTEL_EXPORTER_OTLP_ENDPOINT=https://foo.example.com`
* `ROTEL_EXPORTER_OTLP_CUSTOM_HEADERS=x-api-key={API_KEY}`
* `ROTEL_EXPORTERS_TRACES=otlp`
* `ROTEL_EXPORTERS_METRICS=otlp`
* `ROTEL_EXPORTERS_LOGS=otlp`

Any typed configuration options will override environment variables of the same name.

---

See the [*Configuration*](#configuration) section for the full list of options.

### OpenTelemetry SDK configuration

Once the rotel collector agent is running, you may need to configure your application's instrumentation. If you are using the default rotel endpoints of *localhost:4317* and *localhost:4318*, then you should not need to change anything. 

To set the endpoint the OpenTelemetry SDK will use, set the following environment variable:

* `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`

## Configuration

This is the full list of options and their environment variable alternatives. Any defaults left blank in the table are either False or None. 

| Option Name                    | Type         | Environ                              | Default              | Options         |
|--------------------------------|--------------|--------------------------------------|----------------------|-----------------|
| enabled                        | boolean      | ROTEL_ENABLED                        |                      |                 |
| pid_file                       | string       | ROTEL_PID_FILE                       | /tmp/rotel-agent.pid |                 |
| log_file                       | string       | ROTEL_LOG_FILE                       | /tmp/rotel-agent.log |                 |
| log_format                     | string       | ROTEL_LOG_FORMAT                     | text                 | json, text      |
| debug_log                      | string[]     | ROTEL_DEBUG_LOG                      |                      | traces, metrics |
| otlp_grpc_endpoint             | string       | ROTEL_OTLP_GRPC_ENDPOINT             | localhost:4317       |                 |
| otlp_http_endpoint             | string       | ROTEL_OTLP_HTTP_ENDPOINT             | localhost:4318       |                 |
| otlp_receiver_traces_disabled  | boolean      | ROTEL_OTLP_RECEIVER_TRACES_DISABLED  |                      |                 |
| otlp_receiver_metrics_disabled | boolean      | ROTEL_OTLP_RECEIVER_METRICS_DISABLED |                      |                 |
| otlp_receiver_logs_disabled    | boolean      | ROTEL_OTLP_RECEIVER_LOGS_DISABLED    |                      |                 |
| exporters                      | Map<string, Exporter> |                                      |                      |                 |
| exporters_traces               | string[]              | ROTEL_EXPORTERS_TRACES               |                      |                 |
| exporters_metrics              | string[]              | ROTEL_EXPORTERS_METRICS              |                      |                 |
| exporters_logs                 | string[]              | ROTEL_EXPORTERS_LOGS                 |                      |                 |

For each exporter you would like to use, see the configuration options below. Exporters should be assigned to the `exporters` object with a custom name.

### OTLP Exporter

To construct an OTLP exporter, use the method `Config.otlp_exporter()` with the following options.

| Option Name            | Type                   | Default | Options      |
|------------------------|------------------------|---------|--------------|
| endpoint               | string                 |         |              |
| protocol               | string                 | grpc    | grpc or http |
| headers                | Map<string, string>    |         |              |
| compression            | string                 | gzip    | gzip or none |
| request_timeout        | string                 | 5s      |              |
| retry_initial_backoff  | string                 | 5s      |              |
| retry_max_backoff      | string                 | 30s     |              |
| retry_max_elapsed_time | string                 | 300s    |              |
| batch_max_size         | number                 | 8192    |              |
| batch_timeout          | string                 | 200ms   |              |
| tls_cert_file          | string                 |         |              |
| tls_key_file           | string                 |         |              |
| tls_ca_file            | string                 |         |              |
| tls_skip_verify        | boolean                |         |              |

### Datadog Exporter

Rotel provides an experimental [Datadog exporter](https://github.com/streamfold/rotel/blob/main/src/exporters/datadog/README.md) that supports traces at the moment. Construct a Datadog exporter with the method `Config.datadog_exporter()` using the following options.

| Option Name            | Type                   | Default | Options                |
|------------------------|------------------------|---------|------------------------|
| region                 | string                 | us1     | us1, us3, us5, eu, ap1 |
| custom_endpoint        | string                 |         |                        |
| api_key                | string                 |         |                        |

### ClickHouse Exporter

Rotel provides a ClickHouse exporter with support for metrics, logs, and traces. Construct a ClickHouse exporter with the method `Config.clickhouse_exporter()` using the following options.

| Option Name            | Type                   | Default | Options |
|------------------------|------------------------|---------|---------|
| endpoint               | string                 |         |         |
| database               | string                 | otel    |         |
| table_prefix           | string                 | otel    |         |
| compression            | string                 | lz4     |         |
| async_insert           | boolean                | true    |         |
| user                   | string                 |         |         |
| password               | string                 |         |         |
| enable_json            | boolean                |         |         |
| json_underscore        | boolean                |         |         |

### Kafka Exporter

Rotel provides a Kafka exporter with support for metrics, logs, and traces. Construct a Kafka exporter with the method `Config.kafka_exporter()` using the following options.

| Option Name                                | Type     | Default           | Options                                                                      |
|--------------------------------------------|----------|-------------------|------------------------------------------------------------------------------|
| brokers                                    | string[] | localhost:9092    |                                                                              |
| traces_topic                               | string   | otlp_traces       |                                                                              |
| logs_topic                                 | string   | otlp_logs         |                                                                              |
| metrics_topic                              | string   | otlp_metrics      |                                                                              |
| format                                     | string   | protobuf          | json, protobuf                                                               |
| compression                                | string   | none              | gzip, snappy, lz4, zstd, none                                                |
| acks                                       | string   | one               | all, one, none                                                               |
| client_id                                  | string   | rotel             |                                                                              |
| max_message_bytes                          | number   | 1000000           |                                                                              |
| linger_ms                                  | number   | 5                 |                                                                              |
| retries                                    | number   | 2147483647        |                                                                              |
| retry_backoff_ms                           | number   | 100               |                                                                              |
| retry_backoff_max_ms                       | number   | 1000              |                                                                              |
| message_timeout_ms                         | number   | 300000            |                                                                              |
| request_timeout_ms                         | number   | 30000             |                                                                              |
| batch_size                                 | number   | 1000000           |                                                                              |
| partitioner                                | string   | consistent-random | consistent, consistent-random, murmur2-random, murmur2, fnv1a, fnv1a-random |
| partition_metrics_by_resource_attributes   | boolean  |                   |                                                                              |
| partition_logs_by_resource_attributes      | boolean  |                   |                                                                              |
| custom_config                              | string   |                   |                                                                              |
| sasl_username                              | string   |                   |                                                                              |
| sasl_password                              | string   |                   |                                                                              |
| sasl_mechanism                             | string   |                   |                                                                              |
| security_protocol                          | string   | PLAINTEXT         | PLAINTEXT, SSL, SASL_PLAINTEXT, SASL_SSL                                     |

### Blackhole Exporter

The Blackhole exporter is useful for testing purposes. It accepts telemetry data but does not forward it anywhere. Construct a Blackhole exporter with the method `Config.blackhole_exporter()`. This exporter has no configuration options.

### Multiple Exporters

Rotel supports [multiple exporters](https://rotel.dev/docs/configuration/multiple-exporters), allowing you to send data to different destinations per telemetry type. Just set the `exporters` entry to an object of exporter definitions and then configure the exporters per telemetry type. For example, this will send metrics and logs to an OTLP endpoint while sending traces to Datadog:

```javascript
const { Rotel, Config } = require("@streamfold/rotel");

const rotel = new Rotel({
  enabled: true,
  exporters: {
    "logs_and_metrics": Config.otlp_exporter({
      endpoint: "https://foo.example.com",
      headers: {
        "x-api-key": process.env.API_KEY,
        "x-data-set": "testing"
      }
    }),
    "tracing": Config.datadog_exporter({
      api_key: "1234abcd",
    }),
  },
  // Define exporters per telemetry type
  exporters_traces: ["tracing"],
  exporters_metrics: ["logs_and_metrics"],
  exporters_logs: ["logs_and_metrics"]
});
rotel.start();
```

### Endpoint overrides

When using the OTLP exporter over HTTP, the exporter will append `/v1/traces`, `/v1/metrics`, or `/v1/logs` to the endpoint URL for traces, metrics, and logs respectively. If the service you are exporting telemetry data to does not support these standard URL paths, you can individually override them for traces, metrics, and logs.

For example, to override the endpoint for traces and metrics you can do the following:
```javascript
const { Rotel, Config } = require("@streamfold/rotel");

const rotel = new Rotel({
  enabled: true,
  exporters: {
    "otlp": Config.otlp_exporter({
      headers: {
        "x-api-key": "xxxxx",
      },
      traces: {
        endpoint: "http://foo.example.com:4318/api/otlp/traces",
      },
      metrics: {
        endpoint: "http://foo.example.com:4318/api/otlp/metrics",
      }
    })
  },
  exporters_traces: ["otlp"],
  exporters_metrics: ["otlp"],
  exporters_logs: ["otlp"]
});
rotel.start();
```

Or, you can override the endpoints using environment variables:
* `ROTEL_OTLP_EXPORTER_TRACES_ENDPOINT=http://foo.example.com:4318/api/otlp/traces`
* `ROTEL_OTLP_EXPORTER_METRICS_ENDPOINT=http://foo.example.com:4318/api/otlp/metrics`
* `ROTEL_OTLP_EXPORTER_METRICS_ENDPOINT=http://foo.example.com:4318/api/otlp/logs`

All the OTLP exporter settings can be overridden per endpoint type (traces, metrics, logs). Any value that is not overridden will fall back to the top-level exporter configuration or the default.

### Retries and timeouts

You can override the default request timeout of 5 seconds for the OTLP Exporter with the exporter setting:

* `request_timeout`: Takes a string time duration, so `"250ms"` for 250 milliseconds, `"3s"` for 3 seconds, etc.

Requests will be retried if they match retryable error codes like 429 (Too Many Requests) or timeout. You can control the behavior with the following exporter options:

* `retry_initial_backoff`: Initial backoff duration
* `retry_max_backoff`: Maximum backoff interval
* `retry_max_elapsed_time`: Maximum wall time a request will be retried for until it is marked as permanent failure

All options should be represented as string time durations.

### Full OTEL example

To illustrate this further, here's a full example of how to use Rotel to send trace spans to [Axiom](https://axiom.co/)
from an application instrumented with OpenTelemetry.

The code sample depends on the following environment variables:
* `ROTEL_ENABLED=true`: Turn on or off based on the deployment environment
* `AXIOM_DATASET`: Name of an Axiom dataset
* `AXIOM_API_TOKEN`: Set to an API token that has access to the Axiom dataset

```javascript
const { Rotel, Config } = require("@streamfold/rotel");

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { trace } = require('@opentelemetry/api');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { ATTR_SERVICE_NAME } = require ('@opentelemetry/semantic-conventions');
const { resourceFromAttributes } = require('@opentelemetry/resources');

function initRotel() {
  const rotel = new Rotel({
    enabled: true,
    exporters: {
      "axiom": Config.otlp_exporter({
        endpoint: "https://api.axiom.co",
        protocol: "http",
        headers: {
          "Authorization": "Bearer " + process.env.AXIOM_API_TOKEN,
          "X-Axiom-Dataset": process.env.AXIOM_DATASET
        }
      })
    },
    exporters_traces: ["axiom"],
    exporters_metrics: ["axiom"],
    exporters_logs: ["axiom"]
  })
  return rotel;
}

function initOtel() {
  const exporter = new OTLPTraceExporter({                                                                                                                   
    url: 'http://127.0.0.1:4317', // points to out local rotel collector                                                                                                                    
  });                                                                                                                                                  
                                                                                                                                                     
  // Initialize the tracer provider                                                                                                                    
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'rotel-nodejs-service',
    }),
    spanProcessors: [
        new SimpleSpanProcessor(exporter)
    ],
  });

  // Register the provider as the global tracer provider
  provider.register();
  return provider;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main routine
  async function main() {
  const rotel = initRotel();
  const provider = initOtel();
  rotel.start();
  console.log("Hello from example");
  const tracer = trace.getTracer('rotel-node-js-hello-world');
  console.log("starting main span");
  const mainSpan = tracer.startSpan('main');
  // sleep for a second to simulate span start/end time
  await sleep(1000);
  mainSpan.end();
  console.log("main span ended, flushing")
  await provider.forceFlush();
  await provider.shutdown();
  rotel.stop();
  console.log("goodbye")
}

main();

```

For the complete example, see the [hello world](https://github.com/streamfold/rotel-nodejs-hello-world) application.

## Debugging

If you set the option `debug_log` to `["traces"]`, or the environment variable `ROTEL_DEBUG_LOG=traces`, then rotel will log a summary to the log file `/tmp/rotel-agent.log` each time it processes trace spans. You can add also specify *metrics* to debug metrics and *logs* to debug logs.   

## FAQ

### Do I need to call `rotel.stop()` when I exit?

In most deployment environments you do not need to call `rotel.stop()` and it is **generally recommended that you don't**. Calling `rotel.stop()` will
terminate the running agent on a host, so any further export calls from OTEL instrumentation will fail. In a multiprocess environment, such as
[clusters](https://nodejs.org/api/cluster.html) of node.js processes, terminating the Rotel agent from one process will terminate it for all other processes. On ephemeral deployment platforms, it is
usually fine to leave the agent running until the compute instance, VM/container/isolate, terminate.

## Community

Want to chat about this project, share feedback, or suggest improvements? Join our [Discord server](https://discord.gg/reUqNWTSGC)! Whether you're a user of this project or not, we'd love to hear your thoughts and ideas. See you there! 🚀

## Developing

See the [DEVELOPING.md](DEVELOPING.md) doc for building and development instructions.
