
const Corestore = require('corestore')
const Autopass = require('autopass')
const path = require('bare-path')
const dir = require('bare-storage')
const FramedStream = require('framed-stream')
const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const goodbye = require('graceful-goodbye')
const { isBareKit } = require('which-runtime')

const REQUEST_TIMEOUT_MESSAGE = 'A request id and action are required.'

const argv = (index) => Bare.argv[index + (isBareKit ? 0 : 2)]

const updaterConfig = {
  updates: argv(0) !== 'false',
  version: argv(1),
  upgrade: argv(2),
  name: argv(3),
  dir: argv(4) || dir.persistent(),
  app: argv(5)
}

const pipe = new FramedStream(Bare.IPC)

const storagePath = path.join(
  updaterConfig.dir,
  'pear-runtime',
  'corestore'
)

const store = new Corestore(storagePath)
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

let autopass
let initialized = false
let initializationPromise

function send(message) {
  pipe.write(JSON.stringify(message))
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Unexpected worker error'
}

function getEntryKey(payload) {
  const key = payload?.key

  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Entry key is required.')
  }

  return key.trim()
}

function getEntryValue(payload) {
  if (typeof payload?.value !== 'string') {
    throw new Error('Entry value must be a string.')
  }

  return payload.value
}

async function initialize() {
  if (initialized) return
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    await store.ready()
    await pear.ready()

    const pass = new Autopass(store)
    await pass.ready()

    autopass = pass

    autopass.on('update', () => {
      send({ type: 'entries-updated' })
    })

    initialized = true

    send({ type: 'ready' })
  })()

  try {
    await initializationPromise
  } catch (error) {
    initializationPromise = undefined
    initialized = false
    autopass = undefined

    console.error(
      '[Autopass worker] Initialization failed:',
      error
    )

    throw error
  }
}

async function listEntries() {
  const entries = []
  const stream = autopass.list()

  for await (const record of stream) {
    entries.push({
      key: record.key,
      value: record.value,
      file: record.file ?? null
    })
  }

  return entries
}

async function handleRequest(request) {
  const { id, action, payload = {} } = request ?? {}

  try {
    if (!id || typeof action !== 'string') {
      throw new Error(REQUEST_TIMEOUT_MESSAGE)
    }

    await initialize()

    let result

    switch (action) {
      case 'list':
        result = await listEntries()
        break

      case 'get': {
        const key = getEntryKey(payload)
        result = await autopass.get(key)
        break
      }

      case 'add': {
        const key = getEntryKey(payload)
        const value = getEntryValue(payload)

        await autopass.add(key, value)

        result = { key }
        break
      }

      case 'update': {
        const key = getEntryKey(payload)
        const value = getEntryValue(payload)
        const existing = await autopass.get(key)

        if (existing === null) {
          throw new Error(`Entry "${key}" does not exist.`)
        }

        // Preserve the current behavior until the Autopass API's
        // update/overwrite semantics have been verified.
        await autopass.add(key, value)

        result = { key, value }
        break
      }

      case 'remove': {
        const key = getEntryKey(payload)

        await autopass.remove(key)

        result = { key }
        break
      }

      default:
        throw new Error(`Unsupported action: ${action}`)
    }

    send({
      type: 'response',
      id,
      success: true,
      result
    })
  } catch (error) {
    send({
      type: 'response',
      id,
      success: false,
      error: getErrorMessage(error)
    })
  }
}

pear.updater.on('error', (error) => {
  console.error('[Pear updater] Error:', error)
})

if (updaterConfig.updates) {
  swarm.on('connection', (connection) => {
    store.replicate(connection)
  })

  swarm.join(pear.updater.drive.core.discoveryKey, {
    client: true,
    server: false
  })
}

pear.updater.on('updating', () => {
  pipe.write('updating')
})

pear.updater.on('updated', () => {
  pipe.write('updated')
})

pipe.on('data', (data) => {
  const message = data.toString()

  if (message === 'pear:applyUpdate') {
    void (async () => {
      await pear.ready()
      await pear.updater.applyUpdate()
      pipe.write('pear:updateApplied')
    })().catch((error) => {
      console.error('[Pear updater] Failed to apply update:', error)
    })

    return
  }

  let request

  try {
    request = JSON.parse(message)
  } catch {
    // Ignore plain-text messages that are not worker requests.
    return
  }

  if (request && typeof request === 'object' && request.action) {
    void handleRequest(request)
  }
})

async function closeResource(name, close) {
  try {
    await close()
  } catch (error) {
    console.error(`[Autopass worker] Failed to close ${name}:`, error)
  }
}

goodbye(async () => {
  initialized = false

  if (autopass) {
    await closeResource('Autopass', () => autopass.close())
  }

  await closeResource('Hyperswarm', () => swarm.destroy())
  await closeResource('Pear runtime', () => pear.close())
  await closeResource('Corestore', () => store.close())
})

console.log('[Autopass worker] Started')
