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
    if (typeof window !== 'undefined' && (window as any).monaco) {
      const monaco = (window as any).monaco
      
      if (fw === 'playwright' && lang === 'typescript') {
        monaco.languages.registerCompletionItemProvider('typescript', {
          provideCompletionItems: () => ({
            suggestions: [
              {
                label: 'page.goto',
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: 'page.goto(\'${1:url}\')',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Navigate to a URL'
              },
              {
                label: 'page.click',
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: 'page.click(\'${1:selector}\')',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Click an element'
              },
              {
                label: 'page.fill',
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: 'page.fill(\'${1:selector}\', \'${2:value}\')',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Fill an input field'
              },
              {
                label: 'expect.toBeVisible',
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: 'expect(page.locator(\'${1:selector}\')).toBeVisible()',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Assert element is visible'
              }
            ]
          })
        })
      }
    }
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
