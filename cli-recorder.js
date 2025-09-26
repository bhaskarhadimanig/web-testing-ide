#!/usr/bin/env node

const { RecorderEngine } = require('./packages/recorder/dist/index.js');
const { CodeGenerator } = require('./packages/codegen/dist/index.js');
const { TestRunner } = require('./packages/runner/dist/index.js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class CLIRecorder {
  constructor() {
    this.recorder = new RecorderEngine();
    this.codegen = new CodeGenerator();
    this.runner = new TestRunner();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async startRecording() {
    console.log('🎬 Web Testing IDE - CLI Mode');
    console.log('===============================');
    
    const url = await this.prompt('Enter URL to record (default: https://demo.playwright.dev): ');
    const targetUrl = url.trim() || 'https://demo.playwright.dev';
    
    const modeInput = await this.prompt('Recording mode (playwright/extension, default: playwright): ');
    const mode = modeInput.trim() || 'playwright';
    
    console.log(`\n🚀 Starting recording on ${targetUrl} in ${mode} mode (headless)...`);
    
    try {
      await this.recorder.startRecording(targetUrl, { 
        mode, 
        headless: true 
      });
      
      console.log('✅ Recording started successfully!');
      console.log('📝 Interact with the website in your browser...');
      console.log('⏱️  Recording will automatically capture your actions...');
      
      await this.prompt('\nPress Enter when you want to stop recording...');
      
      console.log('🛑 Stopping recording...');
      const session = await this.recorder.stopRecording();
      
      console.log(`✅ Recording completed!`);
      console.log(`📊 Session ID: ${session.id}`);
      console.log(`📋 Steps recorded: ${session.steps.length}`);
      
      const recordingPath = path.join('recordings', `${session.id}.json`);
      await fs.mkdir('recordings', { recursive: true });
      await fs.writeFile(recordingPath, JSON.stringify(session, null, 2));
      console.log(`💾 Recording saved to: ${recordingPath}`);
      
      return session;
    } catch (error) {
      console.error('❌ Recording failed:', error.message);
      return null;
    }
  }

  async generateCode(session) {
    if (!session) return null;
    
    console.log('\n🔧 Code Generation');
    console.log('==================');
    
    const frameworkInput = await this.prompt('Framework (playwright/cypress/selenium, default: playwright): ');
    const framework = frameworkInput.trim() || 'playwright';
    
    const langInput = await this.prompt('Language (ts/js/py/java, default: ts): ');
    const language = langInput.trim() || 'ts';
    
    console.log(`\n⚙️  Generating ${framework} ${language} code...`);
    
    try {
      const code = await this.codegen.generateCode(session, {
        framework,
        language,
        defaultTimeoutMs: 30000,
        retryAttempts: 3,
        autoWait: true
      });
      
      const extension = language === 'ts' ? 'ts' : language === 'js' ? 'js' : language === 'py' ? 'py' : 'java';
      const filename = `generated-test-${Date.now()}.${extension}`;
      const codePath = path.join('generated', filename);
      
      await fs.mkdir('generated', { recursive: true });
      await fs.writeFile(codePath, code);
      
      console.log(`✅ Code generated successfully!`);
      console.log(`💾 Code saved to: ${codePath}`);
      console.log('\n📄 Generated Code Preview:');
      console.log('=' .repeat(50));
      console.log(code.substring(0, 500) + (code.length > 500 ? '...\n[truncated]' : ''));
      console.log('=' .repeat(50));
      
      return { code, codePath, framework, language };
    } catch (error) {
      console.error('❌ Code generation failed:', error.message);
      return null;
    }
  }

  async runTest(codeInfo) {
    if (!codeInfo) return;
    
    console.log('\n🏃 Test Execution');
    console.log('=================');
    
    const runInput = await this.prompt('Run the generated test? (y/n, default: y): ');
    if (runInput.trim().toLowerCase() === 'n') {
      console.log('⏭️  Skipping test execution');
      return;
    }
    
    const headlessInput = await this.prompt('Run in headless mode? (y/n, default: n): ');
    const headless = headlessInput.trim().toLowerCase() === 'y';
    
    console.log(`\n🚀 Running ${codeInfo.framework} test ${headless ? '(headless)' : '(headed)'}...`);
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.join('runs', timestamp);
      
      const result = await this.runner.runGeneratedTest(codeInfo.code, {
        framework: codeInfo.framework,
        language: codeInfo.language,
        headless,
        outputDir,
        isGeneratedCode: true
      });
      
      console.log(`✅ Test execution completed!`);
      console.log(`📊 Status: ${result.success ? 'PASSED' : 'FAILED'}`);
      console.log(`⏱️  Duration: ${result.duration || 'N/A'}`);
      console.log(`📁 Artifacts saved to: ${outputDir}`);
      
      if (result.reportPath) {
        console.log(`📋 HTML Report: ${result.reportPath}`);
        
        const openReport = await this.prompt('Open HTML report? (y/n, default: y): ');
        if (openReport.trim().toLowerCase() !== 'n') {
          const { exec } = require('child_process');
          exec(`xdg-open "${result.reportPath}" || open "${result.reportPath}" || start "${result.reportPath}"`);
        }
      }
      
      if (!result.success && result.error) {
        console.log(`❌ Error: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
    }
  }

  async run() {
    try {
      console.log('🌟 Welcome to Web Testing IDE CLI!');
      console.log('This tool works in headless environments without display servers.\n');
      
      const session = await this.startRecording();
      if (!session) {
        console.log('❌ Recording failed, exiting...');
        this.rl.close();
        return;
      }
      
      const codeInfo = await this.generateCode(session);
      if (!codeInfo) {
        console.log('❌ Code generation failed, exiting...');
        this.rl.close();
        return;
      }
      
      await this.runTest(codeInfo);
      
      console.log('\n🎉 Web Testing IDE CLI session completed!');
      console.log('Thank you for using Web Testing IDE!');
      
    } catch (error) {
      console.error('❌ CLI error:', error.message);
    } finally {
      this.rl.close();
    }
  }
}

if (require.main === module) {
  const cli = new CLIRecorder();
  cli.run().catch(console.error);
}

module.exports = CLIRecorder;
