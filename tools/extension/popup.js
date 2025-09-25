let isRecording = false

document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn')
  const stopBtn = document.getElementById('stopBtn')
  const status = document.getElementById('status')
  
  recordBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    chrome.tabs.sendMessage(tab.id, { action: 'startRecording' }, (response) => {
      if (response?.success) {
        isRecording = true
        recordBtn.disabled = true
        stopBtn.disabled = false
        status.textContent = 'Recording...'
      }
    })
  })
  
  stopBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' }, (response) => {
      if (response?.success) {
        isRecording = false
        recordBtn.disabled = false
        stopBtn.disabled = true
        status.textContent = 'Recording stopped'
      }
    })
  })
})
