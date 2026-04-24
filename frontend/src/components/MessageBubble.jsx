import { useState } from "react";
import {
  Copy,
  Check,
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

function parseContent(text) {
  // Very simple markdown-like renderer
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("```")) return null;
    if (/^#{1,3} /.test(line)) {
      const lvl = line.match(/^(#+)/)[1].length;
      const content = line.replace(/^#+\s/, "");
      const sizes = [
        "text-base font-bold",
        "text-sm font-bold",
        "text-sm font-semibold",
      ];
      return (
        <p key={i} className={`${sizes[lvl - 1]} text-slate-800 mt-2 mb-1`}>
          {content}
        </p>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 text-sm text-slate-700 list-disc">
          {renderInline(line.slice(2))}
        </li>
      );
    }
    if (/^\d+\. /.test(line)) {
      return (
        <li key={i} className="ml-4 text-sm text-slate-700 list-decimal">
          {renderInline(line.replace(/^\d+\. /, ""))}
        </li>
      );
    }
    if (line.startsWith("> ")) {
      return (
        <blockquote
          key={i}
          className="border-l-2 border-blue-300 pl-3 italic text-slate-600 text-sm my-1"
        >
          {line.slice(2)}
        </blockquote>
      );
    }
    if (line === "") return <div key={i} className="h-1.5" />;
    return (
      <p key={i} className="text-sm text-slate-700 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          className="bg-slate-100 text-blue-700 font-mono text-xs px-1 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800">
        <span className="text-xs text-slate-400 font-mono">code</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 text-xs p-3 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function renderMessage(content) {
  const blocks = [];
  let current = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  content.split("\n").forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        if (current.length) {
          blocks.push({ type: "text", lines: [...current] });
          current = [];
        }
        inCode = true;
        codeLang = line.slice(3);
        codeLines = [];
      } else {
        blocks.push({
          type: "code",
          code: codeLines.join("\n"),
          lang: codeLang,
        });
        inCode = false;
        codeLines = [];
      }
    } else if (inCode) {
      codeLines.push(line);
    } else {
      current.push(line);
    }
  });
  if (current.length) blocks.push({ type: "text", lines: current });

  return blocks.map((block, i) =>
    block.type === "code" ? (
      <CodeBlock key={i} code={block.code} />
    ) : (
      <div key={i}>{parseContent(block.lines.join("\n"))}</div>
    ),
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [liked, setLiked] = useState(null);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 animate-message-in ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
        ${
          isUser
            ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
            : "bg-gradient-to-br from-slate-100 to-blue-100 border border-blue-200"
        }`}
      >
        {isUser ? (
          <User size={14} />
        ) : (
          <Sparkles size={14} className="text-blue-600" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[76%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-500 text-white rounded-tr-md"
              : "bg-white border border-blue-100 shadow-sm rounded-tl-md"
          }`}
        >
          {isUser ? (
            <p className="text-sm text-white leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="space-y-0.5">{renderMessage(message.content)}</div>
          )}
        </div>

        {/* Meta row */}
        <div
          className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : ""}`}
        >
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={copy}
                className="p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
              <button
                onClick={() => setLiked(true)}
                className={`p-1 rounded-lg transition-colors ${liked === true ? "text-blue-500" : "text-slate-400 hover:text-blue-500"}`}
              >
                <ThumbsUp size={11} />
              </button>
              <button
                onClick={() => setLiked(false)}
                className={`p-1 rounded-lg transition-colors ${liked === false ? "text-red-400" : "text-slate-400 hover:text-red-400"}`}
              >
                <ThumbsDown size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
