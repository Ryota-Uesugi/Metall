// src/utils/fileManager.ts
import type { Node, Edge, ProjectFile, PetriNetData } from '../model/graphTypes';
import { downloadText, deserializeProject, serializeProject } from './projectIO';

export const saveProjectFile = (
  nodes: Node[], 
  edges: Edge[], 
  petriDataMap: Record<string, PetriNetData>
) => {
  const data: ProjectFile = { nodes, edges, petriDataMap };
  downloadText('boxyh_project.json', serializeProject(data), 'application/json');
};

export const loadProjectFile = (
  file: File,
  onSuccess: (data: ProjectFile) => void,
  onError: (err: unknown) => void
) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const json = String(ev.target?.result ?? '');
      onSuccess(deserializeProject(json));
    } catch (err) {
      onError(err);
    }
  };
  reader.readAsText(file);
};