import React from 'react';

export function renderMarkdown(text: string): React.ReactNode {
  if (!text?.trim()) return null;

  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let listItems: React.ReactElement[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let codeBlockLines: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let blockquoteLines: string[] = [];
  let inBlockquote = false;

  const flushList = (index: number) => {
    if (listItems.length > 0) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <div key={`list-${index}`} className="my-4">
          <ListTag
            className={`my-4 space-y-2 ${
              listType === 'ol' ? 'list-decimal' : 'list-disc'
            } ml-6`}
          >
            {listItems}
          </ListTag>
        </div>
      );
      listItems = [];
      listType = null;
    }
  };

  const flushCodeBlock = (index: number) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre
          key={`code-${index}`}
          className="bg-[hsl(var(--muted))] p-4 rounded-lg overflow-x-auto my-4"
        >
          <code
            className="text-sm font-mono text-[hsl(var(--foreground))]"
            dangerouslySetInnerHTML={{ __html: codeBlockLines.join('\n') }}
          />
        </pre>
      );
      codeBlockLines = [];
      codeLanguage = '';
    }
  };

  const flushBlockquote = (index: number) => {
    if (blockquoteLines.length > 0) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-[hsl(var(--primary))] pl-4 py-2 my-4 italic text-[hsl(var(--muted-foreground))]"
        >
          {blockquoteLines.map((line, i) => (
            <span
              key={i}
              className="block"
              dangerouslySetInnerHTML={{ __html: formatInline(line) }}
            />
          ))}
        </blockquote>
      );
      blockquoteLines = [];
    }
  };

  const formatInline = (text: string): string => {
    return (
      text
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(
          /`(.*?)`/g,
          '<code class="bg-[hsl(var(--muted))]/50 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
        )
        // Links
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-[hsl(var(--primary))] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Highlight
        .replace(
          /==(.+?)==/g,
          '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
        )
    );
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Code block detection
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        flushList(index);
        flushBlockquote(index);
        inCodeBlock = true;
        codeLanguage = trimmedLine.slice(3).trim();
      } else {
        inCodeBlock = false;
        flushCodeBlock(index);
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Blockquote detection
    if (trimmedLine.startsWith('>')) {
      flushList(index);
      inBlockquote = true;
      blockquoteLines.push(trimmedLine.slice(1).trim());
      return;
    } else if (inBlockquote) {
      inBlockquote = false;
      flushBlockquote(index);
    }

    // Headers (# H1, ## H2, etc.)
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushList(index);
      const level = headerMatch[1].length;
      const content = formatInline(headerMatch[2]);
      const sizes = {
        1: 'text-3xl font-bold mt-8 mb-4',
        2: 'text-2xl font-bold mt-6 mb-3',
        3: 'text-xl font-bold mt-6 mb-3',
        4: 'text-lg font-bold mt-6 mb-3',
        5: 'text-base font-bold mt-4 mb-2',
        6: 'text-sm font-bold mt-4 mb-2',
      };

      const className = `${
        sizes[level as keyof typeof sizes]
      } text-[hsl(var(--foreground))] tracking-tight first:mt-0`;

      if (level === 1)
        elements.push(
          <h1
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      else if (level === 2)
        elements.push(
          <h2
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      else if (level === 3)
        elements.push(
          <h3
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      else if (level === 4)
        elements.push(
          <h4
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      else if (level === 5)
        elements.push(
          <h5
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      else
        elements.push(
          <h6
            key={index}
            className={className}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );

      return;
    }

    // Bold headers (Q1: Title)
    if (trimmedLine.match(/^\*\*Q\d+:.+\*\*$/)) {
      flushList(index);
      elements.push(
        <h4
          key={index}
          className="font-bold text-lg text-[hsl(var(--foreground))] tracking-tight mt-6 mb-3 first:mt-0"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
      return;
    }

    // Horizontal rule
    if (trimmedLine.match(/^(---+|\*\*\*+|___+)$/)) {
      flushList(index);
      elements.push(
        <hr key={index} className="my-6 border-[hsl(var(--border))]" />
      );
      return;
    }

    // Ordered list (1. text, 2. text)
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== 'ol') {
        flushList(index);
        listType = 'ol';
      }
      const content = formatInline(orderedMatch[2]);
      listItems.push(
        <li
          key={index}
          className="leading-relaxed text-[hsl(var(--muted-foreground))]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
      return;
    }

    // Unordered list (* text, - text, + text)
    if (trimmedLine.match(/^[*\-+]\s+(.+)$/)) {
      if (listType !== 'ul') {
        flushList(index);
        listType = 'ul';
      }
      const content = formatInline(trimmedLine.slice(1).trim());
      listItems.push(
        <li
          key={index}
          className="leading-relaxed text-[hsl(var(--muted-foreground))]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
      return;
    }

    // Task list (- [ ] text, - [x] text)
    const taskMatch = trimmedLine.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      if (listType !== 'ul') {
        flushList(index);
        listType = 'ul';
      }
      const checked = taskMatch[1].toLowerCase() === 'x';
      const content = formatInline(taskMatch[2]);
      listItems.push(
        <li key={index} className="leading-relaxed flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1 cursor-default"
          />
          <span
            className={`${
              checked
                ? 'line-through text-[hsl(var(--muted-foreground))]/60'
                : 'text-[hsl(var(--muted-foreground))]'
            }`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </li>
      );
      return;
    }

    // Regular paragraph or empty line
    if (trimmedLine) {
      flushList(index);
      const formatted = formatInline(trimmedLine);
      elements.push(
        <span
          key={index}
          className="block text-[hsl(var(--muted-foreground))] leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    } else {
      flushList(index);
    }
  });

  // Flush any remaining items
  flushList(lines.length);
  flushCodeBlock(lines.length);
  flushBlockquote(lines.length);

  return <>{elements}</>;
}
