import { EventEmitter } from 'events';
import debug from 'debug';
import { MongoClient, Db } from 'mongodb';
import { OplogFilter, events } from './filter';
import { OplogStream } from './stream';

const log = debug('cdc:mongo');

/*
* Options:
* - ns: namespace to filter on
* - since: timestamp to start streaming from
* - coll: collection to stream from
*/
interface OplogoOptions {
    ns?: string;
    since?: number;
}

class MongoCDC extends EventEmitter {

    private db: Db | undefined;
    private client: MongoClient | undefined;
    private url: string;
    private connected: boolean = false;
    private ts: number = Date.now();
    private ns: string = '*';
    private coll: string = 'oplog.rs';
    private ignore: boolean = false;
    private oplogStream: OplogStream | undefined;

    constructor(url: string, private options: OplogoOptions) {
        super();
        if (!url) {
            throw new Error('url is required');
        }
        if (options) {
            const { ns, since } = options;
            this.ts = since ?? this.ts;
            this.ns = ns ?? this.ns;
        }

        this.url = url;
    }

    private async connect() {
        if (this.connected) {
            return;
        }
        this.client = await MongoClient.connect(this.url, { monitorCommands: true });
        log('connected to mongodb');
        this.client.on('error', this.onError.bind(this));
        this.db = this.client.db();
        this.connected = true;
    }

    async disconnect() {
        if (!this.connected) {
            return;
        }
        await this.client?.close();
        this.connected = false;
    }

    public async listen() {
        log('listening to oplog');
        if (!this.connected) {
            await this.connect();
        }
        if (!this.oplogStream) {
            this.oplogStream = new OplogStream({
                db: this.db!,
                ns: this.options.ns,
                ts: this.ts,
                collection: this.coll
            });
            log('created oplog stream');
        }

        const stream = await this.oplogStream.getStream();

        log('got oplog stream');
        stream.on('data', this.onData.bind(this));

        stream.on('end', this.onEnd.bind(this));

        stream.on('error', this.onError.bind(this));
        log('streaming started');
    }

    private async stop() {
        if (this.oplogStream) {
            this.oplogStream.removeAllListeners();
        }
        log('streaming stopped');
        return this;
    }

    private async destroy() {
        await this.stop();
        if (!this.connected) return this;
        if (this.client) {
            this.client.close();
        }
        this.connected = false;
        return this;
    }

    private onData(doc: any) {
        if (this.ignore) return this;
        this.ts = doc.ts;
        this.emit('op', doc);
        if ((events as any)[doc.op]) {
            this.emit((events as any)[doc.op], doc);
        }
        return this;
    }

    private onEnd() {
        log('stream ended');
        this.emit('end');
        return this;
    }

    private onError(err: Error) {
        if (/cursor (killed or )?timed out/.test(err.message)) {
            log('cursor timeout - re-tailing %j', err);
            this.listen();
        } else if (/exceeded time limit/.test(err.message)) {
            log('cursor exceeded timeout - re-tailing %j', err);
            this.listen();
        } else {
            log('stream errored %j', err);
            this.emit('error', err);
        }
    }

    public filter(ns: string) {
        log('filtering on %s', ns);
        if (!this.oplogStream) {
            throw new Error('Cannot filter before listening');
        }
        return new OplogFilter({ ns, oplog: this });
    }
}

export default MongoCDC;