#!/usr/bin/env node
import { promises as fs } from 'fs'
import { join } from 'path'
import { TestRunner } from './index'

interface CliOptions {
  test: string
  headless?: boolean
  output?: string
  timeout?: number
  retries?: number
}

async function main() {
  const args = process.argv.slice(2)
  const options: Partial<CliOptions> = {}

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '')
    const value = args[i + 1]

    switch (key) {
      case 'test':
        options.test = value
        break
      case 'headless':
        options.headless = value !== 'false'
        break
      case 'output':
        options.output = value
        break
      case 'timeout':
        options.timeout = parseInt(value)
        break
      case 'retries':
        options.retries = parseInt(value)
        break
    }
  }

  if (!options.test) {
    console.error('Usage: runner --test <test-file> [options]')
    console.error('Options:')
    console.error('  --test <path>      Test file to run (required)')
    console.error('  --headless         Run in headless mode (default: true)')
    console.error('  --output <dir>     Output directory (default: runs/latest)')
    console.error('  --timeout <ms>     Test timeout in milliseconds')
    console.error('  --retries <num>    Number of retry attempts')
    process.exit(1)
  }

  try {
    const runner = new TestRunner()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputDir = options.output || `runs/${timestamp}`

    console.log(`🚀 Running test: ${options.test}`)
    console.log(`📁 Output directory: ${outputDir}`)

    const result = await runner.runTest(options.test, {
      headless: options.headless !== false,
      outputDir,
      timeout: options.timeout,
      retries: options.retries
    })

    console.log(`\n📊 Test Results:`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Duration: ${result.completedAt! - result.startedAt}ms`)
    console.log(`   Artifacts: ${result.artifacts.length}`)

    if (result.errors && result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`)
      result.errors.forEach((error, i) => {
        console.log(`     ${i + 1}. ${error.message}`)
      })
    }

    await generateHtmlReport(result, outputDir)
    console.log(`📄 HTML Report: ${outputDir}/report.html`)

    if (result.status === 'failed' && result.errors && result.errors.length > 0) {
      console.log(`💥 Failure details saved to: ${outputDir}/failure.json`)
    }

    process.exit(result.status === 'passed' ? 0 : 1)

  } catch (error) {
    console.error('❌ Error running test:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function generateHtmlReport(testRun: any, outputDir: string) {
  const reportPath = join(outputDir, 'report.html')
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${testRun.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .status { padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; }
        .status.passed { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .artifacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .artifact { border: 1px solid #ddd; border-radius: 4px; padding: 15px; }
        .artifact img { max-width: 100%; height: auto; border-radius: 4px; }
        .errors { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
        .error { margin-bottom: 10px; font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Report</h1>
            <p><strong>Run ID:</strong> ${testRun.id}</p>
            <p><strong>Status:</strong> <span class="status ${testRun.status}">${testRun.status.toUpperCase()}</span></p>
            <p><strong>Duration:</strong> ${testRun.completedAt! - testRun.startedAt}ms</p>
            <p><strong>Started:</strong> ${new Date(testRun.startedAt).toLocaleString()}</p>
        </div>

        ${testRun.errors && testRun.errors.length > 0 ? `
        <div class="errors">
            <h3>Errors (${testRun.errors.length})</h3>
            ${testRun.errors.map((error: any) => `
                <div class="error">
                    <strong>Step:</strong> ${error.stepId}<br>
                    <strong>Message:</strong> ${error.message}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <h3>Artifacts (${testRun.artifacts.length})</h3>
        <div class="artifacts">
            ${testRun.artifacts.map((artifact: any) => `
                <div class="artifact">
                    <h4>${artifact.type.toUpperCase()}</h4>
                    ${artifact.type === 'screenshot' ? `
                        <img src="file://${artifact.path}" alt="Screenshot" />
                    ` : `
                        <p><a href="file://${artifact.path}" target="_blank">View ${artifact.type}</a></p>
                    `}
                    <p><small>${artifact.path}</small></p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `

  await fs.writeFile(reportPath, html, 'utf-8')
}

if (require.main === module) {
  main().catch(console.error)
}
