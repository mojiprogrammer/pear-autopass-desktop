
(() => {
  const root = document.documentElement
  const toggle = document.getElementById('theme-toggle')
  const themeIcon = document.getElementById('theme-icon')
  const searchInput = document.getElementById('search-input')
  const emptyState = document.getElementById('empty-state')
  const dialog = document.getElementById('info-dialog')
  const dialogTitle = document.getElementById('dialog-title')
  const dialogCopy = document.getElementById('dialog-copy')
  const dialogOk = document.getElementById('dialog-ok')
  const entriesContainer = document.getElementById('entries-list')

  let entries = []
  let searchQuery = ''

  function readTheme() {
    try {
      return sessionStorage.getItem('peervault-theme')
    } catch {
      return null
    }
  }

  function saveTheme(theme) {
    try {
      sessionStorage.setItem('peervault-theme', theme)
    } catch {
      // Theme still works without storage.
    }
  }

  function applyTheme(theme) {
    const dark = theme === 'dark'
    root.dataset.theme = dark ? 'dark' : 'light'

    if (themeIcon) themeIcon.textContent = dark ? '☾' : '☼'

    if (toggle) {
      toggle.setAttribute('aria-checked', String(!dark))
      toggle.setAttribute(
        'aria-label',
        dark ? 'Switch to light theme' : 'Switch to dark theme'
      )
      toggle.title = dark ? 'Switch to light theme' : 'Switch to dark theme'
    }

    saveTheme(theme)
  }

  applyTheme(readTheme() === 'light' ? 'light' : 'dark')

  toggle?.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')
  })

  function showDialog(title, copy) {
    if (!dialog) {
      alert(`${title}\n\n${copy}`)
      return
    }

    if (dialogTitle) dialogTitle.textContent = title
    if (dialogCopy) dialogCopy.textContent = copy

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      alert(`${title}\n\n${copy}`)
    }
  }

  function setConnectionStatus(isConnected) {
    const dot = document.getElementById('connection-dot')
    const label = document.getElementById('connection-label')

    if (dot) {
      dot.classList.toggle('connected', isConnected)
      dot.classList.toggle('disconnected', !isConnected)
    }

    if (label) {
      label.textContent = isConnected ? 'Connected to Pear' : 'Disconnected'
    }
  }

  function updateStats() {
  const notes = document.getElementById('notes-count')
  const files = document.getElementById('files-count')
  const contacts = document.getElementById('contacts-count')
  const shares = document.getElementById('shares-count')

  if (notes) notes.textContent = String(entries.length)

  // These categories are not yet classified by the current worker API.
  if (files) files.textContent = '0'
  if (contacts) contacts.textContent = '0'
  if (shares) shares.textContent = '0'
}

 
function renderEntries() {
  if (!entriesContainer) {
    console.error('Missing #entries-list container.')
    updateStats()
    return
  }

  entriesContainer.setAttribute('aria-busy', 'false')
  entriesContainer.replaceChildren()

  const filtered = entries.filter((entry) => {
    const text = `${entry.key} ${entry.value ?? ''}`.toLowerCase()
    return text.includes(searchQuery)
  })

  filtered.forEach((entry) => {
    const row = document.createElement('div')
    row.className = 'activity-row'
    row.dataset.entryKey = entry.key

    const icon = document.createElement('span')
    icon.className = 'activity-icon'
    icon.textContent = '▤'
    icon.setAttribute('aria-hidden', 'true')

    const content = document.createElement('span')
    content.className = 'activity-content'

    const title = document.createElement('span')
    title.className = 'activity-title'
    title.textContent = entry.key

    const description = document.createElement('span')
    description.className = 'activity-description'
    description.textContent =
      typeof entry.value === 'string' ? entry.value : 'Vault entry'

    content.append(title, description)

    const actions = document.createElement('span')
    actions.className = 'entry-actions'

    const editButton = document.createElement('button')
    editButton.type = 'button'
    editButton.className = 'entry-action'
    editButton.textContent = 'Edit'
    editButton.setAttribute('aria-label', `Edit ${entry.key}`)
    editButton.addEventListener('click', () => editEntry(entry))

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.className = 'entry-action entry-action-delete'
    deleteButton.textContent = 'Delete'
    deleteButton.setAttribute('aria-label', `Delete ${entry.key}`)
    deleteButton.addEventListener('click', () => removeEntry(entry.key))

    actions.append(editButton, deleteButton)
    row.append(icon, content, actions)

    // Clicking the row opens the entry.
    row.addEventListener('click', (event) => {
      if (event.target.closest('button')) return

      showDialog(
        entry.key,
        String(entry.value ?? 'No content available.')
      )
    })

    entriesContainer.append(row)
  })

  // Keep the empty-state element inside the activity card.
  if (emptyState) {
    entriesContainer.append(emptyState)
    emptyState.hidden = filtered.length > 0
    emptyState.textContent = searchQuery
      ? 'No entries match your search.'
      : 'Your vault is empty. Add your first entry to get started.'
  }

  const summary = document.getElementById('save-status')

  if (summary) {
    summary.textContent = searchQuery
      ? `${filtered.length} matching ${
          filtered.length === 1 ? 'item' : 'items'
        }`
      : `${entries.length} ${
          entries.length === 1 ? 'entry' : 'entries'
        } in your vault`
  }

  updateStats()
}

async function refreshEntries() {
  entries = await window.autopassAPI.list()
  renderEntries()
}

async function addEntry() {
  const keyInput = window.prompt('Enter an entry title:')
  if (keyInput === null) return

  const key = keyInput.trim()
  if (!key) {
    showDialog('Invalid title', 'Please enter a title for your entry.')
    return
  }

  // Creating an existing key should not silently overwrite it.
  if (entries.some((entry) => entry.key === key)) {
    showDialog(
      'Entry already exists',
      'Choose a different title or edit the existing entry.'
    )
    return
  }

  const value = window.prompt('Enter your entry content:')
  if (value === null) return

  try {
    await window.autopassAPI.add(key, value)
    await refreshEntries()
    showDialog('Entry created', `"${key}" was saved successfully.`)
  } catch (error) {
    showDialog('Could not create entry', error.message)
  }
}

async function editEntry(entry) {
  const value = window.prompt(
    `Edit content for "${entry.key}":`,
    String(entry.value ?? '')
  )

  if (value === null) return

  try {
    await window.autopassAPI.update(entry.key, value)
    await refreshEntries()
    showDialog('Entry updated', `"${entry.key}" was updated successfully.`)
  } catch (error) {
    showDialog('Could not update entry', error.message)
  }
}

async function removeEntry(key) {
  const confirmed = window.confirm(
    `Delete "${key}" permanently from your vault?`
  )

  if (!confirmed) return

  try {
    await window.autopassAPI.remove(key)
    await refreshEntries()
    showDialog('Entry deleted', `"${key}" was removed from your vault.`)
  } catch (error) {
    showDialog('Could not delete entry', error.message)
  }
}


  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase()
    renderEntries()
  })

  async function loadEntries() {
    if (!window.autopassAPI) {
      setConnectionStatus(false)
      showDialog(
        'Vault unavailable',
        'The Autopass API was not found. Check that app.js is loaded and the worker has started.'
      )
      return
    }

    try {
      await window.autopassAPI.ready()
      entries = await window.autopassAPI.list()
      setConnectionStatus(true)
      renderEntries()
    } catch (error) {
      console.error('Failed to load vault entries:', error)
      setConnectionStatus(false)

      const summary = document.getElementById('save-status')
      if (summary) summary.textContent = 'Could not load vault entries'
    }
  }

  // Receive refreshed lists from app.js.
  window.autopassAPI?.onEntriesUpdated((updatedEntries) => {
    entries = Array.isArray(updatedEntries) ? updatedEntries : []
    setConnectionStatus(true)
    renderEntries()
  })

 
const entryDialog = document.getElementById('entry-dialog')
const entryForm = document.getElementById('entry-form')
const entryKeyInput = document.getElementById('entry-key')
const entryValueInput = document.getElementById('entry-value')
const entryDialogTitle = document.getElementById('entry-dialog-title')
const entrySaveButton = document.getElementById('entry-save-btn')
const entryFormError = document.getElementById('entry-form-error')

let editingEntryKey = null

function openEntryDialog(entry = null) {
  if (!entryDialog || !entryForm) {
    showDialog('Form unavailable', 'The entry form was not found in index.html.')
    return
  }

  editingEntryKey = entry ? entry.key : null

  entryForm.reset()
  entryFormError.hidden = true
  entryFormError.textContent = ''

  entryDialogTitle.textContent = entry ? 'Edit entry' : 'New entry'
  entrySaveButton.textContent = entry ? 'Save changes' : 'Save entry'

  entryKeyInput.value = entry ? entry.key : ''
  entryKeyInput.readOnly = Boolean(entry)
  entryValueInput.value = entry ? String(entry.value ?? '') : ''

  if (!entryDialog.open) {
    entryDialog.showModal()
  }

  entryKeyInput.focus()
}

async function addEntry() {
  openEntryDialog()
}

async function editEntry(entry) {
  openEntryDialog(entry)
}

entryForm?.addEventListener('submit', async (event) => {
  event.preventDefault()

  const key = entryKeyInput.value.trim()
  const value = entryValueInput.value

  if (!key) {
    entryFormError.textContent = 'Please enter a title.'
    entryFormError.hidden = false
    entryKeyInput.focus()
    return
  }

  if (!value.trim()) {
    entryFormError.textContent = 'Please enter some content.'
    entryFormError.hidden = false
    entryValueInput.focus()
    return
  }

  // Do not silently overwrite another entry during creation.
  if (
    editingEntryKey === null &&
    entries.some((entry) => entry.key === key)
  ) {
    entryFormError.textContent =
      'An entry with this title already exists. Please choose another title.'
    entryFormError.hidden = false
    entryKeyInput.focus()
    return
  }

  entrySaveButton.disabled = true
  entrySaveButton.textContent = 'Saving...'
  entryFormError.hidden = true

  try {
    if (editingEntryKey !== null) {
      await window.autopassAPI.update(editingEntryKey, value)
    } else {
      await window.autopassAPI.add(key, value)
    }
    const wasEditing = editingEntryKey !== null

    entries = await window.autopassAPI.list()
    renderEntries()

    entryDialog.close()

    showToast(
  wasEditing ? 'Changes saved!' : 'Entry saved successfully!',
  wasEditing
    ? `"${key}" has been updated in your vault.`
    : `"${key}" has been added to your vault.`,
  'success'
)
  } catch (error) {
    console.error('Failed to save entry:', error)
    entryFormError.textContent = error.message || 'Could not save the entry.'
    entryFormError.hidden = false
    showToast('Could not save entry',error.message || 'Please try again.','error',5000)
  } finally {
    entrySaveButton.disabled = false
    entrySaveButton.textContent =
      editingEntryKey !== null ? 'Save changes' : 'Save entry'
  }
})

document.getElementById('entry-dialog-close')?.addEventListener('click', () => {
  entryDialog?.close()
})

document.getElementById('entry-cancel-btn')?.addEventListener('click', () => {
  entryDialog?.close()
})

function showToast(
  title,
  message,
  type = 'success',
  duration = 3500
) {
  const container = document.getElementById('toast-container')

  if (!container) {
    console.error('Toast container #toast-container was not found.')
    return
  }

  const icons = {
    success: '✓',
    error: '!',
    info: 'i'
  }

  const toast = document.createElement('div')
  toast.className = `toast toast--${type}`
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
  toast.style.setProperty('--toast-duration', `${duration}ms`)

  const icon = document.createElement('div')
  icon.className = 'toast-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = icons[type] ?? icons.info

  const content = document.createElement('div')
  content.className = 'toast-content'

  const heading = document.createElement('p')
  heading.className = 'toast-title'
  heading.textContent = title

  const description = document.createElement('p')
  description.className = 'toast-message'
  description.textContent = message

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'toast-close'
  close.setAttribute('aria-label', 'Dismiss notification')
  close.textContent = '×'

  const progress = document.createElement('div')
  progress.className = 'toast-progress'
  progress.setAttribute('aria-hidden', 'true')

  content.append(heading, description)
  toast.append(icon, content, close, progress)
  container.append(toast)

  let dismissed = false
  let timer

  function dismiss() {
    if (dismissed) return
    dismissed = true

    clearTimeout(timer)
    toast.classList.add('is-leaving')

    toast.addEventListener('animationend', () => {
      toast.remove()
    }, { once: true })

    // Fallback in case animations are disabled.
    window.setTimeout(() => toast.remove(), 300)
  }

  close.addEventListener('click', dismiss)

  timer = window.setTimeout(dismiss, duration)

  return dismiss
}


  async function removeEntry(key) {
    const confirmed = confirm(`Remove "${key}" from your vault?`)
    if (!confirmed) return

    try {
      await window.autopassAPI.remove(key)
      entries = await window.autopassAPI.list()
      renderEntries()
      showToast(
  'Entry deleted',
  `"${key}" was removed from your vault.`,
  'success'
)
    } catch (error) {
      console.error('Failed to remove entry:', error)
      showToast(
  'Could not delete entry',
  error.message || 'Please try again.',
  'error',
  5000
)
    }
  }

  document.getElementById('add-entry-btn')?.addEventListener('click', () => {
    addEntry()
  })

  document.getElementById('view-all-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault entries',
      `Your vault currently contains ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}.`
    )
  })

  document.getElementById('learn-more-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault, your control.',
      'PeerVault uses Autopass for vault operations. Peer connectivity, sharing, and file permissions need their own implementation and testing.'
    )
  })

  dialogOk?.addEventListener('click', () => dialog?.close())
  dialog?.querySelector('.dialog-close')?.addEventListener('click', () => {
    dialog.close()
  })

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('active', item === button)
      })

      const view = button.dataset.view

      if (view && view !== 'dashboard') {
        showDialog(
          button.textContent.trim(),
          `The ${button.textContent.trim()} view is not connected to a separate data view yet.`
        )
      }
    })
  })

  document.getElementById('update-btn')?.addEventListener('click', () => {
    loadEntries()
  })

  // Remove the static demo rows; render actual data from Autopass.
  document.querySelectorAll('.activity-row').forEach((row) => {
    row.remove()
  })

  loadEntries()
})()
