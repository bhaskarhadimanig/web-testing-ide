let ws = null
let isRecording = false

function connectToIDE() {
  try {
    ws = new WebSocket('ws://localhost:8080')
    
    ws.onopen = () => {
      console.log('Connected to Web Testing IDE')
    }
    
    ws.onclose = () => {
      console.log('Disconnected from Web Testing IDE')
      setTimeout(connectToIDE, 5000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  } catch (error) {
    console.error('Failed to connect to IDE:', error)
    setTimeout(connectToIDE, 5000)
  }
}

function captureEvent(type, element, value = null) {
  if (!isRecording || !ws || ws.readyState !== WebSocket.OPEN) return
  
  const selectors = generateSelectors(element)
  const boundingBox = element.getBoundingClientRect()
  
  const step = {
    type: 'step',
    data: {
      type,
      timestamp: Date.now(),
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      selectors,
      value,
      metadata: {
        elementAttributes: getElementAttributes(element),
        boundingBox: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height
        },
        innerText: element.innerText?.substring(0, 100),
        tagName: element.tagName.toLowerCase()
      }
    }
  }
  
  ws.send(JSON.stringify(step))
}

function generateSelectors(element) {
  const selectors = []
  
  if (element.id) {
    selectors.push({
      selector: `#${element.id}`,
      type: 'id',
      score: 0.9,
      isUnique: true
    })
  }
  
  if (element.getAttribute('data-testid')) {
    selectors.push({
      selector: `[data-testid="${element.getAttribute('data-testid')}"]`,
      type: 'data-testid',
      score: 0.8,
      isUnique: true
    })
  }
  
  if (element.getAttribute('aria-label')) {
    selectors.push({
      selector: `[aria-label="${element.getAttribute('aria-label')}"]`,
      type: 'aria-label',
      score: 0.7,
      isUnique: false
    })
  }
  
  selectors.push({
    selector: element.tagName.toLowerCase(),
    type: 'css',
    score: 0.3,
    isUnique: false
  })
  
  return selectors
}

function getElementAttributes(element) {
  const attributes = {}
  for (let attr of element.attributes) {
    attributes[attr.name] = attr.value
  }
  return attributes
}

document.addEventListener('click', (event) => {
  captureEvent('click', event.target)
}, true)

document.addEventListener('input', (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    captureEvent('type', event.target, event.target.value)
  }
}, true)

window.addEventListener('beforeunload', () => {
  captureEvent('navigate', document.documentElement)
})

connectToIDE()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRecording') {
    isRecording = true
    sendResponse({ success: true })
  } else if (message.action === 'stopRecording') {
    isRecording = false
    sendResponse({ success: true })
  }
})
