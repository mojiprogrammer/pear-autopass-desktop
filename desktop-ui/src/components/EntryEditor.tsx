
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Entry } from '../types/entry';

interface EntryEditorProps {
  open: boolean;
  entry: Entry | null;
  onClose: () => void;
  onSave: (key: string, value: string) => Promise<void>;
}

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H3',
  'BLOCKQUOTE',
]);

function sanitizeRichText(html: string): string {
  const documentFragment = new DOMParser().parseFromString(html, 'text/html');

  function cleanNode(node: Node): Node[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return [document.createTextNode(node.textContent ?? '')];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node as HTMLElement;
    const cleanedChildren = Array.from(element.childNodes).flatMap(cleanNode);

    if (!ALLOWED_TAGS.has(element.tagName)) {
      return cleanedChildren;
    }

    const cleanElement = document.createElement(element.tagName.toLowerCase());

    for (const child of cleanedChildren) {
      cleanElement.appendChild(child);
    }

    return [cleanElement];
  }

  return Array.from(documentFragment.body.childNodes)
    .flatMap(cleanNode)
    .map((node) => {
      const wrapper = document.createElement('div');
      wrapper.appendChild(node);
      return wrapper.innerHTML;
    })
    .join('');
}

export default function EntryEditor({
  open,
  entry,
  onClose,
  onSave,
}: EntryEditorProps) {
  const [key, setKey] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    setKey(entry?.key ?? '');
    setContent(entry?.value ?? '');
    setError(null);
    setSaving(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = entry?.value ?? '';
    }

    requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [open, entry]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedKey = key.trim();
    const html = sanitizeRichText(editorRef.current?.innerHTML ?? content);

    if (!trimmedKey) {
      setError('Please enter a title for this entry.');
      titleInputRef.current?.focus();
      return;
    }

    if (!html.trim() || !editorRef.current?.innerText.trim()) {
      setError('Please enter some content.');
      editorRef.current?.focus();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(trimmedKey, html);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save this entry.',
      );
    } finally {
      setSaving(false);
    }
  }

  function applyFormatting(command: string) {
    editorRef.current?.focus();

    switch (command) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'insertUnorderedList':
      case 'insertOrderedList':
        document.execCommand(command, false);
        break;
      case 'formatBlock':
        document.execCommand('formatBlock', false, 'h3');
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      default:
        return;
    }

    setContent(editorRef.current?.innerHTML ?? '');
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="app-dialog entry-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">
              {entry ? 'EDIT ENTRY' : 'NEW ENTRY'}
            </p>
            <h2 id="entry-dialog-title">
              {/* {entry ? 'Edit entry' : 'Create an entry'} */}
            </h2>
          </div>

          <button
            className="icon-button"
            type="button"
            aria-label="Close editor"
            disabled={saving}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Title</span>
            <input
              ref={titleInputRef}
              type="text"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Give your entry a title"
              maxLength={200}
              disabled={saving || Boolean(entry)}
              required
            />
            {entry && (
              <small>The title cannot be changed when editing an entry.</small>
            )}
          </label>

          <div className="form-field">
            <span id="entry-content-label">Content</span>

            <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
              <button type="button" data-command="bold" aria-label="Bold" disabled={saving} onClick={() => applyFormatting('bold')}>
                <strong>B</strong>
              </button>
              <button type="button" data-command="italic" aria-label="Italic" disabled={saving} onClick={() => applyFormatting('italic')}>
                <em>I</em>
              </button>
              <button type="button" data-command="underline" aria-label="Underline" disabled={saving} onClick={() => applyFormatting('underline')}>
                <u>U</u>
              </button>
              <button type="button" data-command="insertUnorderedList" aria-label="Bulleted list" disabled={saving} onClick={() => applyFormatting('insertUnorderedList')}>
                • List
              </button>
              <button type="button" data-command="insertOrderedList" aria-label="Numbered list" disabled={saving} onClick={() => applyFormatting('insertOrderedList')}>
                1. List
              </button>
              <button type="button" data-command="formatBlock" aria-label="Heading" disabled={saving} onClick={() => applyFormatting('formatBlock')}>
                H
              </button>
              <button type="button" data-command="blockquote" aria-label="Quote" disabled={saving} onClick={() => applyFormatting('blockquote')}>
                “ ”
              </button>
            </div>

            <div
              ref={editorRef}
              className="rich-editor"
              contentEditable={!saving}
              suppressContentEditableWarning
              role="textbox"
              aria-labelledby="entry-content-label"
              aria-multiline="true"
              data-placeholder="Write something worth keeping..."
              onInput={(event) => setContent(event.currentTarget.innerHTML)}
            />
          </div>

          {error && (
            <p className="form-error validation-shake" role="alert">
              {error}
            </p>
          )}

          <footer className="dialog-footer">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Create entry'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
