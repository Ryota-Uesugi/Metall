// src/constants.ts
import type { AttributeType } from './model/graphTypes';

export const TYPE_OPTIONS = ['void', 'int', 'string', 'boolean'] as const;
export type PrimitiveType = (typeof TYPE_OPTIONS)[number];

export const CLASS_EDGE_ROLES = [
  { value: 'association', label: '関連 (Association)' },
  { value: 'aggregation', label: '集約 (Aggregation)' },
  { value: 'composition', label: 'コンポジット (Composition)' },
  { value: 'dependency', label: '依存 (Dependency)' },
  { value: 'generalization', label: '汎化 (Generalization)' },
  { value: 'realization', label: '実現 (Realization)' },
] as const;

export const BLOCK_EDGE_ROLES = [
  { value: 'call', label: '呼び出し (Call)' },
  { value: 'reference', label: '参照 (Reference)' },
  { value: 'copy', label: 'コピー / 値渡し (Copy)' },
  { value: 'read', label: '読み取り (Read)' },
  { value: 'write', label: '書き込み (Write)' },
] as const;

export type ClassEdgeRole = (typeof CLASS_EDGE_ROLES)[number]['value'];
export type BlockEdgeRole = (typeof BLOCK_EDGE_ROLES)[number]['value'];

export const ATTRIBUTE_MAP: Record<string, { value: AttributeType; label: string }[]> = {
  class: [
    { value: '@Inject', label: '@Inject' },
    { value: '@Transaction', label: '@Transaction' },
  ],
  struct: [],
  enum: [],
  method: [
    { value: '@Pure', label: '@Pure' },
    { value: '@External', label: '@External' },
    { value: '@Event', label: '@Event' },
  ],
  variable: [
    { value: '@Min', label: '@Min' },
    { value: '@Max', label: '@Max' },
    { value: '@Range', label: '@Range' },
    { value: '@InitialTag', label: '@InitialTag' },
    { value: '@GrantTag', label: '@GrantTag' },
    { value: '@RequireTag', label: '@RequireTag' },
  ],
  constant: [],
};