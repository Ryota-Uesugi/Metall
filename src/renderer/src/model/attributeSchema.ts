// src/model/attributeSchema.ts
import type { AttributeType } from './graphTypes';

export type FieldType = 'text' | 'number';

export type AttributeField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

export const ATTRIBUTE_FIELDS: Partial<Record<AttributeType, AttributeField[]>> = {
  '@Min': [
    { key: 'val', label: '基準値 (Value)', type: 'number', placeholder: '0' },
    { key: 'on_fail', label: 'エラーアクション (on_fail)', type: 'text', placeholder: 'Error' },
  ],
  '@Max': [
    { key: 'val', label: '基準値 (Value)', type: 'number', placeholder: '0' },
    { key: 'on_fail', label: 'エラーアクション (on_fail)', type: 'text', placeholder: 'Error' },
  ],
  '@Range': [
    { key: 'min', label: '最小値 (Min)', type: 'number', placeholder: '1' },
    { key: 'max', label: '最大値 (Max)', type: 'number', placeholder: '99' },
    { key: 'on_fail', label: 'エラーアクション (on_fail)', type: 'text', placeholder: 'Clamp' },
  ],
  '@External': [
    { key: 'ext_type', label: '通信タイプ (type)', type: 'text', placeholder: 'NetworkAPI' },
    { key: 'timeout_ms', label: 'タイムアウト (timeout_ms)', type: 'number', placeholder: '3000' },
    { key: 'retry', label: 'リトライ回数 (retry)', type: 'number', placeholder: '2' },
  ],
  '@Inject': [
    { key: 'init_args', label: '初期化引数 (init_args)', type: 'text', placeholder: '"endpoint: URL"' },
  ],
  '@Transaction': [
    { key: 'atomicity', label: 'Atomicity', type: 'text', placeholder: 'Required' },
    { key: 'isolation', label: 'Isolation', type: 'text', placeholder: 'Serializable' },
    { key: 'durability', label: 'Durability', type: 'text', placeholder: 'Sync' },
  ],
  '@InitialTag': [{ key: 'tagName', label: 'タグ名 (tagName)', type: 'text', placeholder: 'TagName' }],
  '@GrantTag': [{ key: 'tagName', label: 'タグ名 (tagName)', type: 'text', placeholder: 'TagName' }],
  '@RequireTag': [{ key: 'tagName', label: 'タグ名 (tagName)', type: 'text', placeholder: 'TagName' }],
  '@Event': [{ key: 'eventName', label: 'イベント名 (eventName)', type: 'text', placeholder: 'EventName' }],
};