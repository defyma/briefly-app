import type { ReactNode } from "react";

function renderInlineFormatting(text: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const content = token.slice(1, -1);
    const key = `${keyPrefix}-${partIndex++}`;

    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1.5 py-0.5 text-[0.95em] text-cyan-100"
        >
          {content}
        </code>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <strong key={key} className="font-semibold text-white">
          {content}
        </strong>,
      );
    } else if (token.startsWith("_")) {
      parts.push(
        <em key={key} className="italic">
          {content}
        </em>,
      );
    } else if (token.startsWith("~")) {
      parts.push(
        <span key={key} className="line-through opacity-80">
          {content}
        </span>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function RenderChatMessage({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i += 1;
      }
      blocks.push(
        <pre
          key={`code-${i}`}
          className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-cyan-100"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s+/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-cyan-300/40 pl-4 text-stone-300"
        >
          {quoteLines.map((quoteLine, index) => (
            <p key={`quote-line-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(quoteLine, `quote-${i}-${index}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^(\*|-)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\*|-)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\*|-)\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc space-y-2 pl-5">
          {items.map((item, index) => (
            <li key={`ul-item-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(item, `ul-${i}-${index}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal space-y-2 pl-5">
          {items.map((item, index) => (
            <li key={`ol-item-${index}`} className="whitespace-pre-wrap break-words">
              {renderInlineFormatting(item, `ol-${i}-${index}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^>\s+/.test(lines[i]) &&
      !/^(\*|-)\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap break-words">
        {renderInlineFormatting(paragraphLines.join("\n"), `p-${i}`)}
      </p>,
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}
