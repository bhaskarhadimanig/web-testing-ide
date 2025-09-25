import React, { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  framework: 'playwright' | 'cypress' | 'selenium'
  language: 'typescript' | 'javascript' | 'python' | 'java'
  readOnly?: boolean
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  framework,
  language,
  readOnly = false
}) => {
  const editorRef = useRef<any>()

  useEffect(() => {
    configureLanguageFeatures(framework, language)
  }, [framework, language])

  const configureLanguageFeatures = (fw: string, lang: string) => {
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(val) => onChange(val || '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        readOnly,
        automaticLayout: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        roundedSelection: false,
        padding: { top: 10 }
      }}
      onMount={(editor) => {
        editorRef.current = editor
      }}
    />
  )
}
