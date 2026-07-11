// src/types/types.ts
export interface MethodData {
  name: string;
  args: string[];
}

export interface ClassBlueprint {
  name: string;
  fields: string[];
  methods: MethodData[];
}

export interface SystemBlueprint {
  classes: Record<string, ClassBlueprint>;
}

export interface EntityData {
  id: string;
  className: string; // ★ Component配列から単一のクラス名に変更
  parentId: string | null;
  children: string[];
  fields: Record<string, any>;
  state?: string; // 現在のステート（例: "Movement::Idle"）
}

export interface SystemState {
  blueprint: SystemBlueprint;
  entities: Record<string, EntityData>;
  traces?: string[];
}