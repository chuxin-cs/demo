'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
  type SuggestionOptions,
} from '@tiptap/suggestion';
import { Extension, type Editor as TiptapEditor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import DragHandle from '@tiptap/extension-drag-handle';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { defaultSelectionBuilder, yCursorPlugin } from '@tiptap/y-tiptap';

type Range = { from: number; to: number };
type SuggestionItem = {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
  command: (ctx: { editor: TiptapEditor; range: Range }) => void;
};

type EmojiItem = {
  id: string;
  title: string;
  emoji: string;
  description?: string;
  keywords?: string[];
  command: (ctx: { editor: TiptapEditor; range: Range }) => void;
};

const lowlight = createLowlight();
const SLASH_SUGGESTION_KEY = new PluginKey('slash-command');
const EMOJI_SUGGESTION_KEY = new PluginKey('emoji-command');

const CollaborationCursor = Extension.create({
  name: 'collaborationCursor',
  addOptions() {
    return {
      provider: null as WebsocketProvider | null,
      user: { name: 'User', color: '#3b82f6' } as { name: string; color: string },
      render: (u: { name: string; color: string }) => {
        const cursor = document.createElement('span');
        cursor.classList.add('collaboration-cursor__caret');
        cursor.style.borderLeftColor = u.color;

        const label = document.createElement('div');
        label.classList.add('collaboration-cursor__label');
        label.style.backgroundColor = u.color;
        label.insertBefore(document.createTextNode(u.name), null);
        cursor.insertBefore(label, null);

        return cursor;
      },
    };
  },
  addProseMirrorPlugins() {
    const provider = this.options.provider;
    if (!provider?.awareness) return [];
    provider.awareness.setLocalStateField('user', this.options.user);
    return [
      yCursorPlugin(provider.awareness, {
        cursorBuilder: this.options.render,
        selectionBuilder: defaultSelectionBuilder,
      }),
    ];
  },
});

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function createListRenderer<TItem extends { id: string; title: string; description?: string }>() {
  let popup: TippyInstance | null = null;
  let container: HTMLElement | null = null;
  let selectedIndex = 0;
  let latestProps: SuggestionProps<TItem, TItem> | null = null;

  const build = () => {
    if (!container || !latestProps) return;

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className =
      'w-72 rounded-md border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900';

    const list = document.createElement('div');
    list.className = 'max-h-72 overflow-auto';

    latestProps.items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className =
        'flex w-full items-start gap-3 rounded-sm px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800';
      if (i === selectedIndex) btn.className += ' bg-zinc-100 dark:bg-zinc-800';

      const left = document.createElement('div');
      left.className = 'flex-1';

      const title = document.createElement('div');
      title.className = 'text-sm font-medium text-zinc-900 dark:text-zinc-100';
      title.textContent = item.title;

      left.appendChild(title);

      if (item.description) {
        const desc = document.createElement('div');
        desc.className = 'text-xs text-zinc-500 dark:text-zinc-400';
        desc.textContent = item.description;
        left.appendChild(desc);
      }

      btn.appendChild(left);
      btn.onclick = () => latestProps?.command(item);
      list.appendChild(btn);
    });

    if (latestProps.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400';
      empty.textContent = '无结果';
      list.appendChild(empty);
    }

    const hint = document.createElement('div');
    hint.className = 'px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500';
    hint.textContent = '↑ ↓ 选择，回车确认，Esc 关闭';

    wrapper.appendChild(list);
    wrapper.appendChild(hint);
    container.appendChild(wrapper);
  };

  const move = (delta: number) => {
    if (!latestProps) return;
    if (latestProps.items.length === 0) return;
    selectedIndex = (selectedIndex + delta + latestProps.items.length) % latestProps.items.length;
    build();
  };

  const choose = () => {
    if (!latestProps) return;
    const item = latestProps.items[selectedIndex];
    if (item) latestProps.command(item);
  };

  return {
    onStart: (props: SuggestionProps<TItem, TItem>) => {
      latestProps = props;
      selectedIndex = 0;

      const rect = props.clientRect?.();
      if (!rect) return;

      container = document.createElement('div');
      build();
      popup = tippy(document.body, {
        getReferenceClientRect: () => rect,
        content: container,
        showOnCreate: true,
        interactive: true,
        placement: 'bottom-start',
        appendTo: () => document.body,
      });
    },
    onUpdate: (props: SuggestionProps<TItem, TItem>) => {
      latestProps = props;
      selectedIndex = 0;

      const rect = props.clientRect?.();
      if (!rect) return;

      build();
      popup?.setProps({
        getReferenceClientRect: () => rect,
      });
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        popup?.hide();
        return true;
      }
      if (props.event.key === 'ArrowUp') {
        move(-1);
        return true;
      }
      if (props.event.key === 'ArrowDown') {
        move(1);
        return true;
      }
      if (props.event.key === 'Enter') {
        choose();
        return true;
      }
      return false;
    },
    onExit: () => {
      popup?.destroy();
      popup = null;
      container?.remove();
      container = null;
      latestProps = null;
      selectedIndex = 0;
    },
  };
}

function createSuggestionExtension<TItem extends { id: string; title: string; description?: string }>(
  name: string,
  suggestion: Omit<SuggestionOptions<TItem, TItem>, 'editor'>
) {
  return Extension.create({
    name,
    addOptions() {
      return {
        suggestion,
      };
    },
    addProseMirrorPlugins() {
      return [Suggestion({ ...this.options.suggestion, editor: this.editor })];
    },
  });
}

const EMOJIS: Array<{ id: string; title: string; emoji: string; keywords: string[] }> = [
  { id: 'smile', title: 'smile', emoji: '😄', keywords: ['happy', 'joy'] },
  { id: 'grin', title: 'grin', emoji: '😁', keywords: ['happy'] },
  { id: 'wink', title: 'wink', emoji: '😉', keywords: ['flirt'] },
  { id: 'thinking', title: 'thinking', emoji: '🤔', keywords: ['hmm'] },
  { id: 'fire', title: 'fire', emoji: '🔥', keywords: ['hot'] },
  { id: 'sparkles', title: 'sparkles', emoji: '✨', keywords: ['magic'] },
  { id: 'rocket', title: 'rocket', emoji: '🚀', keywords: ['ship'] },
  { id: 'thumbsup', title: 'thumbsup', emoji: '👍', keywords: ['like', 'ok'] },
  { id: 'clap', title: 'clap', emoji: '👏', keywords: ['praise'] },
  { id: 'eyes', title: 'eyes', emoji: '👀', keywords: ['look'] },
  { id: 'check', title: 'check', emoji: '✅', keywords: ['done'] },
  { id: 'warning', title: 'warning', emoji: '⚠️', keywords: ['alert'] },
  { id: 'bulb', title: 'bulb', emoji: '💡', keywords: ['idea'] },
  { id: 'memo', title: 'memo', emoji: '📝', keywords: ['note'] },
  { id: 'link', title: 'link', emoji: '🔗', keywords: ['url'] },
];

function createSlashItems(options: {
  onAskAi: () => void;
  onToggleCollab: () => void;
  collabEnabled: boolean;
}) {
  const { onAskAi, onToggleCollab, collabEnabled } = options;

  const items: SuggestionItem[] = [
    {
      id: 'text',
      title: 'Text',
      description: '普通文本',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      id: 'h1',
      title: 'Heading 1',
      description: '一级标题',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      description: '二级标题',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      description: '三级标题',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    },
    {
      id: 'bullet',
      title: 'Bullet List',
      description: '无序列表',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      id: 'ordered',
      title: 'Numbered List',
      description: '有序列表',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      id: 'todo',
      title: 'To-do List',
      description: '待办列表',
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      id: 'quote',
      title: 'Quote',
      description: '引用',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      id: 'codeblock',
      title: 'Code Block',
      description: '代码块',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: '分隔线',
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      id: 'image',
      title: 'Image',
      description: '插入图片 URL',
      command: ({ editor, range }) => {
        const url = window.prompt('Image URL');
        if (!url) return;
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      },
    },
    {
      id: 'table',
      title: 'Table',
      description: '插入 3×3 表格',
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      id: 'ai',
      title: 'Ask AI',
      description: 'AI 辅助写作（可插入结果）',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onAskAi();
      },
    },
    {
      id: 'collab',
      title: collabEnabled ? 'Collaboration: On' : 'Collaboration: Off',
      description: '切换协作同步',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onToggleCollab();
      },
    },
  ];

  return items;
}

export default function Editor() {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);

  const [collabEnabled, setCollabEnabled] = useState(true);
  const [collabStatus, setCollabStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting'
  );

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const roomId = useMemo(() => {
    if (typeof window === 'undefined') return 'notion-demo';
    const url = new URL(window.location.href);
    return url.searchParams.get('room') || 'notion-demo';
  }, []);

  const user = useMemo(() => {
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
    return {
      name: `User-${Math.floor(Math.random() * 9999)}`,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, []);

  const [collabFragment, setCollabFragment] = useState<Y.XmlFragment | null>(null);
  const [collabProvider, setCollabProvider] = useState<WebsocketProvider | null>(null);

  const filteredEmojis = useMemo(() => {
    const q = normalizeQuery(emojiQuery);
    if (!q) return EMOJIS;
    return EMOJIS.filter((e) => {
      const haystack = [e.title, ...(e.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [emojiQuery]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (emojiPopoverRef.current?.contains(target)) return;
      setEmojiOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [emojiOpen]);

  useEffect(() => {
    if (!collabEnabled) {
      providerRef.current?.disconnect();
      providerRef.current?.destroy();
      providerRef.current = null;
      setCollabProvider(null);
      setCollabFragment(null);
      setCollabStatus('disconnected');
      return;
    }

    if (!ydocRef.current) ydocRef.current = new Y.Doc();
    const doc = ydocRef.current;
    setCollabFragment(doc.getXmlFragment('default'));

    const provider = new WebsocketProvider('wss://demos.yjs.dev', roomId, doc, {
      connect: true,
    });

    providerRef.current = provider;
    setCollabProvider(provider);
    setCollabStatus('connecting');

    const onStatus = (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setCollabStatus(event.status);
    };

    provider.on('status', onStatus);
    provider.awareness.setLocalStateField('user', user);

    return () => {
      provider.off('status', onStatus);
      provider.disconnect();
      provider.destroy();
      providerRef.current = null;
      setCollabProvider(null);
    };
  }, [collabEnabled, roomId, user]);

  const slashExtension = useMemo(() => {
    return createSuggestionExtension<SuggestionItem>('slash-command', {
      char: '/',
      pluginKey: SLASH_SUGGESTION_KEY,
      startOfLine: true,
      command: ({ editor, range, props }) => props.command({ editor, range }),
      items: ({ query }) => {
        const q = normalizeQuery(query);
        const all = createSlashItems({
          onAskAi: () => setAiOpen(true),
          onToggleCollab: () => setCollabEnabled((v) => !v),
          collabEnabled,
        });

        if (!q) return all;
        return all.filter((item) => {
          const haystack = [item.title, item.description, ...(item.keywords ?? [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
      },
      render: () => createListRenderer<SuggestionItem>(),
    });
  }, [collabEnabled]);

  const emojiExtension = useMemo(() => {
    return createSuggestionExtension<EmojiItem>('emoji-command', {
      char: ':',
      pluginKey: EMOJI_SUGGESTION_KEY,
      startOfLine: false,
      allowSpaces: false,
      command: ({ editor, range, props }) => props.command({ editor, range }),
      items: ({ query }) => {
        const q = normalizeQuery(query);
        const base: EmojiItem[] = EMOJIS.map((e) => ({
          id: e.id,
          title: `${e.emoji}  :${e.title}:`,
          emoji: e.emoji,
          keywords: e.keywords,
          description: e.title,
          command: ({ editor, range }) =>
            editor.chain().focus().deleteRange(range).insertContent(`${e.emoji} `).run(),
        }));

        if (!q) return base;
        return base.filter((item) => {
          const haystack = [item.title, item.description, ...(item.keywords ?? [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
      },
      render: () => createListRenderer<EmojiItem>(),
    });
  }, []);

  const collabReady = collabEnabled && !!collabFragment && !!collabProvider;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure(collabReady ? { undoRedo: false } : {}),
        Underline,
        Highlight,
        Typography,
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Image.configure({
          inline: false,
          allowBase64: true,
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
          lowlight,
        }),
        Dropcursor,
        Gapcursor,
        DragHandle.configure({
          render: () => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className =
              'flex h-8 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';
            el.style.cursor = 'grab';
            el.innerHTML =
              '<span style="display:block;line-height:1;font-size:16px;">⋮⋮</span>';
            return el;
          },
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder: '输入 / 打开命令菜单，输入 : 打开表情',
        }),
        ...(collabReady
          ? [
              Collaboration.configure({
                fragment: collabFragment,
                provider: collabProvider,
              }),
              CollaborationCursor.configure({ provider: collabProvider, user }),
            ]
          : []),
        slashExtension,
        emojiExtension,
      ],
      content: '',
      autofocus: 'end',
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            'ProseMirror min-h-full w-full outline-none selection:bg-blue-200 dark:selection:bg-blue-800',
        },
      },
    },
    [collabFragment, collabProvider, slashExtension, emojiExtension, collabEnabled, collabReady, user]
  );

  useEffect(() => {
    if (!editor) return;

    const el = document.createElement('div');
    el.className =
      'flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900';

    const popup = tippy(document.body, {
      trigger: 'manual',
      interactive: true,
      placement: 'top',
      content: el,
      appendTo: () => document.body,
      getReferenceClientRect: () => new DOMRect(0, 0, 0, 0),
    });

    const build = () => {
      el.innerHTML = '';
      const mk = (label: string, active: boolean, onClick: () => void) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'rounded px-2 py-1 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800';
        if (active) btn.className += ' bg-zinc-100 dark:bg-zinc-800';
        btn.textContent = label;
        btn.onclick = () => {
          onClick();
          editor.chain().focus().run();
        };
        el.appendChild(btn);
      };

      mk('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run());
      mk('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run());
      mk('U', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run());
      mk('S', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run());
      mk('H', editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run());
      mk('Link', editor.isActive('link'), () => {
        const previousUrl = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL', previousUrl || '');
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      });
    };

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        popup.hide();
        return;
      }

      build();
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);

      const top = Math.min(start.top, end.top);
      const left = (start.left + end.right) / 2;

      popup.setProps({
        getReferenceClientRect: () => new DOMRect(left, top, 0, 0),
      });

      popup.show();
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      popup.destroy();
      el.remove();
    };
  }, [editor]);

  const runAi = async () => {
    if (!editor) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          context: editor.getText().slice(0, 6000),
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAiResult(data.text || '');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const insertAiResult = () => {
    if (!editor || !aiResult) return;
    editor.chain().focus().insertContent(aiResult).run();
    setAiOpen(false);
    setAiPrompt('');
    setAiResult(null);
    setAiError(null);
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl || '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-black">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={() => {
              if (!editor) return;
              editor.commands.undo();
            }}
          >
            Undo
          </button>
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={() => {
              if (!editor) return;
              editor.commands.redo();
            }}
          >
            Redo
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('bold') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            Bold
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('italic') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('underline') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            Underline
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('strike') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            Strike
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('code') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            Code
          </button>
          <button
            className={`rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
              editor?.isActive('blockquote') ? 'bg-zinc-100 dark:bg-zinc-900' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            Quote
          </button>
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={setLink}
          >
            Link
          </button>
          <div className="relative" ref={emojiPopoverRef}>
            <button
              className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              onClick={() => setEmojiOpen((v) => !v)}
              type="button"
            >
              Emoji
            </button>
            {emojiOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-md border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                <input
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="搜索表情，例如：smile"
                  value={emojiQuery}
                  onChange={(e) => setEmojiQuery(e.target.value)}
                  autoFocus
                />
                <div className="mt-2 max-h-56 overflow-auto">
                  {filteredEmojis.length === 0 ? (
                    <div className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">无结果</div>
                  ) : (
                    <div className="grid grid-cols-8 gap-1">
                      {filteredEmojis.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          title={`:${e.title}:`}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            if (!editor) return;
                            editor.chain().focus().insertContent(`${e.emoji} `).run();
                            setEmojiOpen(false);
                            setEmojiQuery('');
                          }}
                        >
                          {e.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={() => setAiOpen(true)}
          >
            AI
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full border border-zinc-200 px-2 py-1 dark:border-zinc-800">
            room: {roomId}
          </span>
          <span
            className={`rounded-full border px-2 py-1 dark:border-zinc-800 ${
              collabEnabled ? 'border-zinc-200' : 'border-zinc-200 opacity-60'
            }`}
          >
            collab: {collabEnabled ? collabStatus : 'off'}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-auto bg-white p-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <EditorContent editor={editor} />
      </div>

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI</div>
              <button
                className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  setAiOpen(false);
                  setAiLoading(false);
                  setAiError(null);
                  setAiResult(null);
                }}
              >
                关闭
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="输入你的指令，例如：把这段话改写得更清晰"
                className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={aiLoading || !aiPrompt.trim()}
                onClick={runAi}
              >
                {aiLoading ? '生成中…' : '生成'}
              </button>
            </div>
            {aiError && <div className="mt-3 text-sm text-red-600">{aiError}</div>}
            {aiResult && (
              <div className="mt-3">
                <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">结果</div>
                <div className="max-h-64 overflow-auto rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                  {aiResult}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setAiResult(null);
                      setAiError(null);
                    }}
                  >
                    清空
                  </button>
                  <button
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    onClick={insertAiResult}
                  >
                    插入到光标
                  </button>
                </div>
              </div>
            )}
            {!aiResult && (
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                无密钥也可运行：后端默认返回示例文本；配置环境变量后可接入真实模型。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
