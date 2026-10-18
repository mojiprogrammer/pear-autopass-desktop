
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
    console.error(
      'Autopass entries container not found. ' +
      'Expected an element with id="entries-list".'
    )
    updateStats()
    return
  }

  entriesContainer.setAttribute('aria-busy', 'false')

  // Clear existing rows without losing the empty-state element.
  entriesContainer.replaceChildren()

  if (emptyState) {
    entriesContainer.append(emptyState)
  }

  // Filter entries using the current search query.
  const filtered = entries.filter((entry) => {
    const text = `${entry.key} ${entry.value ?? ''}`.toLowerCase()
    return text.includes(searchQuery)
  })

  // Render each Autopass entry.
  filtered.forEach((entry) => {
    const row = document.createElement('button')
    row.type = 'button'
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
      typeof entry.value === 'string'
        ? entry.value
        : 'Vault entry'

    content.append(title, description)
    row.append(icon, content)

    // Open the entry details when its row is clicked.
    row.addEventListener('click', () => {
      showDialog(
        entry.key,
        String(entry.value ?? 'No content available.')
      )
    })

    // Insert rows before the empty-state element.
    if (emptyState && entriesContainer.contains(emptyState)) {
      entriesContainer.insertBefore(row, emptyState)
    } else {
      entriesContainer.append(row)
    }
  })

  // Show the empty state only when there are no matching entries.
  if (emptyState) {
    emptyState.hidden = filtered.length > 0

    if (filtered.length === 0) {
      emptyState.textContent = searchQuery
        ? 'No entries match your search.'
        : 'Your vault is empty. Add your first entry to get started.'
    }
  }

  // Update the status message.
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

  // Update the dashboard counters.
  updateStats()
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

  async function addEntry() {
    const key = prompt('Entry title:')
    if (key === null) return

    const cleanKey = key.trim()
    if (!cleanKey) {
      showDialog('Title required', 'Please enter a title for your vault entry.')
      return
    }

    const value = prompt('Entry content:')
    if (value === null) return

    try {
      await window.autopassAPI.add(cleanKey, value)
      entries = await window.autopassAPI.list()
      renderEntries()
      showDialog('Entry saved', `"${cleanKey}" was saved to your vault.`)
    } catch (error) {
      console.error('Failed to add entry:', error)
      showDialog('Could not save entry', error.message)
    }
  }

  async function removeEntry(key) {
    const confirmed = confirm(`Remove "${key}" from your vault?`)
    if (!confirmed) return

    try {
      await window.autopassAPI.remove(key)
      entries = await window.autopassAPI.list()
      renderEntries()
    } catch (error) {
      console.error('Failed to remove entry:', error)
      showDialog('Could not remove entry', error.message)
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
