interface RecordingSession {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  steps: any[];
  viewport: { width: number; height: number };
  userAgent: string;
  metadata: {
    description: string;
    tags: string[];
    duration: number;
    totalSteps: number;
  };
}

export interface ElectronAPI {
  ping: () => Promise<string>
  recorder: {
    start: (url: string, options: any) => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean; session?: RecordingSession; error?: string }>
    export: (format: string) => Promise<{ success: boolean; data?: string; error?: string }>
  }
  runner: {
    runTest: (testPath: string, options: any) => Promise<{ success: boolean; result?: any; outputDir?: string; error?: string }>
    getReport: (runId: string) => Promise<{ success: boolean; reportPath?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
