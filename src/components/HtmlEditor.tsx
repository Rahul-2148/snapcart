// src/components/HtmlEditor.tsx
"use client";
import { useState } from "react";
import { Copy, Eye, Code, EyeOff } from "lucide-react";
import { toast } from "sonner";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function HtmlEditor({
  value,
  onChange,
  placeholder = "Write your email content...",
  height = "300px",
}: HtmlEditorProps) {
  const [viewMode, setViewMode] = useState<"editor" | "split" | "preview">(
    "editor",
  );

  const insertTag = (
    openTag: string,
    closeTag: string,
    text: string = "text",
  ) => {
    const textarea = document.getElementById(
      "html-editor-textarea",
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || text;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = before + openTag + selectedText + closeTag + after;
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + openTag.length;
        textarea.selectionEnd = start + openTag.length + selectedText.length;
      }, 0);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      insertTag(`<a href="${url}">`, "</a>", "Link text");
    }
  };

  const insertButton = () => {
    const text = prompt("Enter button text:") || "Click here";
    const url = prompt("Enter button URL:") || "#";
    insertTag(
      `<a href="${url}" style="display:inline-block;padding:12px 24px;background-color:#16a34a;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">`,
      "</a>",
      text,
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-gray-100 p-3 rounded-t-md border border-b-0 border-gray-300 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => insertTag("<h1>", "</h1>", "Heading")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-semibold"
          title="H1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => insertTag("<h2>", "</h2>", "Heading")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-semibold"
          title="H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertTag("<b>", "</b>", "Bold text")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertTag("<i>", "</i>", "Italic text")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertTag("<u>", "</u>", "Underline")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 underline"
          title="Underline"
        >
          U
        </button>
        <div className="w-px bg-gray-300"></div>
        <button
          type="button"
          onClick={() => insertTag("<p>", "</p>", "Paragraph")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          title="Paragraph"
        >
          P
        </button>
        <button
          type="button"
          onClick={() => insertTag("<ul><li>", "</li></ul>", "Item")}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          title="Insert Link"
        >
          🔗 Link
        </button>
        <button
          type="button"
          onClick={insertButton}
          className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          title="Insert Button"
        >
          🔘 Button
        </button>
        <div className="w-px bg-gray-300"></div>
        <button
          type="button"
          onClick={() => setViewMode("editor")}
          className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
            viewMode === "editor"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
          title="Code Editor"
        >
          <Code size={16} />
          Code
        </button>
        <button
          type="button"
          onClick={() => setViewMode("split")}
          className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
            viewMode === "split"
              ? "bg-green-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
          title="Split View"
        >
          <Eye size={16} />
          Split
        </button>
        <button
          type="button"
          onClick={() => setViewMode("preview")}
          className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
            viewMode === "preview"
              ? "bg-purple-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
          title="Preview Only"
        >
          <Eye size={16} />
          Preview
        </button>
      </div>

      {/* Editor and Preview */}
      <div className="flex gap-3">
        {(viewMode === "editor" || viewMode === "split") && (
          <div
            className={`${viewMode === "split" ? "flex-1" : "w-full"} overflow-hidden rounded-b-md border border-gray-300`}
            style={{ height: height }}
          >
            <div className="h-full flex flex-col">
              {/* Code Editor Header */}
              <div className="bg-[#2d2d2d] border-b border-gray-600 px-4 py-2 flex items-center justify-between">
                <span className="text-gray-400 text-xs font-mono">
                  HTML Editor (Colored)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(value);
                    toast.success("Code copied to clipboard!");
                  }}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                  title="Copy code"
                >
                  📋 Copy
                </button>
              </div>
              {/* Code Editor Content - Split view: highlighted on left, textarea on right */}
              <div className="flex-1 overflow-hidden flex">
                {/* Syntax Highlighted Preview */}
                <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                  <SyntaxHighlighter
                    language="html"
                    style={atomOneDark}
                    customStyle={{
                      margin: 0,
                      padding: "12px 16px",
                      backgroundColor: "#1e1e1e",
                      fontSize: "13px",
                      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                      lineHeight: "1.6",
                      width: "100%",
                      minHeight: "100%",
                    }}
                    wrapLines={true}
                  >
                    {value || placeholder}
                  </SyntaxHighlighter>
                </div>
              </div>
              {/* Hidden textarea for editing */}
              <textarea
                id="html-editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                spellCheck="false"
              />
            </div>
          </div>
        )}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            className={`${viewMode === "split" ? "flex-1" : "w-full"} border border-gray-300 rounded-b-md overflow-hidden bg-white`}
            style={{ height: height }}
          >
            <div className="h-full overflow-auto p-4">
              <div
                className="prose prose-sm max-w-none"
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded border border-blue-200">
        <p className="font-semibold text-blue-900">💡 HTML Tips:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Use toolbar buttons to insert common tags</li>
          <li>Select text before clicking a button to wrap it</li>
          <li>Use &lt;p&gt; for paragraphs, &lt;br&gt; for line breaks</li>
          <li>Check Preview to see how it looks</li>
          <li>
            Style example: &lt;span style="color:red;"&gt;Red text&lt;/span&gt;
          </li>
        </ul>
      </div>
    </div>
  );
}
