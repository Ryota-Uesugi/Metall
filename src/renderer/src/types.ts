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
  isLandManager: boolean;
  components: ComponentData[];
  subBuildings: string[];
}

export interface SystemState {
  blueprint: SystemBlueprint; // ★追加: IDEで選択肢を出すための設計図
  entities: Record<string, EntityData>;
}