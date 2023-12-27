import { Db, Collection, Timestamp } from 'mongodb';
import { EventEmitter } from 'events';
import { regex } from './filter';

export interface StreamOptions {
    db: Db;
    ns?: string;
    ts?: number | Timestamp;
    collection?: string;
}

export class OplogStream extends EventEmitter{
    private collection: Collection;
    private ts?: Timestamp;
    private ns?: string;

    constructor(options: StreamOptions) {
        super();
        const { db, ns, ts, collection } = options;
        if (!db) {
            throw new Error('Mongo db is missing.');
        }

        this.collection = db.collection(collection ?? 'oplog.rs');
        this.ns = ns;
        this.ts = typeof ts !== 'number' ? ts : Timestamp.fromNumber(0);
    }

    private async time(): Promise<Timestamp> {
        if (this.ts) {
            return typeof this.ts !== 'number' ? this.ts : Timestamp.fromNumber(this.ts);
        }

        const doc = await this.collection
            .find({}, { ts: 1 } as any)
            .sort({ $natural: -1 })
            .limit(1)
            .next();
        if (doc) {
            this.ts = doc.ts;
        }

        return doc ? doc.ts : Timestamp.fromNumber(0);
    }

    private async createStream(): Promise<any> {
        const query: any = {};
        if (this.ts) {
            query.ts = { $gte: await this.time() };
        }

        if (this.ns) {
            query.ns = { $regex: regex(this.ns) };
        }
        const options = {
            tailable: true,
            awaitData: true,
            oplogReplay: true,
            noCursorTimeout: true,
            numberOfRetries: Number.MAX_VALUE
        };

        return this.collection.find(query, options).stream();
    }

    public async getStream(): Promise<any> {
        return this.createStream();
    }
}
