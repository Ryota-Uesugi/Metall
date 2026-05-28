// src/utils/projectIO.ts
import type { ProjectFile } from '../model/graphTypes';

const isArray = Array.isArray;

export function serializeProject(p: ProjectFile): string {
  return JSON.stringify(p, null, 2);
}

export function deserializeProject(json: string): ProjectFile {
  const parsed = JSON.parse(json);
  const safeData: ProjectFile = {
    nodes: isArray(parsed?.nodes) ? parsed.nodes : [],
    edges: isArray(parsed?.edges) ? parsed.edges : [],
    petriDataMap: parsed?.petriDataMap || {},
  };

  // 古いバージョンで保存されたファイルのマイグレーション
  if (parsed.petriNodes || parsed.tagDefinitions) {
    if (Object.keys(safeData.petriDataMap).length === 0) {
      safeData.petriDataMap['legacy_migrated'] = {
        nodes: isArray(parsed.petriNodes) ? parsed.petriNodes : [],
        edges: isArray(parsed.petriEdges) ? parsed.petriEdges : [],
        tagDefinitions: isArray(parsed.tagDefinitions) ? parsed.tagDefinitions : []
      };
    }
  }
  
  return safeData;
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