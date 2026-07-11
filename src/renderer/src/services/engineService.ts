// src/services/engineService.ts
import { SystemState } from '../types/types';

declare global {
  interface Window {
    engineAPI: {
      sendCommand: (command: string) => Promise<any>;
      onEngineStream: (callback: (data: string) => void) => void;
      selectScriptsFolder: () => Promise<string | null>;
      setScriptsFolder: (folderPath: string) => Promise<{ ok: boolean; folderPath?: string; error?: string; }>;
      getScriptsFolder: () => Promise<string>;
      onLiveTrace?: (callback: (data: string) => void) => void;
      onCmdOutput?: (callback: (data: string) => void) => void; // ★追加
      sendCmdInput?: (text: string) => Promise<void>; // ★追加
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

  private parseEngineOutput(data: any): any {
    if (data && typeof data.raw === 'string') {
      const raw = data.raw;
      
      if (raw.includes('===JSON_EXPORT_START===')) {
        const s = raw.indexOf('===JSON_EXPORT_START===') + '===JSON_EXPORT_START==='.length;
        const e = raw.indexOf('===JSON_EXPORT_END===');
        if (s !== -1 && e !== -1) {
          try { return JSON.parse(raw.substring(s, e)); } catch (err) {}
        }
      }
      
      const s = raw.indexOf('{');
      const e = raw.lastIndexOf('}');
      if (s !== -1 && e !== -1) {
        try { return JSON.parse(raw.substring(s, e + 1)); } catch (err) {}
      }
      
      return raw;
    }
    return data;
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

  // ★ CMD出力受信用のリスナー
  onCmdOutput(callback: (log: string) => void) {
    if (window.engineAPI && window.engineAPI.onCmdOutput) {
      window.engineAPI.onCmdOutput(callback);
    }
  }

  // ★ CMD入力送信用のメソッド
  async sendCmdInput(text: string): Promise<void> {
    if (window.engineAPI && window.engineAPI.sendCmdInput) {
      await window.engineAPI.sendCmdInput(text);
    }
  }

  async setSpeed(ms: number): Promise<void> {
    await this.execute(`speed ${ms} -json`);
  }

  async setTraceMode(mode: 'off' | 'basic' | 'verbose'): Promise<void> {
    await this.execute(`trace ${mode} -json`);
  }

  async reload(keepEntities: boolean = false): Promise<void> {
    await this.execute(keepEntities ? `reload --keep-entities -json` : `reload -json`);
  }

  async clearEntities(): Promise<void> {
    await this.execute(`clear -json`);
  }

  async destroyEntity(entityName: string): Promise<void> {
    await this.execute(`destroy ${entityName} -json`);
  }

  async setFieldValue(
    entityName: string,
    fieldName: string,
    value: string
  ): Promise<void> {
    if (!value) return;
    await this.execute(`set ${entityName} ${fieldName} ${value} -json`);
  }

  async createEntity(
    name: string,
    className: string,
    parentName: string | null = null
  ): Promise<void> {
    if (parentName) {
      await this.execute(`create ${name} ${className} ${parentName} -json`);
    } else {
      await this.execute(`create ${name} ${className} -json`);
    }
  }

  async callMethod(
    entityName: string,
    methodName: string,
    args: string[]
  ): Promise<any> {
    const argsStr = args.join(' ');
    const data = await this.execute(
      `run ${entityName} ${methodName} ${argsStr} -json`
    );
    const parsed = this.parseEngineOutput(data);
    return parsed?.result ?? parsed?.message ?? parsed ?? 'No output from engine';
  }

  async getTasks(): Promise<any[]> {
    const data = await this.execute(`tasks -json`);
    const parsed = this.parseEngineOutput(data);
    return parsed?.tasks || [];
  }

  async cancelTask(taskId: number | 'all'): Promise<void> {
    await this.execute(`cancel ${taskId} -json`);
  }

  async getState(): Promise<SystemState> {
    const data = await this.execute('export -json');
    const parsed = this.parseEngineOutput(data);

    if (parsed && parsed.blueprint) {
      return {
        blueprint: parsed.blueprint || { classes: {} },
        entities: parsed.entities || {},
        traces: parsed.traces || []
      };
    }

    return {
      blueprint: { classes: {} },
      entities: {},
      traces: []
    };
  }

  async getEntityState(entityName: string): Promise<any> {
    try {
      const data = await this.execute(`state ${entityName} -json`);
      return this.parseEngineOutput(data);
    } catch (e: any) {
      return { status: 'error', message: `API Request Failed: ${e.message}`, rawData: null };
    }
  }

  async selectScriptsFolder(): Promise<string | null> {
    if (!window.engineAPI?.selectScriptsFolder) return null;
    return await window.engineAPI.selectScriptsFolder();
  }

  async setScriptsFolder(folderPath: string): Promise<{ ok: boolean; folderPath?: string; error?: string; }> {
    if (!window.engineAPI?.setScriptsFolder) {
      return { ok: false, error: 'setScriptsFolder API is not available.' };
    }
    return await window.engineAPI.setScriptsFolder(folderPath);
  }

  async getScriptsFolder(): Promise<string> {
    if (!window.engineAPI?.getScriptsFolder) return '';
    return await window.engineAPI.getScriptsFolder();
  }
}

export const engineService = new EngineService();