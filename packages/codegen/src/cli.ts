#!/usr/bin/env node
import { promises as fs } from 'fs'
import { join } from 'path'
import { CodeGenerator } from './index'
import { RecordingSession } from '@web-testing-ide/common'

interface CliOptions {
  input: string
  output: string
  framework: 'playwright' | 'cypress' | 'selenium'
  lang: 'typescript' | 'javascript' | 'python'
  timeout?: number
  retries?: number
  autoWait?: boolean
}

async function main() {
  const args = process.argv.slice(2)
  const options: Partial<CliOptions> = {}

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '')
    const value = args[i + 1]

    switch (key) {
      case 'input':
        options.input = value
        break
      case 'output':
        options.output = value
        break
      case 'framework':
        options.framework = value as CliOptions['framework']
        break
      case 'lang':
        options.lang = value as CliOptions['lang']
        break
      case 'timeout':
        options.timeout = parseInt(value)
        break
      case 'retries':
        options.retries = parseInt(value)
        break
      case 'autoWait':
        options.autoWait = value === 'true'
        break
    }
  }

  if (!options.input || !options.output) {
    console.error('Usage: codegen --input <input.json> --output <output.test.ts> [options]')
    console.error('Options:')
    console.error('  --framework <playwright|cypress|selenium> (default: playwright)')
    console.error('  --lang <typescript|javascript|python> (default: typescript)')
    console.error('  --timeout <ms> (default: 30000)')
    console.error('  --retries <number> (default: 3)')
    console.error('  --autoWait <true|false> (default: true)')
    process.exit(1)
  }

  try {
    const inputPath = join(process.cwd(), options.input)
    const recordingData = await fs.readFile(inputPath, 'utf-8')
    const session: RecordingSession = JSON.parse(recordingData)

    const generator = new CodeGenerator()
    const code = generator.generateCode(session, {
      framework: options.framework || 'playwright',
      language: options.lang || 'typescript',
      defaultTimeoutMs: options.timeout || 30000,
      retryAttempts: options.retries || 3,
      autoWait: options.autoWait !== false
    })

    const outputPath = join(process.cwd(), options.output)
    await fs.mkdir(join(outputPath, '..'), { recursive: true })
    await fs.writeFile(outputPath, code, 'utf-8')

    console.log(`✅ Generated test code: ${options.output}`)
    console.log(`📊 Session: ${session.name} (${session.steps.length} steps)`)
    console.log(`🎯 Framework: ${options.framework || 'playwright'}`)
    console.log(`📝 Language: ${options.lang || 'typescript'}`)

  } catch (error) {
    console.error('❌ Error generating code:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}
