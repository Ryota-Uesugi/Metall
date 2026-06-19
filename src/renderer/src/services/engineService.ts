import { SystemState } from '../types';

declare global {
  interface Window {
    engineAPI: {
      sendCommand: (command: string) => Promise<any>;
      onEngineStream: (callback: (data: string) => void) => void;
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

  // ★追加: ストリームをリッスンする
  onStream(callback: (log: string) => void) {
    if (window.engineAPI && window.engineAPI.onEngineStream) {
      window.engineAPI.onEngineStream(callback);
    }
  }

  // ★追加: スピード設定
  async setSpeed(ms: number): Promise<void> {
    await this.execute(`speed ${ms}`);
  }

  async createEntity(name: string, isLand: boolean): Promise<void> {
    const finalName = isLand && !name.includes("Land") ? `${name}_Land` : name;
    await this.execute(`create ${finalName}`);
  }

  async attachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`attach ${entityName} ${className}`);
  }

  async detachComponent(entityName: string, className: string): Promise<void> {
    await this.execute(`detach ${entityName} ${className}`);
  }

  async callMethod(entityName: string, className: string, methodName: string, args: string[]): Promise<any> {
    const argsStr = args.join(' ');
    const data = await this.execute(`call ${entityName} ${className} ${methodName} ${argsStr}`);
    return data?._consoleOutput || "No output from engine";
  }

  async getState(): Promise<SystemState> {
    const data = await this.execute(""); 
    if (data) {
      return {
        blueprint: data.blueprint || { classes: {} },
        entities: data.entities || {}
      };
    }
    return { blueprint: { classes: {} }, entities: {} };
  }
}

export const engineService = new EngineService();