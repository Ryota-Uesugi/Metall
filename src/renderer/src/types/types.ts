// Boxyのメソッド定義
export interface MethodData {
  name: string;
  args: string[];
}

// Boxyのクラス（コンポーネント）定義
export interface ClassBlueprint {
  name: string;
  fields: string[];
  methods: MethodData[];
}

// 読み込まれたすべてのクラス設計図
export interface SystemBlueprint {
  classes: Record<string, ClassBlueprint>;
}

export interface ComponentData {
  className: string;
  fields: Record<string, any>;
}

export interface EntityData {
  id: string;
  parentId: string | null; // ★追加
  children: string[];      // ★追加
  
  components: any[]; 
  isLandManager?: boolean;
  subBuildings?: string[];
}

export interface SystemState {
  blueprint: SystemBlueprint;
  entities: Record<string, EntityData>;
  traces?: string[]; // ★追加: Rustからエクスポートされる実行トレースの配列
}