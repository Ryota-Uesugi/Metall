// src/services/engineService.ts
import { SystemState } from '../types/types';

declare global {
  interface Window {
    engineAPI: {
      sendCommand: (command: string) => Promise<any>;
      onEngineStream: (callback: (data: string) => void) => void;

      // ★追加: OS標準ダイアログで scripts フォルダを選択
      selectScriptsFolder: () => Promise<string | null>;

      // ★追加: 選択したフォルダを Rust engine に反映
      setScriptsFolder: (
        folderPath: string
      ) => Promise<{
        ok: boolean;
        folderPath?: string;
        error?: string;
      }>;

      // ★追加: 現在の scripts フォルダを取得
      getScriptsFolder: () => Promise<string>;

      // 任意: live trace を renderer 側で使う場合
      onLiveTrace?: (callback: (data: string) => void) => void;
    };
  }
}

class EngineService {
  private async execute(cmd: string): Promise<any> {
    if (window.engineAPI) {
      return await window.engineAPI.sendCommand(cmd);
    }
    return null;
  }

  onStream(callback: (log: string) => void) {
    if (window.engineAPI && window.engineAPI.onEngineStream) {
      window.engineAPI.onEngineStream(callback);
    }
  }

  onLiveTrace(callback: (log: string) => void) {
    if (window.engineAPI && window.engineAPI.onLiveTrace) {
      window.engineAPI.onLiveTrace(callback);
    }
  }

  async setSpeed(ms: number): Promise<void> {
    await this.execute(`speed ${ms}`);
  }

  async setTraceMode(mode: 'off' | 'basic' | 'verbose'): Promise<void> {
    await this.execute(`trace ${mode}`);
  }

  async reload(keepEntities: boolean = false): Promise<void> {
    await this.execute(keepEntities ? `reload --keep-entities` : `reload`);
  }

  async clearEntities(): Promise<void> {
    await this.execute(`clear`);
  }

  async destroyEntity(entityName: string): Promise<void> {
    await this.execute(`destroy ${entityName}`);
  }

  async setFieldValue(
    entityName: string,
    componentName: string,
    fieldName: string,
    value: string
  ): Promise<void> {
    if (!value) return;
    await this.execute(`set ${entityName} ${componentName} ${fieldName} ${value}`);
  }

  async createEntity(
    name: string,
    parentName: string | null = null
  ): Promise<void> {
    if (parentName) {
      await this.execute(`create ${name} ${parentName}`);
    } else {
      await this.execute(`create ${name}`);
    }
  }

  async attachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`attach ${entityName} ${className}`);
  }

  async detachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`detach ${entityName} ${className}`);
  }

  async callMethod(
    entityName: string,
    className: string,
    methodName: string,
    args: string[]
  ): Promise<any> {
    const argsStr = args.join(' ');
    const data = await this.execute(
      `call ${entityName} ${className} ${methodName} ${argsStr}`
    );
    return data?._consoleOutput || 'No output from engine';
  }

  async getState(): Promise<SystemState> {
    const data = await this.execute('');

    if (data) {
      return {
        blueprint: data.blueprint || { classes: {} },
        entities: data.entities || {},
        traces: data.traces || []
      };
    }

    return {
      blueprint: { classes: {} },
      entities: {},
      traces: []
    };
  }

  // =========================================================
  // ★追加: フォルダ選択関連
  // =========================================================

  async selectScriptsFolder(): Promise<string | null> {
    if (!window.engineAPI?.selectScriptsFolder) {
      return null;
    }

    return await window.engineAPI.selectScriptsFolder();
  }

  async setScriptsFolder(
    folderPath: string
  ): Promise<{
    ok: boolean;
    folderPath?: string;
    error?: string;
  }> {
    if (!window.engineAPI?.setScriptsFolder) {
      return {
        ok: false,
        error: 'setScriptsFolder API is not available.'
      };
    }

    return await window.engineAPI.setScriptsFolder(folderPath);
  }

  async getScriptsFolder(): Promise<string> {
    if (!window.engineAPI?.getScriptsFolder) {
      return '';
    }

    return await window.engineAPI.getScriptsFolder();
  }
}

export const engineService = new EngineService();