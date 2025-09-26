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
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        readOnly,
        automaticLayout: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        roundedSelection: false,
        padding: { top: 10 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        parameterHints: { enabled: true },
        hover: { enabled: true },
        folding: true,
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true
      }}
      onMount={(editor, monaco) => {
        editorRef.current = editor
        
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          noEmit: true,
          esModuleInterop: true,
          jsx: monaco.languages.typescript.JsxEmit.React,
          reactNamespace: 'React',
          allowJs: true,
          typeRoots: ['node_modules/@types']
        })

        monaco.languages.typescript.typescriptDefaults.addExtraLib(`
          declare module '@playwright/test' {
            export const test: any;
            export const expect: any;
            export interface Page {
              goto(url: string): Promise<void>;
              click(selector: string): Promise<void>;
              fill(selector: string, value: string): Promise<void>;
              screenshot(options?: any): Promise<Buffer>;
              waitForSelector(selector: string): Promise<void>;
            }
            export interface BrowserContext {
              newPage(): Promise<Page>;
            }
          }
        `, 'file:///node_modules/@playwright/test/index.d.ts')

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          console.log('Save shortcut triggered')
        })

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
          console.log('Run shortcut triggered')
        })

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
          const action = editor.getAction('editor.action.formatDocument')
          if (action) action.run()
        })

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
          const action = editor.getAction('actions.find')
          if (action) action.run()
        })

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
          const action = editor.getAction('editor.action.startFindReplaceAction')
          if (action) action.run()
        })
      }}
    />
  )
}
