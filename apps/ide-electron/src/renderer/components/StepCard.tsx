import React, { useState } from 'react'
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
  const [showSelectors, setShowSelectors] = useState(false)

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'navigate': return 'bg-purple-100 text-purple-800'
      case 'click': return 'bg-blue-100 text-blue-800'
      case 'doubleClick': return 'bg-blue-200 text-blue-900'
      case 'type': return 'bg-green-100 text-green-800'
      case 'checkbox': return 'bg-indigo-100 text-indigo-800'
      case 'radio': return 'bg-pink-100 text-pink-800'
      case 'select': return 'bg-teal-100 text-teal-800'
      case 'focus': return 'bg-cyan-100 text-cyan-800'
      case 'submit': return 'bg-emerald-100 text-emerald-800'
      case 'hover': return 'bg-violet-100 text-violet-800'
      case 'keypress': return 'bg-amber-100 text-amber-800'
      case 'upload': return 'bg-rose-100 text-rose-800'
      case 'download': return 'bg-lime-100 text-lime-800'
      case 'drag': return 'bg-slate-100 text-slate-800'
      case 'assertion': return 'bg-orange-100 text-orange-800'
      case 'screenshot': return 'bg-gray-100 text-gray-800'
      case 'wait': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStepDescription = () => {
    const primarySelector = step.selectors[0]?.selector || 'Unknown element'
    const selectorType = step.selectors[0]?.type || 'css'
    const selectorScore = step.selectors[0]?.score || 0
    
    switch (step.type) {
      case 'navigate':
        return step.url
      case 'click':
        return `Click → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'doubleClick':
        return `Double-click → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'type':
        return `Type "${step.value}" → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'checkbox':
        return `${step.value ? 'Check' : 'Uncheck'} → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'radio':
        return `Select radio → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'select': {
        const selectValue = typeof step.value === 'object' && step.value && 'selectedText' in step.value 
          ? step.value.selectedText : step.value
        return `Select "${selectValue}" → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      }
      case 'focus':
        return `Focus → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'submit':
        return `Submit form → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'hover':
        return `Hover → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'keypress': {
        const key = typeof step.value === 'object' && step.value && 'key' in step.value ? step.value.key : step.value
        return `Press "${key}" → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      }
      case 'upload':
        return `Upload file → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'download':
        return `Download → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'drag':
        return `Drag → ${primarySelector} (${selectorType}, score: ${selectorScore})`
      case 'screenshot':
        return 'Take screenshot'
      case 'wait':
        return `Wait ${step.value || 1000}ms`
      default:
        if (step.type === 'assertion' && (step as any).assertion) {
          const assertion = (step as any).assertion
          const desc = assertion.description || `${assertion.type}`
          return assertion.expectedValue 
            ? `${desc}: "${assertion.expectedValue}"`
            : desc
        }
        return `${step.type} → ${primarySelector} (${selectorType}, score: ${selectorScore})`
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
          {step.selectors.length > 1 && (
            <button
              onClick={() => setShowSelectors(!showSelectors)}
              className="text-xs px-1 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              title={`${step.selectors.length} selectors available`}
            >
              {step.selectors.length} selectors
            </button>
          )}
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
      
      {showSelectors && step.selectors.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <div className="font-medium text-gray-700 mb-1">Available Selectors (TestCase Studio-like):</div>
          {step.selectors.slice(0, 5).map((selector, idx) => (
            <div key={idx} className="flex justify-between items-center py-1">
              <span className="font-mono text-gray-600 truncate flex-1 mr-2">
                {selector.selector}
              </span>
              <div className="flex items-center space-x-1">
                <span className={`px-1 py-0.5 rounded text-xs ${
                  selector.type === 'id' ? 'bg-green-100 text-green-700' :
                  selector.type === 'xpath' ? 'bg-blue-100 text-blue-700' :
                  selector.type === 'data-testid' ? 'bg-purple-100 text-purple-700' :
                  selector.type === 'name' ? 'bg-orange-100 text-orange-700' :
                  selector.type === 'aria-label' ? 'bg-pink-100 text-pink-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selector.type}
                </span>
                <span className="text-gray-500">
                  {selector.score}
                </span>
                {selector.isUnique && (
                  <span className="text-green-600 text-xs">✓</span>
                )}
              </div>
            </div>
          ))}
          {step.selectors.length > 5 && (
            <div className="text-gray-500 text-center mt-1">
              ... and {step.selectors.length - 5} more
            </div>
          )}
        </div>
      )}
      
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
