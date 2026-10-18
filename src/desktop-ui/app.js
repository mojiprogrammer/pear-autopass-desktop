
const bridge = window.bridge
const decoder = new TextDecoder('utf-8')
const workerPath = '/workers/main.js'

const pendingRequests = new Map()
let nextRequestId = 0
let workerReady = false
let startupPromise = null

function decodeMessage(data) {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return decoder.decode(data)
  if (ArrayBuffer.isView(data)) return decoder.decode(data)
  return String(data)
}

function dispatchEntries(entries) {
  window.dispatchEvent(
    new CustomEvent('autopass:entries', {
      detail: entries
    })
  )
}

function request(action, payload = {}) {
  const id = `request-${++nextRequestId}`

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject })

    try {
      bridge.writeWorkerIPC(
        workerPath,
        JSON.stringify({ id, action, payload })
      )
    } catch (error) {
      pendingRequests.delete(id)
      reject(error)
    }
  })
}

// Public API for dashboard and other renderer scripts.
window.autopassAPI = {
  ready: () => {
    if (!startupPromise) {
      return Promise.reject(
        new Error('Autopass startup has not begun.')
      )
    }

    return startupPromise
  },

  list: () => request('list'),
  get: (key) => request('get', { key }),
  add: (key, value) => request('add', { key, value }),
  update: (key, value) => request('update', { key, value }),
  remove: (key) => request('remove', { key }),

  onEntriesUpdated(callback) {
    const handler = (event) => callback(event.detail)
    window.addEventListener('autopass:entries', handler)

    return () => {
      window.removeEventListener('autopass:entries', handler)
    }
  }
}

// Existing version and update controls.
const versionElement = document.getElementById('v')
const updateButton = document.getElementById('update-btn')

if (versionElement && bridge.pkg) {
  versionElement.innerText += bridge.pkg().version
}

function showUpdateReady() {
  if (versionElement) {
    versionElement.innerText = 'Update ready!'
  }

  if (!updateButton) return

  updateButton.style.display = 'inline-block'

  updateButton.onclick = async () => {
    updateButton.disabled = true
    updateButton.innerText = 'Updating...'

    try {
      await bridge.applyUpdate()
      await bridge.appAfterUpdate()
    } catch (error) {
      if (versionElement) {
        versionElement.innerText = `Update failed: ${error.message}`
      }

      updateButton.disabled = false
      updateButton.innerText = 'Retry update'
    }
  }
}

function onWorkerUpdaterEvent(name) {
  if (name === 'updating') {
    if (versionElement) {
      versionElement.innerText = 'UPDATING...'
    }

    return
  }

  if (name === 'updated') {
    showUpdateReady()
  }
}

function handleWorkerMessage(data) {
  const message = decodeMessage(data)

  // Pear updater events are plain-text messages.
  let packet

  try {
    packet = JSON.parse(message)
  } catch {
    onWorkerUpdaterEvent(message)
    return
  }

  if (!packet || typeof packet !== 'object') return

  if (packet.type === 'ready') {
    workerReady = true
    console.log('Autopass worker is ready.')
    return
  }

  if (packet.type === 'response') {
    const pending = pendingRequests.get(packet.id)

    if (!pending) return

    pendingRequests.delete(packet.id)

    if (packet.success) {
      pending.resolve(packet.result)
    } else {
      pending.reject(
        new Error(packet.error || 'Autopass request failed.')
      )
    }

    return
  }

  if (packet.type === 'entries-updated') {
    request('list')
      .then(dispatchEntries)
      .catch((error) => {
        console.error('Could not refresh vault entries:', error)
      })
  }
}

// Register listeners before starting the worker to reduce the chance
// of missing early worker output.
const offWorkerStdout = bridge.onWorkerStdout(
  workerPath,
  (data) => {
    console.log('Worker stdout:', decodeMessage(data))
  }
)

const offWorkerStderr = bridge.onWorkerStderr(
  workerPath,
  (data) => {
    console.error('Worker stderr:', decodeMessage(data))
  }
)

const offWorkerIpc = bridge.onWorkerIPC(
  workerPath,
  handleWorkerMessage
)

let workerExited = false

const offWorkerExit = bridge.onWorkerExit(
  workerPath,
  (code) => {
    workerExited = true

    console.error('Autopass worker exited with code', code)

    const error = new Error(
      `Autopass worker exited with code ${code}.`
    )

    for (const pending of pendingRequests.values()) {
      pending.reject(error)
    }

    pendingRequests.clear()

    offWorkerStdout()
    offWorkerStderr()
    offWorkerIpc()
    offWorkerExit()
  }
)

// Start the worker after its event listeners are registered.
bridge.startWorker(workerPath)

// The first request triggers initialization in the worker.
// The worker sends a ready message and then the request response.
startupPromise = request('list')
  .then((entries) => {
    dispatchEntries(entries)
    return entries
  })
  .catch((error) => {
    console.error('Could not load initial vault entries:', error)
    throw error
  })

// Avoid an unhandled rejection if the initial load fails before
// another part of the UI calls autopassAPI.ready().
startupPromise.catch(() => {})
