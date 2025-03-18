// SPDX-License-Identifier: Apache-2.0

import * as os from 'os';
import * as process from 'process';

import { _errlog } from './error';

export interface OTLPExporterEndpoint {
    endpoint?: string;
    protocol?: string;
    custom_headers?: string[];
    headers?: Record<string, string>;
    compression?: string;
    request_timeout?: string;
    retry_initial_backoff?: string;
    retry_max_backoff?: string;
    retry_max_elapsed_time?: string;
    batch_max_size?: number;
    batch_timeout?: string;
    tls_cert_file?: string;
    tls_key_file?: string;
    tls_ca_file?: string;
    tls_skip_verify?: boolean;
}

// TODO: when we have more, include a key that defines this exporter type
export interface OTLPExporter extends OTLPExporterEndpoint {
    traces?: OTLPExporterEndpoint;
    metrics?: OTLPExporterEndpoint;
}

export interface Options {
    enabled?: boolean;
    pid_file?: string;
    log_file?: string;
    log_format?: string;
    debug_log?: string[];
    otlp_grpc_endpoint?: string;
    otlp_http_endpoint?: string;
    otlp_receiver_traces_disabled?: boolean;
    otlp_receiver_metrics_disabled?: boolean;
    exporter?: OTLPExporter;
}

export class Config {
    static DEFAULT_OPTIONS: Options = {
        enabled: false,
        otlp_grpc_endpoint: "localhost:4317",
        otlp_http_endpoint: "localhost:4318",
        pid_file: "/tmp/rotel-agent.pid",
        log_file: "/tmp/rotel-agent.log",
    };

    options: Options;
    valid: boolean | null;

    constructor(options: Options | null = null) {
        const opts: Options = {};
        deep_merge_options(opts, Config.DEFAULT_OPTIONS);
        deep_merge_options(opts, Config._load_options_from_env());
        if (options !== null) {
            deep_merge_options(opts, options);
        }

        this.options = opts;
        this.valid = this.validate();
    }

    is_active(): boolean {
        return Boolean(this.options.enabled) && Boolean(this.valid);
    }

    static _load_options_from_env(): Options {
        const env: Options = {
            enabled: as_bool(rotel_env("ENABLED")),
            pid_file: rotel_env("PID_FILE"),
            log_file: rotel_env("LOG_FILE"),
            log_format: rotel_env("LOG_FORMAT"),
            debug_log: as_list(rotel_env("DEBUG_LOG")),
            otlp_grpc_endpoint: rotel_env("OTLP_GRPC_ENDPOINT"),
            otlp_http_endpoint: rotel_env("OTLP_HTTP_ENDPOINT"),
            otlp_receiver_traces_disabled: as_bool(rotel_env("OTLP_RECEIVER_TRACES_DISABLED")),
            otlp_receiver_metrics_disabled: as_bool(rotel_env("OTLP_RECEIVER_METRICS_DISABLED")),
        };

        const exporter_type = as_lower(rotel_env("EXPORTER"));
        if (exporter_type === null || exporter_type === "otlp") {
            let exporter: OTLPExporter = Config._load_otlp_exporter_options_from_env(null) as OTLPExporter;
            if (exporter === null) {
                // make sure we always construct the top-level exporter config
                exporter = {};
            }
            env.exporter = exporter;

            const traces_endpoint = Config._load_otlp_exporter_options_from_env("TRACES");
            if (traces_endpoint !== null) {
                exporter.traces = traces_endpoint;
            }
            const metrics_endpoint = Config._load_otlp_exporter_options_from_env("METRICS");
            if (metrics_endpoint !== null) {
                exporter.metrics = metrics_endpoint;
            }
        }

        const final_env: Options = {};

        for (const [key, value] of Object.entries(env)) {
            if (value !== null && value !== undefined) {
                final_env[key as keyof Options] = value;
            }
        }
        return final_env;
    }

    static _load_otlp_exporter_options_from_env(endpoint_type: string | null): OTLPExporter | OTLPExporterEndpoint | undefined {
        let pfx = "OTLP_EXPORTER_";
        if (endpoint_type !== null) {
            pfx += `${endpoint_type}_`;
        }
        const endpoint: OTLPExporterEndpoint = {
            endpoint: rotel_env(pfx + "ENDPOINT"),
            protocol: as_lower(rotel_env(pfx + "PROTOCOL")),
            headers: as_dict(rotel_env(pfx + "CUSTOM_HEADERS")),
            compression: as_lower(rotel_env(pfx + "COMPRESSION")),
            request_timeout: rotel_env(pfx + "REQUEST_TIMEOUT"),
            retry_initial_backoff: rotel_env(pfx + "RETRY_INITIAL_BACKOFF"),
            retry_max_backoff: rotel_env(pfx + "RETRY_MAX_BACKOFF"),
            retry_max_elapsed_time: rotel_env(pfx + "RETRY_MAX_ELAPSED_TIME"),
            batch_max_size: as_int(rotel_env(pfx + "BATCH_MAX_SIZE")),
            batch_timeout: rotel_env(pfx + "BATCH_TIMEOUT"),
            tls_cert_file: rotel_env(pfx + "TLS_CERT_FILE"),
            tls_key_file: rotel_env(pfx + "TLS_KEY_FILE"),
            tls_ca_file: rotel_env(pfx + "TLS_CA_FILE"),
            tls_skip_verify: as_bool(rotel_env(pfx + "TLS_SKIP_VERIFY"))
        };
        // if any field is set, return the endpoint config, otherwise null
        for (const [k, v] of Object.entries(endpoint)) {
            if (v !== null && v !== undefined) {
                // Create the appropriate return type based on endpoint_type
                if (endpoint_type === null) {
                    return endpoint as OTLPExporter;
                } else {
                    return endpoint as OTLPExporterEndpoint;
                }
            }
        }
        return undefined;
    }

    build_agent_environment(): Record<string, string> {
        const opts = this.options;

        const spawn_env = { ...process.env };
        const updates: Record<string, any> = {
            "PID_FILE": opts.pid_file,
            "LOG_FILE": opts.log_file,
            "LOG_FORMAT": opts.log_format,
            "DEBUG_LOG": opts.debug_log,
            "OTLP_GRPC_ENDPOINT": opts.otlp_grpc_endpoint,
            "OTLP_HTTP_ENDPOINT": opts.otlp_http_endpoint,
            "OTLP_RECEIVER_TRACES_DISABLED": opts.otlp_receiver_traces_disabled,
            "OTLP_RECEIVER_METRICS_DISABLED": opts.otlp_receiver_metrics_disabled,
        };
        
        const exporter = opts.exporter;
        if (exporter !== undefined) {
            _set_otlp_exporter_agent_env(updates, null, exporter);

            const traces = exporter.traces;
            if (traces !== undefined) {
                _set_otlp_exporter_agent_env(updates, "TRACES", traces);
            }

            const metrics = exporter.metrics;
            if (metrics !== undefined) {
                _set_otlp_exporter_agent_env(updates, "METRICS", metrics);
            }
        }

        for (const [key, value] of Object.entries(updates)) {
            if (value !== null && value !== undefined) {
                let stringValue: string;
                if (Array.isArray(value)) {
                    stringValue = value.join(",");
                } else if (typeof value === 'object') {
                    const hdr_list: string[] = [];
                    for (const [k, v] of Object.entries(value)) {
                        hdr_list.push(`${k}=${v}`);
                    }
                    stringValue = hdr_list.join(",");
                } else {
                    stringValue = String(value);
                }
                const rotel_key = rotel_expand_env_key(key);
                spawn_env[rotel_key] = stringValue;
            }
        }

        return spawn_env;
    }

    // Perform some minimal validation for now, we can expand this as needed
    validate(): boolean | null {
        if (!this.options.enabled) {
            return null;
        }

        const exporter = this.options.exporter;
        if (exporter !== undefined) {
            const protocol = exporter.protocol;
            if (protocol !== undefined && protocol !== 'grpc' && protocol !== 'http') {
                _errlog("exporter protocol must be 'grpc' or 'http'");
                return false;
            }
        }

        const log_format = this.options.log_format;
        if (log_format !== undefined && log_format !== 'json' && log_format !== 'text') {
            _errlog("log_format must be 'json' or 'text'");
            return false;
        }

        return true;
    }
}

function _set_otlp_exporter_agent_env(updates: Record<string, any>, endpoint_type: string | null, exporter: OTLPExporter | OTLPExporterEndpoint | null): void {
    let pfx = "OTLP_EXPORTER_";
    if (endpoint_type !== null) {
        pfx += `${endpoint_type}_`;
    }
    
    Object.assign(updates, {
        [pfx + "ENDPOINT"]: exporter?.endpoint,
        [pfx + "PROTOCOL"]: exporter?.protocol,
        [pfx + "CUSTOM_HEADERS"]: exporter?.headers || exporter?.custom_headers,
        [pfx + "COMPRESSION"]: exporter?.compression,
        [pfx + "REQUEST_TIMEOUT"]: exporter?.request_timeout,
        [pfx + "RETRY_INITIAL_BACKOFF"]: exporter?.retry_initial_backoff,
        [pfx + "RETRY_MAX_BACKOFF"]: exporter?.retry_max_backoff,
        [pfx + "RETRY_MAX_ELAPSED_TIME"]: exporter?.retry_max_elapsed_time,
        [pfx + "BATCH_MAX_SIZE"]: exporter?.batch_max_size,
        [pfx + "BATCH_TIMEOUT"]: exporter?.batch_timeout,
        [pfx + "TLS_CERT_FILE"]: exporter?.tls_cert_file,
        [pfx + "TLS_KEY_FILE"]: exporter?.tls_key_file,
        [pfx + "TLS_CA_FILE"]: exporter?.tls_ca_file,
        [pfx + "TLS_SKIP_VERIFY"]: exporter?.tls_skip_verify,
    });
}

function as_dict(value: string | null | undefined): Record<string, string> | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const headers: Record<string, string> = {};
    for (const hdr_kv of value.split(",")) {
        const hdr_split = hdr_kv.split("=", 2);
        if (hdr_split.length !== 2) {
            continue;
        }
        headers[hdr_split[0]] = hdr_split[1];
    }

    return headers;
}

function as_lower(value: string | null | undefined): string | undefined {
    if (value !== null && value !== undefined) {
        return value.toLowerCase();
    }
    return undefined;
}

function as_list(value: string | null | undefined): string[] | undefined {
    if (value !== null && value !== undefined) {
        return value.split(",");
    }
    return undefined;
}

function as_int(value: string | null | undefined): number | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    try {
        return parseInt(value, 10);
    } catch (error) {
        return undefined;
    }
}

function as_bool(value: string | null | undefined): boolean | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    value = value.toLowerCase();
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    return undefined;
}

function rotel_env(base_key: string): string | undefined {
    const envVar = process.env[rotel_expand_env_key(base_key)];
    return envVar !== undefined ? envVar : undefined;
}

function rotel_expand_env_key(key: string): string {
    if (key.startsWith("ROTEL_")) {
        return key;
    }
    return "ROTEL_" + key.toUpperCase();
}

function deep_merge_options(base: Options, src: Options): void {
    deep_merge_dicts(base as Record<string, any>, src as Record<string, any>);
}

function deep_merge_dicts(base: Record<string, any>, src: Record<string, any>): void {
    for (const [k, v] of Object.entries(src)) {
        if (v === null || v === undefined) {
            continue;
        } else if (base[k] === null || base[k] === undefined) {
            base[k] = v;
        } else if (typeof v === 'object' && !Array.isArray(v)) {
            if (typeof base[k] !== 'object') {
                base[k] = {};
            }
            deep_merge_dicts(base[k], v);
        } else {
            base[k] = v;
        }
    }
}