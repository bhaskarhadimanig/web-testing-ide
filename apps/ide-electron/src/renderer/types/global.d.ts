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
    runTest: (testPathOrCode: string, options: any) => Promise<{ success: boolean; result?: any; outputDir?: string; error?: string }>
    runSingleStep: (step: any, options: any) => Promise<{ success: boolean; result?: any; outputDir?: string; error?: string }>
    getReport: (runId: string) => Promise<{ success: boolean; reportPath?: string; error?: string }>
  }
  file: {
    saveCode: (code: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    openReport: (reportPath: string) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
