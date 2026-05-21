// src/utils/codeGenerator.ts
import type { Node, Edge, Attribute, MethodArg, TagDefinition } from '../model/graphTypes';
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

export function generateBoxyhCode(
  nodes: Node[], 
  edges: Edge[],
  petriNodes: Node[] = [],
  petriEdges: Edge[] = [],
  tagDefinitions: TagDefinition[] = []
): string {
  const w = new StringWriter();
  w.line('// @Module: MetallForge Generated Code');
  w.line();

  // ==========================================
  // 1. 静的構造 (Classes, Structs, Enums)
  // ==========================================
  w.line('// --- 1. Static Structures ---');
  const groups = nodes.filter(n => n.type === 'groupNode');
  
  for (const g of groups) {
    emitAttributes(w, g.data.attributes, 0);
    const kind = g.data.kind;
    const name = g.data.label;
    w.line(`${kind} ${name} {`);
    
    const children = nodes.filter(n => n.parentId === g.id);
    const vars = children.filter(n => n.data.kind === 'variable' || n.data.kind === 'constant');
    const methods = children.filter(n => n.data.kind === 'method');
    
    for (const v of vars) {
      emitAttributes(w, v.data.attributes, 1);
      const prefix = v.data.isPrivate ? 'private ' : '';
      const vKind = v.data.kind === 'constant' ? 'const' : 'let';
      const vType = v.data.typeDetail ? `: ${v.data.typeDetail}` : '';
      w.line(`    ${prefix}${vKind} ${v.data.label}${vType};`);
    }

    if (vars.length > 0 && methods.length > 0) w.line();

    for (const m of methods) {
      emitAttributes(w, m.data.attributes, 1);
      const prefix = m.data.isPrivate ? 'private ' : '';
      const mArgs = formatArgs(m.data.args);
      const mType = m.data.typeDetail && m.data.typeDetail !== 'void' ? `: ${m.data.typeDetail}` : '';
      w.line(`    ${prefix}func ${m.data.label}(${mArgs})${mType};`);
    }

    w.line(`}`);
    w.line();
  }

  // ==========================================
  // 2. タグ定義 (Tag Definitions)
  // ==========================================
  if (tagDefinitions.length > 0) {
    w.line('// --- 2. Tag Definitions (Petri Net) ---');
    
    const groupedTags = new Map<string, TagDefinition[]>();
    for (const t of tagDefinitions) {
      if (!groupedTags.has(t.groupName)) groupedTags.set(t.groupName, []);
      if (t.tagName) groupedTags.get(t.groupName)!.push(t);
    }
    
    for (const [group, tags] of groupedTags.entries()) {
      w.line(`tagGroup ${group} {`);
      for (const t of tags) {
        if (t.description) w.line(`    // ${t.description.replace(/\n/g, ' ')}`);
        w.line(`    tag ${t.tagName};`);
      }
      w.line(`}`);
      w.line();
    }
  }

  // ==========================================
  // 3. 状態遷移 (Petri Net Transitions)
  // ==========================================
  const transitions = petriNodes.filter(n => n.type === 'transitionNode');
  if (transitions.length > 0) {
    w.line('// --- 3. State Transitions (Petri Net) ---');

    for (const trans of transitions) {
      const boundFunc = trans.data.boundFunctionId ? nodes.find(n => n.id === trans.data.boundFunctionId) : null;
      const parentClass = boundFunc?.parentId ? nodes.find(n => n.id === boundFunc.parentId) : null;
      
      const funcName = boundFunc 
        ? `${parentClass ? parentClass.data.label + '.' : ''}${boundFunc.data.label}`
        : 'none';

      const inEdges = petriEdges.filter(e => e.target === trans.id);
      const outEdges = petriEdges.filter(e => e.source === trans.id);
      
      const inPlaces = inEdges.map(e => petriNodes.find(n => n.id === e.source)).filter(Boolean) as Node[];
      const outPlaces = outEdges.map(e => petriNodes.find(n => n.id === e.target)).filter(Boolean) as Node[];

      const formatPlace = (p: Node) => {
        if (p.data.assignedTagType && p.data.assignedTargetName) {
           return p.data.assignedTargetName; // 例: "Active" や "UserState" などを出力
        }
        return `[Unassigned:${p.data.label}]`;
      };

      const inStr = inPlaces.map(formatPlace).join(', ');
      const outStr = outPlaces.map(formatPlace).join(', ');

      w.line(`transition ${trans.data.label} {`);
      if (inStr) w.line(`    require: [${inStr}]`);
      w.line(`    call:    ${funcName}`);
      if (outStr) w.line(`    grant:   [${outStr}]`);
      w.line(`}`);
      w.line();
    }
  }

  // ==========================================
  // 4. 実行フロー (Execution Flows)
  // ==========================================
  const methods = nodes.filter(n => n.type === 'blockNode' && n.data.kind === 'method');
  const depEdges = edges.filter(e => e.data?.role === 'dependency' || e.data?.role === 'call');
  
  if (methods.length > 0 && depEdges.length > 0) {
    w.line('// --- 4. Execution Flows ---');

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
        }

        const nexts = nextMap.get(curr.id) ?? [];
        for (const nId of nexts) {
          const nNode = nodes.find(n => n.id === nId);
          if (nNode) queue.push(nNode);
        }
      }
      w.line(`}`);
      w.line();
    }
  }

  return w.toString();
}