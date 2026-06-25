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

  // ★変更: エラーの理由を生データごと返すように強化
  private parseEngineOutput(data: any): any {
    console.log("[EngineService] Raw Output:", data); // 開発者コンソールにも出力

    if (data === null || data === undefined) {
      return { status: 'error', message: 'No data returned from engine', rawData: String(data) };
    }

    let rawText = data;
    if (typeof data === 'object' && typeof data._consoleOutput === 'string') {
      rawText = data._consoleOutput;
    }

    if (typeof rawText === 'string') {
      try {
        const startIndex = rawText.indexOf('{');
        const endIndex = rawText.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = rawText.substring(startIndex, endIndex + 1);
          const parsed = JSON.parse(jsonStr);
          console.log("[EngineService] Parsed JSON:", parsed);
          return parsed;
        } else {
          // JSONの波括弧が見つからない場合
          return { status: 'error', message: 'JSON object not found in string', rawData: rawText };
        }
      } catch (e: any) {
        console.error('[EngineService] JSON Parse Error:', e, rawText);
        return { status: 'error', message: `Parse error: ${e.message}`, rawData: rawText };
      }
    }
    
    // すでにオブジェクトとして正常に受け取っている場合
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
    componentName: string,
    fieldName: string,
    value: string
  ): Promise<void> {
    if (!value) return;
    await this.execute(`set ${entityName} ${componentName} ${fieldName} ${value} -json`);
  }

  async createEntity(
    name: string,
    parentName: string | null = null
  ): Promise<void> {
    if (parentName) {
      await this.execute(`create ${name} ${parentName} -json`);
    } else {
      await this.execute(`create ${name} -json`);
    }
  }

  async attachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`attach ${entityName} ${className} -json`);
  }

  async detachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`detach ${entityName} ${className} -json`);
  }

  async callMethod(
    entityName: string,
    className: string,
    methodName: string,
    args: string[]
  ): Promise<any> {
    const argsStr = args.join(' ');
    const data = await this.execute(
      `callwait ${entityName} ${className} ${methodName} ${argsStr} -json`
    );
    const parsed = this.parseEngineOutput(data);
    return parsed?.result ?? parsed?.message ?? parsed ?? 'No output from engine';
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

  async getComponentState(entityName: string, componentName: string): Promise<any> {
    try {
      const data = await this.execute(`state ${entityName} ${componentName} -json`);
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