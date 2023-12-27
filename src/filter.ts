import createDebug from 'debug';
import { EventEmitter } from 'events';

export const events = {
    i: 'insert',
    u: 'update',
    d: 'delete',
};

export const regex = (pattern: string | undefined): RegExp => {
    pattern = pattern ?? '*';
    pattern = pattern.replace(/[*]/g, '(.*?)');
    return new RegExp(`^${pattern}$`, 'i');
}

export interface FilterOptions {
    ns: string;
    oplog: EventEmitter;
}

export class OplogFilter extends EventEmitter {
    private log: ReturnType<typeof createDebug>;
    private regExp: RegExp;
    private ignore: boolean = false;

    constructor(options: FilterOptions) {
        super();
        const { ns, oplog } = options;
        this.log = createDebug('cdc:mongo:filter');
        this.regExp = regex(ns);

        this.log(`initializing filter with re %s`, ns);

        const onOp = this.onOp.bind(this);
        oplog.on('op', onOp);

        this.on('destroy', () => {
            this.log('removing filter bindings');
            oplog.removeListener('op', onOp);
        });
    }

    private onOp(doc: any) {
        this.log('doc.ns %s: ', doc.ns);
        this.log(this.regExp.test(doc.ns));
        if (!this.regExp.test(doc.ns) || this.ignore) return;
        this.log('incoming data %j', doc);
        this.emit('op', doc);
        if ((events as any)[doc.op]) {
            this.emit((events as any)[doc.op], doc);
        }
    }

    public destroy() {
        this.emit('destroy');
        this.removeAllListeners();
    }
}