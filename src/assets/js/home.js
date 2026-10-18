
(() => {
  'use strict'

  // --------------------------------------------------
  // DOM elements
  // --------------------------------------------------

  const root = document.documentElement
  const toggle = document.getElementById('theme-toggle')
  const themeIcon = document.getElementById('theme-icon')
  const searchInput = document.getElementById('search-input')
  const emptyState = document.getElementById('empty-state')
  const entriesContainer = document.getElementById('entries-list')

  const infoDialog = document.getElementById('info-dialog')
  const dialogTitle = document.getElementById('dialog-title')
  const dialogCopy = document.getElementById('dialog-copy')
  const dialogOk = document.getElementById('dialog-ok')

  const entryDialog = document.getElementById('entry-dialog')
  const entryForm = document.getElementById('entry-form')
  const entryKeyInput = document.getElementById('entry-key')
  const entryValueInput = document.getElementById('entry-value')
  const entryDialogTitle = document.getElementById('entry-dialog-title')
  const entrySaveButton = document.getElementById('entry-save-btn')
  const entryFormError = document.getElementById('entry-form-error')

  const toastContainer = document.getElementById('toast-container')

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  let entries = []
  let searchQuery = ''
  let editingEntryKey = null
  let isSaving = false
  let isLoading = false

  // --------------------------------------------------
  // Theme
  // --------------------------------------------------

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
      // The theme still works without session storage.
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark'

    root.dataset.theme = isDark ? 'dark' : 'light'

    if (themeIcon) {
      themeIcon.textContent = isDark ? '☾' : '☼'
    }

    if (toggle) {
      toggle.setAttribute('aria-checked', String(!isDark))

      const label = isDark
        ? 'Switch to light theme'
        : 'Switch to dark theme'

      toggle.setAttribute('aria-label', label)
      toggle.title = label
    }

    saveTheme(theme)
  }

  applyTheme(readTheme() === 'light' ? 'light' : 'dark')

  toggle?.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')
  })

  // --------------------------------------------------
  // Toast notifications
  // Requires #toast-container in index.html
  // --------------------------------------------------

  function showToast(
    title,
    message,
    type = 'success',
    duration = 3500
  ) {
    if (!toastContainer) {
      console.error(
        'Toast container #toast-container was not found in index.html.'
      )
      return
    }

    const icons = {
      success: '✓',
      error: '!',
      info: 'i'
    }

    const safeType = Object.hasOwn(icons, type) ? type : 'info'

    const toast = document.createElement('div')
    toast.className = `toast toast--${safeType}`
    toast.setAttribute(
      'role',
      safeType === 'error' ? 'alert' : 'status'
    )
    toast.style.setProperty(
      '--toast-duration',
      `${duration}ms`
    )

    const icon = document.createElement('div')
    icon.className = 'toast-icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = icons[safeType]

    const content = document.createElement('div')
    content.className = 'toast-content'

    const heading = document.createElement('p')
    heading.className = 'toast-title'
    heading.textContent = title

    const description = document.createElement('p')
    description.className = 'toast-message'
    description.textContent = message

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'toast-close'
    closeButton.setAttribute('aria-label', 'Dismiss notification')
    closeButton.textContent = '×'

    const progress = document.createElement('div')
    progress.className = 'toast-progress'
    progress.setAttribute('aria-hidden', 'true')

    content.append(heading, description)
    toast.append(icon, content, closeButton, progress)
    toastContainer.append(toast)

    let dismissed = false
    let timer = null
    let removalTimer = null

    function dismiss() {
      if (dismissed) return

      dismissed = true
      window.clearTimeout(timer)
      toast.classList.add('is-leaving')

      const removeToast = () => {
        window.clearTimeout(removalTimer)
        toast.remove()
      }

      toast.addEventListener('animationend', removeToast, {
        once: true
      })

      // Fallback for reduced motion or missing animation events.
      removalTimer = window.setTimeout(removeToast, 300)
    }

    closeButton.addEventListener('click', dismiss)
    timer = window.setTimeout(dismiss, duration)

    return dismiss
  }

  // --------------------------------------------------
  // Information dialog
  // --------------------------------------------------

  function showDialog(title, message) {
    if (!infoDialog || typeof infoDialog.showModal !== 'function') {
      // Avoid browser alert() dialogs in the desktop runtime.
      showToast(title, message, 'info', 5000)
      return
    }

    if (dialogTitle) dialogTitle.textContent = title
    if (dialogCopy) dialogCopy.textContent = message

    if (!infoDialog.open) {
      infoDialog.showModal()
    }
  }

  dialogOk?.addEventListener('click', () => {
    infoDialog?.close()
  })

  infoDialog?.querySelector('.dialog-close')?.addEventListener('click', () => {
    infoDialog.close()
  })

  // --------------------------------------------------
  // Connection status
  // --------------------------------------------------

  function setConnectionStatus(isConnected) {
    const dot = document.getElementById('connection-dot')
    const label = document.getElementById('connection-label')

    if (dot) {
      dot.classList.toggle('connected', isConnected)
      dot.classList.toggle('disconnected', !isConnected)
    }

    if (label) {
      label.textContent = isConnected
        ? 'Connected to Pear'
        : 'Disconnected'
    }
  }

  // --------------------------------------------------
  // Dashboard statistics
  // --------------------------------------------------

  function updateStats() {
    const notes = document.getElementById('notes-count')
    const files = document.getElementById('files-count')
    const contacts = document.getElementById('contacts-count')
    const shares = document.getElementById('shares-count')

    if (notes) notes.textContent = String(entries.length)

    // These categories are not classified by the current worker API.
    if (files) files.textContent = '0'
    if (contacts) contacts.textContent = '0'
    if (shares) shares.textContent = '0'
  }

  // --------------------------------------------------
  // Render entries
  // --------------------------------------------------

  function renderEntries() {
    if (!entriesContainer) {
      console.error('Missing #entries-list container.')
      updateStats()
      return
    }

    entriesContainer.setAttribute('aria-busy', 'false')
    entriesContainer.replaceChildren()

    const filteredEntries = entries.filter((entry) => {
      const text = `${entry.key} ${entry.value ?? ''}`.toLowerCase()
      return text.includes(searchQuery)
    })

    filteredEntries.forEach((entry) => {
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
        typeof entry.value === 'string'
          ? entry.value
          : 'Vault entry'

      content.append(title, description)

      const actions = document.createElement('span')
      actions.className = 'entry-actions'

      const editButton = document.createElement('button')
      editButton.type = 'button'
      editButton.className = 'entry-action'
      editButton.textContent = 'Edit'
      editButton.setAttribute('aria-label', `Edit ${entry.key}`)
      editButton.addEventListener('click', () => {
        openEntryDialog(entry)
      })

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.className = 'entry-action entry-action-delete'
      deleteButton.textContent = 'Delete'
      deleteButton.setAttribute('aria-label', `Delete ${entry.key}`)
      deleteButton.addEventListener('click', () => {
        removeEntry(entry.key)
      })

      actions.append(editButton, deleteButton)
      row.append(icon, content, actions)

      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return

        showDialog(
          entry.key,
          String(entry.value ?? 'No content available.')
        )
      })

      entriesContainer.append(row)
    })

    // Preserve the empty-state element inside the entries container.
    if (emptyState) {
      entriesContainer.append(emptyState)

      emptyState.hidden = filteredEntries.length > 0
      emptyState.textContent = searchQuery
        ? 'No entries match your search.'
        : 'Your vault is empty. Add your first entry to get started.'
    }

    const summary = document.getElementById('save-status')

    if (summary) {
      summary.textContent = searchQuery
        ? `${filteredEntries.length} matching ${
            filteredEntries.length === 1 ? 'item' : 'items'
          }`
        : `${entries.length} ${
            entries.length === 1 ? 'entry' : 'entries'
          } in your vault`
    }

    updateStats()
  }

  // --------------------------------------------------
  // Load and refresh entries
  // --------------------------------------------------

  async function refreshEntries() {
    const result = await window.autopassAPI.list()
    entries = Array.isArray(result) ? result : []
    renderEntries()
  }

  async function loadEntries() {
    if (isLoading) return

    if (!window.autopassAPI) {
      setConnectionStatus(false)

      showToast(
        'Vault unavailable',
        'The Autopass API was not found. Check app.js and the worker startup.',
        'error',
        5000
      )

      return
    }

    isLoading = true

    if (entriesContainer) {
      entriesContainer.setAttribute('aria-busy', 'true')
    }

    try {
      await window.autopassAPI.ready()
      await refreshEntries()
      setConnectionStatus(true)
    } catch (error) {
      console.error('Failed to load vault entries:', error)
      setConnectionStatus(false)

      const summary = document.getElementById('save-status')
      if (summary) summary.textContent = 'Could not load vault entries'

      showToast(
        'Could not load your vault',
        error?.message || 'Please check your connection and try again.',
        'error',
        5000
      )
    } finally {
      isLoading = false

      if (entriesContainer) {
        entriesContainer.setAttribute('aria-busy', 'false')
      }
    }
  }

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase()
    renderEntries()
  })

  // --------------------------------------------------
  // New / edit entry dialog
  // --------------------------------------------------

  function openEntryDialog(entry = null) {
    if (
      !entryDialog ||
      !entryForm ||
      !entryKeyInput ||
      !entryValueInput ||
      !entryDialogTitle ||
      !entrySaveButton ||
      !entryFormError
    ) {
      showToast(
        'Form unavailable',
        'The entry form could not be found. Check index.html.',
        'error',
        5000
      )
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

  function closeEntryDialog() {
    if (isSaving) return
    entryDialog?.close()
  }

  document.getElementById('add-entry-btn')?.addEventListener('click', () => {
    openEntryDialog()
  })

  document.getElementById('entry-dialog-close')?.addEventListener('click', () => {
    closeEntryDialog()
  })

  document.getElementById('entry-cancel-btn')?.addEventListener('click', () => {
    closeEntryDialog()
  })

  entryForm?.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (isSaving) return

    const key = entryKeyInput.value.trim()
    const value = entryValueInput.value
    const wasEditing = editingEntryKey !== null

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

    // Prevent duplicate titles when creating a new entry.
    if (
      !wasEditing &&
      entries.some((entry) => entry.key === key)
    ) {
      entryFormError.textContent =
        'An entry with this title already exists. Choose another title.'
      entryFormError.hidden = false
      entryKeyInput.focus()
      return
    }

    if (!window.autopassAPI) {
      entryFormError.textContent = 'The vault API is unavailable.'
      entryFormError.hidden = false
      return
    }

    isSaving = true
    entrySaveButton.disabled = true
    entrySaveButton.textContent = 'Saving...'
    entryFormError.hidden = true

    try {
      if (wasEditing) {
        await window.autopassAPI.update(editingEntryKey, value)
      } else {
        await window.autopassAPI.add(key, value)
      }

      await refreshEntries()
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

      const message = error?.message || 'Please try again.'

      entryFormError.textContent = message
      entryFormError.hidden = false

      showToast(
        wasEditing ? 'Could not update entry' : 'Could not save entry',
        message,
        'error',
        5000
      )
    } finally {
      isSaving = false
      entrySaveButton.disabled = false
      entrySaveButton.textContent =
        editingEntryKey !== null ? 'Save changes' : 'Save entry'
    }
  })

  // --------------------------------------------------
  // Delete entry
  // Uses a custom confirmation dialog, not window.confirm().
  // --------------------------------------------------

  function confirmDelete(key) {
    const confirmation = document.createElement('dialog')
    confirmation.className = 'app-dialog'

    const form = document.createElement('form')
    form.method = 'dialog'

    const heading = document.createElement('h2')
    heading.textContent = 'Delete entry?'

    const message = document.createElement('p')
    message.textContent =
      `Are you sure you want to permanently delete "${key}" from your vault?`

    const actions = document.createElement('div')
    actions.className = 'entry-dialog-actions'

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.textContent = 'Cancel'

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.textContent = 'Delete entry'
    deleteButton.id = 'entry-delete-confirm-btn'

    actions.append(cancelButton, deleteButton)
    form.append(heading, message, actions)
    confirmation.append(form)
    document.body.append(confirmation)

    return new Promise((resolve) => {
      let resolved = false

      function finish(result) {
        if (resolved) return
        resolved = true

        if (confirmation.open) confirmation.close()
        confirmation.remove()
        resolve(result)
      }

      cancelButton.addEventListener('click', () => finish(false))
      deleteButton.addEventListener('click', () => finish(true))

      confirmation.addEventListener('cancel', (event) => {
        event.preventDefault()
        finish(false)
      })

      confirmation.addEventListener('close', () => {
        if (!resolved) finish(false)
      })

      confirmation.showModal()
      cancelButton.focus()
    })
  }

  async function removeEntry(key) {
    const confirmed = await confirmDelete(key)
    if (!confirmed) return

    if (!window.autopassAPI) {
      showToast(
        'Vault unavailable',
        'The Autopass API is not available.',
        'error',
        5000
      )
      return
    }

    try {
      await window.autopassAPI.remove(key)
      await refreshEntries()

      showToast(
        'Entry deleted',
        `"${key}" was removed from your vault.`,
        'success'
      )
    } catch (error) {
      console.error('Failed to delete entry:', error)

      showToast(
        'Could not delete entry',
        error?.message || 'Please try again.',
        'error',
        5000
      )
    }
  }

  // --------------------------------------------------
  // Pear worker updates
  // --------------------------------------------------

  window.autopassAPI?.onEntriesUpdated((updatedEntries) => {
    entries = Array.isArray(updatedEntries) ? updatedEntries : []
    setConnectionStatus(true)
    renderEntries()
  })

  // --------------------------------------------------
  // Dashboard buttons
  // --------------------------------------------------

  document.getElementById('view-all-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault entries',
      `Your vault currently contains ${entries.length} ${
        entries.length === 1 ? 'entry' : 'entries'
      }.`
    )
  })

  document.getElementById('learn-more-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault, your control.',
      'PeerVault uses Autopass for vault operations. Peer connectivity, sharing, and file permissions need their own implementation and testing.'
    )
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

  // Remove static demo rows; render real data from Autopass.
  document.querySelectorAll('#entries-list .activity-row').forEach((row) => {
    row.remove()
  })

  // --------------------------------------------------
  // Start the app
  // --------------------------------------------------

  loadEntries()
})()
