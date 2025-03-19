import exp from 'constants';
import { Config } from './config';

// TODO add some tests for merging configs

beforeEach(() => {
    global.console = require('console');
});


describe('configuration and validation', () => {
    it('Default options, enabled false', () => {
        let defaults = Config.DEFAULT_OPTIONS;
        expect(defaults.enabled).toBe(false);
    });

    it('Load base config from ENV', () => {
        process.env.ROTEL_ENABLED = "true";
        process.env.ROTEL_PID_FILE = "/var/rotel.pid";
        process.env.ROTEL_LOG_FILE = "/var/rotel.log";
        process.env.ROTEL_LOG_FORMAT = "json";
        process.env.ROTEL_DEBUG_LOG = "[traces]";
        process.env.ROTEL_OTLP_GRPC_ENDPOINT = "https://foo.bar.com";
        process.env.ROTEL_OTLP_HTTP_ENDPOINT = "https://foo.bar.com";
        process.env.ROTEL_OTLP_RECEIVER_TRACES_DISABLED = "true";
        process.env.ROTEL_OTLP_RECEIVER_METRICS_DISABLED = "true";
        let c = Config._load_options_from_env();
        expect(c.enabled).toBe(true);
        expect(c.pid_file).toBe("/var/rotel.pid");
        expect(c.log_file).toBe("/var/rotel.log");
        expect(c.log_format).toBe("json");
        expect(c.debug_log).toStrictEqual(["[traces]"]);
        expect(c.otlp_grpc_endpoint).toBe("https://foo.bar.com");
        expect(c.otlp_http_endpoint).toBe("https://foo.bar.com");
        expect(c.otlp_receiver_traces_disabled).toBe(true);
        expect(c.otlp_receiver_metrics_disabled).toBe(true);
    });

    it('Load exporter config from ENV', () => {
        process.env.ROTEL_OTLP_EXPORTER_ENDPOINT = "https://api.foo.com";
        process.env.ROTEL_OTLP_EXPORTER_PROTOCOL = "http";
        process.env.ROTEL_OTLP_EXPORTER_CUSTOM_HEADERS = "[x-api-key=123]";
        process.env.ROTEL_OTLP_EXPORTER_COMPRESSION = "none";
        process.env.ROTEL_OTLP_EXPORTER_REQUEST_TIMEOUT = "100s";
        process.env.ROTEL_OTLP_EXPORTER_RETRY_INITIAL_BACKOFF = "200s";
        process.env.ROTEL_OTLP_EXPORTER_RETRY_MAX_BACKOFF = "300s";
        process.env.ROTEL_OTLP_EXPORTER_RETRY_MAX_ELAPSED_TIME = "400s";
        process.env.ROTEL_OTLP_EXPORTER_BATCH_MAX_SIZE = "9000";
        process.env.ROTEL_OTLP_EXPORTER_BATCH_TIMEOUT = "500ms";
        process.env.ROTEL_OTLP_EXPORTER_TLS_CERT_FILE = "cert.file";
        process.env.ROTEL_OTLP_EXPORTER_TLS_KEY_FILE = "key.file";
        process.env.ROTEL_OTLP_EXPORTER_TLS_CA_FILE = "ca.file";
        process.env.ROTEL_OTLP_EXPORTER_TLS_SKIP_VERIFY = "true";
        let c = Config._load_otlp_exporter_options_from_env(null);
        expect(c?.endpoint).toBe("https://api.foo.com");
        expect(c?.protocol).toBe("http");
        expect(c?.headers).toStrictEqual({"[x-api-key": "123]"})
        expect(c?.compression).toBe("none");
        expect(c?.request_timeout).toBe("100s");
        expect(c?.retry_initial_backoff).toBe("200s");
        expect(c?.retry_max_backoff).toBe("300s");
        expect(c?.retry_max_elapsed_time).toBe("400s");
        expect(c?.batch_max_size).toBe(9000);
        expect(c?.batch_timeout).toBe("500ms");
        expect(c?.tls_cert_file).toBe("cert.file");
        expect(c?.tls_key_file).toBe("key.file");
        expect(c?.tls_ca_file).toBe("ca.file");
        expect(c?.tls_skip_verify).toBe(true);
    });

    it('fails validation', () => {
        
        const c1 = new Config();
        c1.options.exporter = {protocol: "X.500"};
        expect(c1.validate()).toBe(false)

        const c2 = new Config();
        c2.options.log_format = "ascii";
        expect(c2.validate()).toBe(false)
    });
});