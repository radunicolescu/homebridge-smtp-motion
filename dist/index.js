"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const bunyan_1 = __importDefault(require("bunyan"));
const http_1 = __importDefault(require("http"));
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const smtp_server_1 = require("smtp-server");
const mailparser_1 = require("mailparser");
const stream_1 = __importDefault(require("stream"));
const PLUGIN_NAME = 'homebridge-smtp-motion';
const PLATFORM_NAME = 'smtpMotion';
class SmtpMotionPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        api.on("didFinishLaunching", this.startSmtp.bind(this));
    }
    configureAccessory(accessory) {
        return;
    }
    startSmtp() {
        const smtpPort = this.config.smtp_port || 2525;
        const httpPort = this.config.http_port || 8080;
        const regex = new RegExp(lodash_escaperegexp_1.default(this.config.space_replace || '+'), 'g');
        const log = this.log;
        const logStream = new stream_1.default.Writable({
            write: (chunk, encoding, callback) => {
                const data = JSON.parse(chunk);
                this.log.debug('[SMTP Server] ' + data.msg);
                callback();
            }
        });
        const bunyanLog = bunyan_1.default.createLogger({
            name: 'smtp',
            streams: [{
                    stream: logStream
                }]
        });
        const server = new smtp_server_1.SMTPServer({ authOptional: true,
            disabledCommands: ['STARTTLS'],
            logger: bunyanLog, onAuth(auth, session, callback) {
                callback(null, { user: true });
            },
            onData(stream, session, callback) {
                stream.on('data', () => { });
                stream.on('end', callback);
                mailparser_1.simpleParser(stream, {})
                    .then((parsed) => {
                    log(parsed.subject || "");
                })
                    .catch((err) => {
                    log.error(err);
                });
                session.envelope.rcptTo.forEach((rcptTo) => {
                    const name = rcptTo.address.split('@')[0].replace(regex, ' ');
                    log('[' + name + '] Email received.');
                    try {
                        http_1.default.get('http://127.0.0.1:' + httpPort + '/motion?' + name);
                    }
                    catch (ex) {
                        log.error('[' + name + '] Error making HTTP call: ' + ex);
                    }
                });
            }
        });
        server.listen(smtpPort);
    }
}
module.exports = (api) => {
    api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SmtpMotionPlatform);
};
//# sourceMappingURL=index.js.map