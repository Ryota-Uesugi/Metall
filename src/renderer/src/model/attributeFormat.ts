// src/model/attributeFormat.ts
import type { AttributeType } from './graphTypes';

type ParamSpec = {
    key: string;
    outKey?: string;
    kind: 'number' | 'string' | 'boolean' | 'raw';
    quote?: boolean;
    default?: unknown;
};

type AttrSpec = {
    params?: ParamSpec[];
};

const SPECS: Record<string, AttrSpec> = {
    '@Min': {
        params: [
            { key: 'val', outKey: 'value', kind: 'number', default: 0 },
            { key: 'on_fail', kind: 'string', quote: true },
        ],
    },
    '@Max': {
        params: [
            { key: 'val', outKey: 'value', kind: 'number', default: 0 },
            { key: 'on_fail', kind: 'string', quote: true },
        ],
    },
    '@Range': {
        params: [
            { key: 'min', kind: 'number', default: 0 },
            { key: 'max', kind: 'number', default: 0 },
            { key: 'on_fail', kind: 'string', quote: true },
        ],
    },
    '@External': {
        params: [
            { key: 'ext_type', outKey: 'type', kind: 'string', quote: true },
            { key: 'timeout_ms', kind: 'number' },
            { key: 'retry', kind: 'number' },
        ],
    },
    '@Inject': {
        params: [{ key: 'init_args', kind: 'raw' }],
    },
    '@Transaction': {
        params: [
            { key: 'atomicity', kind: 'string', quote: true },
            { key: 'isolation', kind: 'string', quote: true },
            { key: 'durability', kind: 'string', quote: true },
        ],
    },
    '@InitialTag': {
        params: [{ key: 'tagName', kind: 'string', quote: true }],
    },
    '@GrantTag': {
        params: [{ key: 'tagName', kind: 'string', quote: true }],
    },
    '@RequireTag': {
        params: [{ key: 'tagName', kind: 'string', quote: true }],
    },
    '@Event': {
        params: [{ key: 'eventName', kind: 'string', quote: true }],
    },
};

const asNumber = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

export function formatAttribute(type: AttributeType, params: Record<string, unknown> | undefined): string {
    if (!type) return '';
    const spec = SPECS[type];
    if (!spec?.params?.length) return type;

    const p = params ?? {};
    const parts: string[] = [];

    for (const s of spec.params) {
        const raw = p[s.key] ?? s.default;
        if (raw === undefined || raw === null || raw === '') continue;

        const outKey = s.outKey ?? s.key;

        if (s.kind === 'number') {
            parts.push(`${outKey}=${asNumber(raw, Number(s.default ?? 0))}`);
        } else if (s.kind === 'boolean') {
            parts.push(`${outKey}=${Boolean(raw)}`);
        } else if (s.kind === 'string') {
            const str = String(raw);
            parts.push(`${outKey}=${s.quote ? `"${str}"` : str}`);
        } else {
            parts.push(`${outKey}=${String(raw)}`);
        }
    }

    return parts.length ? `${type}(${parts.join(', ')})` : type;
}