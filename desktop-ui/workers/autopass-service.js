
const Corestore = require('corestore')
const Autopass = require('autopass')
const path = require('bare-path')
const dir = require('bare-storage')
const FramedStream = require('framed-stream')
const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const goodbye = require('graceful-goodbye')
const { isBareKit } = require('which-runtime')

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
    initializationPromise = null
    initialized = false
    autopass = undefined
    console.error('[Autopass worker] Initialization failed:', error)
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
  const { id, action, payload = {} } = request
  try {
    if (!id || typeof action !== 'string') {
      throw new Error('A request id and action are required.')
    }

    await initialize()

    let result

    switch (action) {
      case 'list':
        result = await listEntries()
        break

      case 'get':
        if (typeof payload.key !== 'string' || !payload.key.trim()) {
          throw new Error('Entry key is required.')
        }

        result = await autopass.get(payload.key)
        break

  case 'update': {
  const key = String(payload.key ?? '').trim()
  const value = payload.value

  if (!key) {
    throw new Error('Entry key is required.')
  }

  if (typeof value !== 'string') {
    throw new Error('Entry content must be a string.')
  }

  const existing = await autopass.get(key)

  if (existing === null) {
    throw new Error(`Entry "${key}" does not exist.`)
  }

  await autopass.add(key, value)

  result = { key, value }
  break
}

      case 'add':
        if (typeof payload.key !== 'string' || !payload.key.trim()) {
          throw new Error('Entry key is required.')
        }

        if (typeof payload.value !== 'string') {
          throw new Error('Entry value must be a string.')
        }

        await autopass.add(payload.key.trim(), payload.value)
        result = { key: payload.key.trim() }
        break

      case 'remove':
        if (typeof payload.key !== 'string' || !payload.key.trim()) {
          throw new Error('Entry key is required.')
        }

        await autopass.remove(payload.key)
        result = { key: payload.key }
        break

      default:
        throw new Error(`Unsupported action: ${action}`)
    }

    send({ type: 'response', id, success: true, result })
  } catch (error) {
    send({
      type: 'response',
      id,
      success: false,
      error: error instanceof Error
        ? error.message
        : 'Unexpected worker error'
    })
  }
}

pear.updater.on('error', (error) => {
  console.error('Pear updater error:', error)
})

if (updaterConfig.updates !== false) {
  swarm.on('connection', (connection) => store.replicate(connection))

  swarm.join(pear.updater.drive.core.discoveryKey, {
    client: true,
    server: false
  })
}

// Keep the existing Pear updater messages compatible with the renderer.
pear.updater.on('updating', () => pipe.write('updating'))
pear.updater.on('updated', () => pipe.write('updated'))

pipe.on('data', (data) => {
  const message = data.toString()

  // Preserve the existing Pear update command.
  if (message === 'pear:applyUpdate') {
    ;(async () => {
      await pear.ready()
      await pear.updater.applyUpdate()
      pipe.write('pear:updateApplied')
    })().catch((error) => {
      console.error('Update failed:', error)
    })

    return
  }

  let request

  try {
    request = JSON.parse(message)
  } catch {
    // Ignore other plain-text messages, such as the old greeting.
    return
  }

  if (request && request.action) {
    handleRequest(request)
  }
})

goodbye(async () => {
  if (autopass) await autopass.close()
  await swarm.destroy()
  await pear.close()
  await store.close()
})

console.log('Pear AutoPass Desktop worker started')

