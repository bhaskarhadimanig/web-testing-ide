const { RecorderEngine } = require('./packages/recorder/dist/index.js');

async function testHeadlessRecording() {
  console.log('Testing headless recorder functionality...');
  
  const recorder = new RecorderEngine();
  
  try {
    console.log('Starting headless recording...');
    await recorder.startRecording('https://demo.playwright.dev', { 
      mode: 'playwright', 
      headless: true 
    });
    
    console.log('Recording started successfully in headless mode');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Stopping recording...');
    const session = await recorder.stopRecording();
    
    console.log('Recording completed successfully!');
    console.log('Session ID:', session.id);
    console.log('Steps recorded:', session.steps.length);
    console.log('URL:', session.url);
    
    return true;
  } catch (error) {
    console.error('Recording failed:', error.message);
    return false;
  }
}

testHeadlessRecording().then(success => {
  console.log('Test result:', success ? 'PASSED' : 'FAILED');
  process.exit(success ? 0 : 1);
});
