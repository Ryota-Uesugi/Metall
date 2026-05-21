// src/utils/projectIO.ts
import type { ProjectFile } from '../model/graphTypes';

const isArray = Array.isArray;

function isProjectFile(x: unknown): x is ProjectFile {
  const o = x as any;
  return !!o && isArray(o.nodes) && isArray(o.edges) && isArray(o.petriNodes) && isArray(o.petriEdges);
}

export function serializeProject(p: ProjectFile): string {
  return JSON.stringify(p, null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json);

  if (!isProjectFile(parsed)) {
    return {
      nodes: parsed?.nodes && isArray(parsed.nodes) ? parsed.nodes : [],
      edges: parsed?.edges && isArray(parsed.edges) ? parsed.edges : [],
      petriNodes: parsed?.petriNodes && isArray(parsed.petriNodes) ? parsed.petriNodes : [],
      petriEdges: parsed?.petriEdges && isArray(parsed.petriEdges) ? parsed.petriEdges : [],
      tagDefinitions: parsed?.tagDefinitions && isArray(parsed.tagDefinitions) ? parsed.tagDefinitions : [], // ★ 追加
    };
  }

  // 比較的新しい形式でも、tagDefinitionsがなければ空配列を補償
  if (!parsed.tagDefinitions) {
    parsed.tagDefinitions = [];
  }

  return parsed;
}

export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}