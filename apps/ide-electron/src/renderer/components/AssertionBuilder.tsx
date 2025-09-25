import React, { useState } from 'react'
import { AssertionData } from '@web-testing-ide/common'

interface AssertionBuilderProps {
  onSave: (assertion: AssertionData) => void
  onCancel: () => void
  initialAssertion?: AssertionData
}

export const AssertionBuilder: React.FC<AssertionBuilderProps> = ({
  onSave,
  onCancel,
  initialAssertion
}) => {
  const [assertionType, setAssertionType] = useState<AssertionData['type']>(
    initialAssertion?.type || 'exists'
  )
  const [expectedValue, setExpectedValue] = useState(
    initialAssertion?.expectedValue || ''
  )
  const [description, setDescription] = useState(
    initialAssertion?.description || ''
  )

  const handleSave = () => {
    const assertion: AssertionData = {
      type: assertionType,
      expectedValue: expectedValue || undefined,
      description: description || undefined
    }
    onSave(assertion)
  }

  const needsExpectedValue = assertionType === 'containsText' || assertionType === 'urlContains'

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium text-gray-900 mb-3">Add Assertion</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assertion Type
          </label>
          <select
            value={assertionType}
            onChange={(e) => setAssertionType(e.target.value as AssertionData['type'])}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="exists">Element Exists</option>
            <option value="visible">Element Visible</option>
            <option value="containsText">Contains Text</option>
            <option value="urlContains">URL Contains</option>
          </select>
        </div>

        {needsExpectedValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Value
            </label>
            <input
              type="text"
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
              placeholder={
                assertionType === 'containsText' 
                  ? 'Text to check for...' 
                  : 'URL pattern to match...'
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this assertion..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Save Assertion
        </button>
      </div>
    </div>
  )
}
