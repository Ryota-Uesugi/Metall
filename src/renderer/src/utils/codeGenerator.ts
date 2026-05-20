// src/utils/codeGenerator.ts
import type { Node, Edge, Attribute, MethodArg } from '../model/graphTypes';
import { formatAttribute } from '../model/attributeFormat';

class StringWriter {
  private buf: string[] = [];
  line(s = '') { this.buf.push(s + '\n'); }
  toString() { return this.buf.join(''); }
}

const indentOf = (n: number) => '    '.repeat(n);
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

function emitAttributes(w: StringWriter, attrs: Attribute[] | undefined, level: number) {
  for (const a of attrs ?? []) {
    const s = formatAttribute(a.type, a.params as any);
    if (s) w.line(`${indentOf(level)}${s}`);
  }
}

function formatArgs(args: MethodArg[] | undefined) {
  const list = Array.isArray(args) ? args : [];
  return list.map(a => `${a.type} ${a.name}`).join(', ');
}

function isGroup(n: Node) { return n.type === 'groupNode'; }
function isBlock(n: Node) { return n.type === 'blockNode'; }

export function generateBoxyhCode(nodes: Node[], edges: Edge[]): string {
  const w = new StringWriter();
  w.line('// @Module: MetallForgeGenerated');
  w.line('// @Generated: from visual editor');
  w.line('// ---------------------------');
  w.line();

  const byParent = new Map<string | undefined, Node[]>();
  for (const n of nodes) {
    const key = n.parentId;
    const arr = byParent.get(key) ?? [];
    arr.push(n);
    byParent.set(key, arr);
  }
  const childrenOf = (pid?: string) => byParent.get(pid) ?? [];

  function emitScope(scopeNodes: Node[], level: number) {
    for (const gn of scopeNodes.filter(isGroup)) {
      const d = gn.data as any;
      emitAttributes(w, d.attributes, level);
      w.line(`${indentOf(level)}${d.kind} ${d.label} {`);
      emitScope(childrenOf(gn.id), level + 1);
      w.line(`${indentOf(level)}}`);
      w.line();
    }

    const blocks = scopeNodes.filter(isBlock);
    if (!blocks.length) return;

    const priv = blocks.filter(b => !!b.data.isPrivate);
    const pub = blocks.filter(b => !b.data.isPrivate);

    const emitBlocks = (title: 'private' | 'public', list: Node[]) => {
      if (!list.length) return;
      w.line(`${indentOf(level)}${title}:`);
      for (const b of list) {
        const d = b.data as any;
        emitAttributes(w, d.attributes, level + 1);

        if (d.kind === 'constant') {
          w.line(`${indentOf(level + 1)}${d.label},`);
          continue;
        }

        const type = String(d.typeDetail ?? 'void');
        const name = String(d.label ?? '');

        if (d.kind === 'method') {
          const argsStr = formatArgs(d.args);
          w.line(`${indentOf(level + 1)}${type} ${name}(${argsStr});`);
        } else {
          w.line(`${indentOf(level + 1)}${type} ${name};`);
        }
      }
    };

    emitBlocks('private', priv);
    if (priv.length && pub.length) w.line();
    emitBlocks('public', pub);
  }

  emitScope(childrenOf(undefined), 0);

  const methods = nodes.filter(n => n.type === 'blockNode' && n.data.kind === 'method');
  const methodIds = new Set(methods.map(m => m.id));
  const depEdges = edges.filter(
    e => methodIds.has(e.source) && methodIds.has(e.target) && (e.data?.role ?? 'dependency') === 'dependency'
  );

  if (depEdges.length) {
    w.line('// ---------------------------');
    w.line('// Transaction Flow (Dependencies)');
    w.line('// ---------------------------');

    const nextMap = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    for (const m of methods) indeg.set(m.id, 0);

    for (const e of depEdges) {
      nextMap.set(e.source, (nextMap.get(e.source) ?? []).concat(e.target));
      indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    }

    const roots = methods.filter(m => (indeg.get(m.id) ?? 0) === 0);
    const starts = roots.length ? roots : methods;

    for (const start of starts) {
      const flowName = String(start.data.label ?? 'flow');
      const flowArgs = formatArgs((start.data as any).args);
      w.line(`flow ${flowName}(${flowArgs}) {`);

      const visited = new Set<string>();
      const queue: Node[] = [start];

      while (queue.length) {
        const curr = queue.shift()!;
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);

        const parent = curr.parentId ? nodes.find(n => n.id === curr.parentId) : undefined;
        if (parent) {
          const className = lowerFirst(String(parent.data.label ?? 'class'));
          const label = String(curr.data.label ?? '');
          const type = String(curr.data.typeDetail ?? 'void');
          w.line(`    -> ${className}.${label}(${type})`);
        } else {
          w.line(`    -> ${String(curr.data.label ?? '')}(${String(curr.data.typeDetail ?? 'void')})`);
        }

        for (const nxt of nextMap.get(curr.id) ?? []) {
          const n = nodes.find(x => x.id === nxt);
          if (n) queue.push(n);
        }
      }

      w.line('}');
      w.line();
    }
  }

  return w.toString();
}