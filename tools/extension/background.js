chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Testing IDE Extension installed')
})

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggleRecording' })
})
