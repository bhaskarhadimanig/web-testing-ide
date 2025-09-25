import React from 'react'
import { RecorderStep } from '@web-testing-ide/common'

interface StepCardProps {
  step: RecorderStep
  index: number
  onEdit?: (step: RecorderStep) => void
  onDelete?: (stepId: string) => void
  onRunSingle?: (step: RecorderStep) => void
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  onEdit,
  onDelete,
  onRunSingle
}) => {
  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'navigate': return 'bg-purple-100 text-purple-800'
      case 'click': return 'bg-blue-100 text-blue-800'
      case 'type': return 'bg-green-100 text-green-800'
      case 'assertion': return 'bg-orange-100 text-orange-800'
      case 'screenshot': return 'bg-gray-100 text-gray-800'
      case 'wait': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStepDescription = () => {
    switch (step.type) {
      case 'navigate':
        return step.url
      case 'click':
        return step.selectors[0]?.selector || 'Unknown element'
      case 'type':
        return `"${step.value}" → ${step.selectors[0]?.selector || 'Unknown element'}`
      default:
        if (step.type === 'assertion' && (step as any).assertion) {
          const assertion = (step as any).assertion
          const desc = assertion.description || `${assertion.type}`
          return assertion.expectedValue 
            ? `${desc}: "${assertion.expectedValue}"`
            : desc
        }
        return step.type
      case 'screenshot':
        return 'Take screenshot'
      case 'wait':
        return `Wait ${step.value || 1000}ms`
    }
  }

  return (
    <div className="border border-gray-200 rounded p-3 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded ${getStepTypeColor(step.type)}`}>
            {step.type}
          </span>
          <span className="text-sm font-medium">Step {index + 1}</span>
        </div>
        <div className="flex items-center space-x-1">
          {onRunSingle && (
            <button
              onClick={() => onRunSingle(step)}
              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              title="Run this step only"
            >
              Run
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(step)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              title="Edit step"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(step.id)}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              title="Delete step"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-2">
        {getStepDescription()}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
        {step.screenshot && (
          <div className="w-12 h-8 bg-gray-200 rounded border flex items-center justify-center text-xs">
            📷
          </div>
        )}
      </div>
    </div>
  )
}
