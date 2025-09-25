import React from 'react'

interface TestProgressProps {
  isRunning: boolean
  currentStep?: string
  progress?: number
  error?: string
  onClose?: () => void
}

export const TestProgress: React.FC<TestProgressProps> = ({
  isRunning,
  currentStep,
  progress = 0,
  error,
  onClose
}) => {
  if (!isRunning && !error) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 min-w-80 max-w-96 z-50">
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm font-medium">Running test...</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {currentStep && (
            <div className="text-xs text-gray-600 truncate">{currentStep}</div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(progress, 100)}%` }} 
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-600">Test Failed</span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-sm text-red-600 break-words">{error}</div>
        </div>
      )}
    </div>
  )
}
