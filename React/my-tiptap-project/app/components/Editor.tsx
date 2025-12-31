'use client';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Suggestion from '@tiptap/suggestion';
import { Extension, type Editor } from '@tiptap/core';
import tippy, { Instance as TippyInstance } from 'tippy.js';

type DropdownState = { selectedIndex: number };
type SlashContext = { editor: Editor; range: { from: number; to: number } };
type SuggestionItem = { title: string; command: (ctx: SlashContext) => void };
type SlashProps = {
  editor: Editor;
  clientRect: () => DOMRect;
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  event: KeyboardEvent;
};

const SlashCommand = Extension.create({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase();
          const all = [
            {
              title: 'Text',
              command: ({ editor, range }: SlashContext) =>
                editor.chain().focus().deleteRange(range).setParagraph().run(),
            },
            {
              title: 'Heading 1',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 1 })
                  .run(),
            },
            {
              title: 'Heading 2',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 2 })
                  .run(),
            },
            {
              title: 'Heading 3',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode('heading', { level: 3 })
                  .run(),
            },
            {
              title: 'Bullet List',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleBulletList()
                  .run(),
            },
            {
              title: 'Numbered List',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleOrderedList()
                  .run(),
            },
            {
              title: 'To-do list',
              command: ({ editor, range }: SlashContext) =>
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleTaskList()
                  .run(),
            },
          ];
          return all.filter((i) => i.title.toLowerCase().includes(q));
        },
        render: () => {
          let popup: TippyInstance | null = null;
          let container: HTMLElement | null = null;
          const state: DropdownState = { selectedIndex: 0 };
          const build = (
            items: SuggestionItem[],
            command: (item: SuggestionItem) => void
          ) => {
            if (!container) return;
            container.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className =
              'w-64 rounded-md border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900';
            const list = document.createElement('div');
            list.className = 'max-h-64 overflow-auto';
            items.forEach((item, i) => {
              const btn = document.createElement('button');
              btn.className =
                'flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800';
              if (i === state.selectedIndex)
                btn.className += ' bg-zinc-100 dark:bg-zinc-800';
              btn.textContent = item.title;
              btn.onclick = () => command(item);
              list.appendChild(btn);
            });
            if (items.length === 0) {
              const empty = document.createElement('div');
              empty.className =
                'px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400';
              empty.textContent = '无结果';
              list.appendChild(empty);
            }
            const hint = document.createElement('div');
            hint.className =
              'px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500';
            hint.textContent = '按 ↑ ↓ 选择，回车确认';
            wrapper.appendChild(list);
            wrapper.appendChild(hint);
            container.appendChild(wrapper);
          };
          return {
            onStart: (props: SlashProps) => {
              if (!props.editor) return;
              container = document.createElement('div');
              build(props.items, (item) => props.command(item));
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                content: container,
                showOnCreate: true,
                interactive: true,
                placement: 'bottom-start',
              });
            },
            onUpdate(props: SlashProps) {
              if (!container) return;
              build(props.items, (item) => props.command(item));
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },
            onKeyDown(props: SlashProps) {
              const event = props.event;
              if (event.key === 'Escape') {
                popup?.hide();
                return true;
              }
              if (event.key === 'ArrowUp') {
                state.selectedIndex =
                  (state.selectedIndex + props.items.length - 1) %
                  props.items.length;
                build(props.items, (item) => props.command(item));
                return true;
              }
              if (event.key === 'ArrowDown') {
                state.selectedIndex =
                  (state.selectedIndex + 1) % props.items.length;
                build(props.items, (item) => props.command(item));
                return true;
              }
              if (event.key === 'Enter') {
                const item = props.items[state.selectedIndex];
                if (item) props.command(item);
                return true;
              }
              return false;
            },
            onExit() {
              popup?.destroy();
              popup = null;
              container?.remove();
              container = null;
              state.selectedIndex = 0;
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ ...this.options.suggestion, editor: this.editor })];
  },
});

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: true,
      }),
      TaskList,
      TaskItem,
      Placeholder.configure({
        placeholder: '输入 / 打开命令菜单',
      }),
      SlashCommand,
    ],
    content: '',
    autofocus: 'end',
    immediatelyRender: false,
  });

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex-1 min-h-0 w-full bg-white p-6 text-zinc-900 outline-none dark:bg-zinc-950 dark:text-zinc-100 overflow-auto'>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
