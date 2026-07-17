// src/types/types.ts
export interface MethodData {
  name: string;
  args: string[];
  visibility?: 'Public' | 'Private';
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
  className: string;
  components: string[]; 
  parentId: string | null;
  children: string[];
  fields: Record<string, any>;
  state?: string;
}

export interface SystemState {
  blueprint: SystemBlueprint;
  entities: Record<string, EntityData>;
  traces?: string[];
}