"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Quote,
  Minus,
  Link2,
  Unlink,
  Undo,
  Redo,
  Eraser,
  RotateCcw,
  Palette,
  Check,
  ChevronDown,
  Smile,
  Tag,
  Send,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface GmailRichEditorProps {
  initialSubject: string;
  initialHtml: string;
  recipientCount: number;
  recipientEmails?: string[];
  formMeta?: {
    projectName?: string;
    subjectCode?: string;
    deadline?: string;
    registrationLink?: string;
    coordinatorName?: string;
    departmentName?: string;
    collegeName?: string;
  };
  onSubjectChange: (subject: string) => void;
  onHtmlChange: (html: string) => void;
  onResetDefault: () => void;
  onSend?: () => void;
  onDiscard?: () => void;
  onViewRecipients?: () => void;
  isSending?: boolean;
}

// Gmail color palette swatches
const TEXT_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#0A2A5E", // KIT Navy
  "#1E5BD8", // KIT Blue
  "#B91C1C", // Dark Red
  "#D97706", // Dark Amber
  "#15803D", // Dark Green
  "#0f766e", // Teal
  "#4338ca", // Indigo
  "#1e293b", // Slate
];

const BG_HIGHLIGHT_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#fef2f2",
  "#fffbeb",
  "#f0fdf4",
  "#ecfeff",
  "#eff6ff",
  "#faf5ff",
  "#fed7aa",
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#e9d5ff",
  "#fbcfe8",
  "#fee2e2",
  "#e2e8f0",
];

const FONT_FAMILIES = [
  { name: "Sans Serif", value: "Arial, Helvetica, sans-serif" },
  { name: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { name: "Fixed Width", value: "'Courier New', Courier, monospace" },
  { name: "Wide", value: "'Arial Black', Gadget, sans-serif" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
];

const FONT_SIZES = [
  { name: "Small", commandValue: "2", px: "11px" },
  { name: "Normal", commandValue: "3", px: "13px" },
  { name: "Large", commandValue: "5", px: "18px" },
  { name: "Huge", commandValue: "6", px: "24px" },
];

const EMOJI_LIST = ["📌", "⚠️", "⏰", "📅", "🎓", "💻", "📢", "✅", "🔔", "✉️", "🎯", "🚀"];

export function GmailRichEditor({
  initialSubject,
  initialHtml,
  recipientCount,
  recipientEmails = [],
  formMeta,
  onSubjectChange,
  onHtmlChange,
  onResetDefault,
  onSend,
  onDiscard,
  onViewRecipients,
  isSending = false,
}: GmailRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(initialHtml);

  const [subject, setSubject] = useState(initialSubject);
  const [showFormattingBar, setShowFormattingBar] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTab, setColorPickerTab] = useState<"text" | "background">("text");
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Link Dialog
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("http://localhost:3000");
  const savedSelectionRef = useRef<Range | null>(null);

  // Active toolbar state
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    orderedList: false,
    unorderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });

  // Keep editor content in sync when initialHtml changes externally (e.g. Reset Template)
  useEffect(() => {
    if (editorRef.current && initialHtml !== lastHtmlRef.current) {
      editorRef.current.innerHTML = initialHtml;
      lastHtmlRef.current = initialHtml;
    }
  }, [initialHtml]);

  useEffect(() => {
    setSubject(initialSubject);
  }, [initialSubject]);

  // Initial populate
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml;
      lastHtmlRef.current = initialHtml;
    }
  }, []);

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    onSubjectChange(val);
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;
    onHtmlChange(currentHtml);
    checkActiveFormats();
  };

  const checkActiveFormats = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikeThrough"),
        orderedList: document.queryCommandState("insertOrderedList"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
      });
    } catch {}
  }, []);

  const executeCommand = (command: string, value: string = "") => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn("execCommand error:", e);
    }
    handleEditorInput();
  };

  // Save current text selection range before opening modal
  const saveCurrentSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      const selectedText = sel.toString();
      if (selectedText) {
        setLinkText(selectedText);
      }
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (typeof window === "undefined" || !savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const handleOpenLinkModal = () => {
    saveCurrentSelection();
    setShowLinkModal(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) return;
    editorRef.current?.focus();
    restoreSelection();

    const url = linkUrl.trim();
    if (linkText.trim()) {
      const html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1e5bd8; text-decoration: underline;">${linkText.trim()}</a>`;
      executeCommand("insertHTML", html);
    } else {
      executeCommand("createLink", url);
    }

    setShowLinkModal(false);
    setLinkText("");
    savedSelectionRef.current = null;
  };

  const handleInsertVariable = (tag: string, label: string) => {
    editorRef.current?.focus();
    let sampleValue = label;
    if (formMeta) {
      if (tag === "projectName") sampleValue = formMeta.projectName || label;
      if (tag === "subjectCode") sampleValue = formMeta.subjectCode || label;
      if (tag === "deadline") sampleValue = formMeta.deadline || label;
      if (tag === "registrationLink") sampleValue = formMeta.registrationLink || "http://localhost:3000";
      if (tag === "coordinatorName") sampleValue = formMeta.coordinatorName || label;
      if (tag === "departmentName") sampleValue = formMeta.departmentName || "Department of Computer Science & Engineering";
      if (tag === "collegeName") sampleValue = formMeta.collegeName || "Kanpur Institute of Technology";
    }

    const htmlSnippet = `<strong style="color: #0A2A5E;">${sampleValue}</strong>`;
    executeCommand("insertHTML", htmlSnippet);
    setShowVariableDropdown(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    executeCommand("insertHTML", emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-md flex flex-col overflow-hidden transition-all focus-within:border-[#0D3481]/80 focus-within:ring-2 focus-within:ring-[#0D3481]/15">
      {/* ─── GMAIL-STYLE WINDOW TOP BAR ─── */}
      <div className="px-4 py-2 bg-[#1E293B] text-white flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span className="font-bold tracking-wide">Compose Email Reminder</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            · {recipientCount} Pending Students
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-[10px] font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
            BCC Privacy Active
          </span>
        </div>
      </div>

      {/* ─── GMAIL RECIPIENTS (TO / BCC) BAR ─── */}
      <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-slate-500 uppercase text-[11px] tracking-wider w-9 shrink-0">
            Bcc:
          </span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0D3481] font-bold text-xs shadow-2xs">
            <span>{recipientCount} Recipient{recipientCount !== 1 ? "s" : ""}</span>
            <span className="text-[10px] font-mono bg-blue-100/80 text-blue-900 px-1.5 py-0.2 rounded-full">
              BCC Privacy Active
            </span>
          </div>
          {onViewRecipients && (
            <button
              type="button"
              onClick={onViewRecipients}
              className="text-[11px] font-bold text-[#0D3481] hover:text-[#071930] hover:bg-slate-100/80 cursor-pointer ml-1 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
            >
              <span>Manage / Add / Remove ({recipientCount})</span>
              <span>→</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-medium hidden md:inline shrink-0">
          Kanpur Institute of Technology
        </div>
      </div>

      {/* ─── GMAIL SUBJECT BAR ─── */}
      <div className="px-4 py-2.5 border-b border-slate-200/80 flex items-center gap-2">
        <span className="font-bold text-slate-500 uppercase text-[11px] tracking-wider w-9 shrink-0">
          Subj:
        </span>
        <input
          type="text"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          placeholder="Subject..."
          className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* ─── RICH TEXT CANVAS (CONTENTEDITABLE) ─── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onKeyUp={checkActiveFormats}
        onMouseUp={checkActiveFormats}
        className="p-5 min-h-[300px] max-h-[460px] overflow-y-auto text-xs text-slate-800 leading-relaxed font-sans focus:outline-hidden select-text [&_p]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5 [&_strong]:font-bold [&_strong]:text-slate-950 [&_a]:text-[#1E5BD8] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50/70 [&_blockquote]:py-2 [&_blockquote]:px-3 [&_blockquote]:my-3 [&_blockquote]:rounded-r-lg"
      />

      {/* ─── GMAIL-STYLE FORMATTING TOOLBAR ─── */}
      {showFormattingBar && (
        <div className="px-3 py-1.5 bg-slate-50/90 border-t border-slate-200/90 flex flex-wrap items-center gap-1 select-none text-xs">
          {/* Undo / Redo */}
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("undo");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("redo");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Font Family Dropdown */}
          <div className="relative">
            <button
              type="button"
              title="Font Family"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowFontDropdown(!showFontDropdown);
                setShowSizeDropdown(false);
                setShowColorPicker(false);
                setShowAlignDropdown(false);
              }}
              className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            >
              <span>Sans Serif</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showFontDropdown && (
              <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("fontName", f.value);
                      setShowFontDropdown(false);
                    }}
                    style={{ fontFamily: f.value }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Dropdown */}
          <div className="relative">
            <button
              type="button"
              title="Font Size"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowSizeDropdown(!showSizeDropdown);
                setShowFontDropdown(false);
                setShowColorPicker(false);
                setShowAlignDropdown(false);
              }}
              className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            >
              <span>Size</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSizeDropdown && (
              <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-100">
                {FONT_SIZES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("fontSize", s.commandValue);
                      setShowSizeDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.px}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Bold */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("bold");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer font-bold ${
              activeFormats.bold
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("italic");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFormats.italic
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            title="Underline (Ctrl+U)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("underline");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFormats.underline
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            title="Strikethrough"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("strikeThrough");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFormats.strikethrough
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Gmail-Style Color Picker (Text & Background Tabs) */}
          <div className="relative">
            <button
              type="button"
              title="Text / Background Color"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowColorPicker(!showColorPicker);
                setShowFontDropdown(false);
                setShowSizeDropdown(false);
                setShowAlignDropdown(false);
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <Palette className="w-3.5 h-3.5" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1E5BD8]" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 w-64 animate-in fade-in zoom-in-95 duration-100">
                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setColorPickerTab("text");
                    }}
                    className={`flex-1 py-1 rounded-md text-center transition-colors cursor-pointer ${
                      colorPickerTab === "text"
                        ? "bg-blue-50 text-[#0D3481]"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Text Color
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setColorPickerTab("background");
                    }}
                    className={`flex-1 py-1 rounded-md text-center transition-colors cursor-pointer ${
                      colorPickerTab === "background"
                        ? "bg-amber-50 text-amber-800"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    Highlight BG
                  </button>
                </div>

                {/* Swatches Grid */}
                <div className="grid grid-cols-8 gap-1.5">
                  {(colorPickerTab === "text" ? TEXT_COLORS : BG_HIGHLIGHT_COLORS).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (colorPickerTab === "text") {
                          executeCommand("foreColor", c);
                        } else {
                          executeCommand("hiliteColor", c);
                        }
                        setShowColorPicker(false);
                      }}
                      className="w-5 h-5 rounded border border-slate-300 hover:scale-125 transition-transform cursor-pointer shadow-2xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          {/* Alignment Dropdown */}
          <div className="relative">
            <button
              type="button"
              title="Align"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowAlignDropdown(!showAlignDropdown);
                setShowFontDropdown(false);
                setShowSizeDropdown(false);
                setShowColorPicker(false);
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showAlignDropdown && (
              <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  title="Align Left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("justifyLeft");
                    setShowAlignDropdown(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Center"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("justifyCenter");
                    setShowAlignDropdown(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Right"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("justifyRight");
                    setShowAlignDropdown(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Justify"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    executeCommand("justifyFull");
                    setShowAlignDropdown(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Numbered List */}
          <button
            type="button"
            title="Numbered List"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("insertOrderedList");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFormats.orderedList
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Bulleted List */}
          <button
            type="button"
            title="Bulleted List"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("insertUnorderedList");
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeFormats.unorderedList
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Decrease Indent */}
          <button
            type="button"
            title="Decrease Indent"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("outdent");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Outdent className="w-3.5 h-3.5" />
          </button>

          {/* Increase Indent */}
          <button
            type="button"
            title="Increase Indent"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("indent");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Indent className="w-3.5 h-3.5" />
          </button>

          {/* Quote */}
          <button
            type="button"
            title="Quote Block"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("formatBlock", "blockquote");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Horizontal Line */}
          <button
            type="button"
            title="Insert Horizontal Divider"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("insertHorizontalRule");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            title="Clear Formatting (Remove style)"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("removeFormat");
            }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── GMAIL-STYLE BOTTOM ACTION BAR (SEND, ICONS, TRASH) ─── */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left Side: Blue Send Button & Utility Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Main Gmail Blue Send Pill */}
          {onSend && (
            <button
              type="button"
              disabled={isSending || recipientCount === 0}
              onClick={onSend}
              className="px-5 py-2 rounded-full bg-[#0B2545] hover:bg-[#071930] active:scale-98 text-white font-bold text-xs transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Reminders...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to {recipientCount} Students</span>
                </>
              )}
            </button>
          )}

          {/* Toggle Formatting Toolbar [A̲] */}
          <button
            type="button"
            title="Formatting Options"
            onClick={() => setShowFormattingBar(!showFormattingBar)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showFormattingBar
                ? "bg-slate-200 text-[#0D3481]"
                : "text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            <span className="font-serif font-black underline text-sm leading-none">A</span>
          </button>

          {/* Insert Link */}
          <button
            type="button"
            title="Insert Link (Ctrl+K)"
            onClick={handleOpenLinkModal}
            className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <Link2 className="w-4 h-4" />
          </button>

          {/* Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              title="Insert Emoji"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowVariableDropdown(false);
              }}
              className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute left-0 bottom-full mb-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                {EMOJI_LIST.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleInsertEmoji(em)}
                    className="w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-slate-100 cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Insert Template Variables Dropdown */}
          <div className="relative">
            <button
              type="button"
              title="Insert Dynamic Variable Tag"
              onClick={() => {
                setShowVariableDropdown(!showVariableDropdown);
                setShowEmojiPicker(false);
              }}
              className="px-2.5 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
            >
              <Tag className="w-3 h-3 text-[#0D3481]" />
              <span>Insert Tag</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showVariableDropdown && (
              <div className="absolute left-0 bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 min-w-[210px] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dynamic Placeholders
                </div>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("projectName", "Mini Project")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] cursor-pointer flex items-center justify-between"
                >
                  <span>Project Name</span>
                  <span className="font-mono text-[10px] text-slate-400">BCS751</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("subjectCode", "BCS751")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] cursor-pointer"
                >
                  Subject Code
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("deadline", "21 Oct 2026")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] cursor-pointer"
                >
                  Registration Deadline
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("registrationLink", "http://localhost:3000")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] cursor-pointer"
                >
                  Registration Link
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable("coordinatorName", "Rahul Singh (HOD)")}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0D3481] cursor-pointer"
                >
                  Coordinator / HOD Name
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Reset Template & Discard Trash */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetDefault}
            title="Restore official default template"
            className="text-[11px] font-bold text-slate-600 hover:text-[#0D3481] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-[#0D3481]" />
            <span>Reset Template</span>
          </button>

          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              title="Discard draft"
              className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── INSERT LINK MODAL (GMAIL DIALOG STYLE) ─── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-sm w-full space-y-3.5 animate-in zoom-in-95 duration-100">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#0D3481]" />
              <span>Edit Link</span>
            </h4>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600">
                Text to display:
              </label>
              <input
                type="text"
                placeholder="Registration Portal Link"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600">
                To what URL should this link go?
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0D3481]/20 focus:border-[#0D3481]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={linkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#0D3481] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Test link</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-4 py-1.5 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-[#071930] cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>OK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
