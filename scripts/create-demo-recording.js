const { RecorderEngine } = require('../packages/recorder/dist/index.js')
const { promises: fs } = require('fs')
const { join } = require('path')

async function createDemoRecording() {
  const recorder = new RecorderEngine()
  const outputDir = join(__dirname, '../examples/recordings')
  
  try {
    console.log('Starting demo recording...')
    await recorder.startRecording('https://demo.playwright.dev', {
      mode: 'playwright',
      headless: true,
      outputDir: join(outputDir, 'demo-session')
    })
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('Stopping recording...')
    const session = await recorder.stopRecording()
    
    console.log('Exporting recording...')
    const exported = await recorder.exportRecording('json')
    
    await fs.writeFile(join(outputDir, 'demo-session.json'), exported)
    
    console.log('Demo recording created successfully!')
    console.log(`Session ID: ${session.id}`)
    console.log(`Steps recorded: ${session.steps.length}`)
    
  } catch (error) {
    console.error('Failed to create demo recording:', error)
    process.exit(1)
  }
}

createDemoRecording()
