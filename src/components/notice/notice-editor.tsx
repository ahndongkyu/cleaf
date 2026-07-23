"use client";

import { useCallback, useRef, useState } from "react";
import { Bold, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";

type Command = "bold" | "insertUnorderedList" | "insertOrderedList" | "formatBlock" | "undo" | "redo";

export function NoticeEditor({ initialContent = "", initialCharacters = 0 }: { initialContent?: string; initialCharacters?: number }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const selectionRef = useRef<Range | null>(null);
  const [content, setContent] = useState(initialContent);
  const [characters, setCharacters] = useState(initialCharacters);

  const initializeEditor = useCallback((editor: HTMLDivElement | null) => {
    editorRef.current = editor;
    if (!editor || initializedRef.current) return;
    editor.innerHTML = initialContent;
    initializedRef.current = true;
  }, [initialContent]);

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    const range = selectionRef.current;
    if (!selection || !range) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function syncContent() {
    const editor = editorRef.current;
    if (!editor) return;
    setContent(editor.innerHTML);
    setCharacters((editor.textContent ?? "").trim().length);
  }

  function run(command: Command, value?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    syncContent();
    rememberSelection();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    syncContent();
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-borderblue bg-card soft-card focus-within:border-accent">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-divider bg-tint/60 px-2 py-2 no-scrollbar">
        <select
          aria-label="글자 크기"
          defaultValue="p"
          onPointerDown={rememberSelection}
          onChange={(event) => {
            run("formatBlock", event.target.value);
            event.target.value = "p";
          }}
          className="h-8 shrink-0 rounded-lg border border-borderblue bg-card px-2 text-[11px] font-bold text-fg outline-none"
        >
          <option value="p">본문</option>
          <option value="h3">소제목</option>
          <option value="h2">큰 제목</option>
        </select>
        <ToolbarButton label="굵게" onClick={() => run("bold")}><Bold size={15} /></ToolbarButton>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-divider" />
        <ToolbarButton label="글머리 목록" onClick={() => run("insertUnorderedList")}><List size={15} /></ToolbarButton>
        <ToolbarButton label="번호 목록" onClick={() => run("insertOrderedList")}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="인용문" onClick={() => run("formatBlock", "blockquote")}><Quote size={15} /></ToolbarButton>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-divider" />
        <ToolbarButton label="실행 취소" onClick={() => run("undo")}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="다시 실행" onClick={() => run("redo")}><Redo2 size={15} /></ToolbarButton>
      </div>

      <div
        ref={initializeEditor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="공지 내용"
        data-placeholder="공지 내용을 입력하세요"
        onInput={() => {
          syncContent();
          rememberSelection();
        }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onPaste={handlePaste}
        className="notice-editor min-h-[260px] px-4 py-4 text-[14px] leading-7 text-body outline-none"
      />
      <input type="hidden" name="content" value={content} />
      <div className="flex items-center justify-between border-t border-divider px-3.5 py-2 text-[10.5px] text-subtle">
        <span>굵기와 제목 크기는 상세 화면에도 그대로 적용됩니다</span>
        <span className="tabular-nums">{characters.toLocaleString()}자</span>
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-card hover:text-accent">
      {children}
    </button>
  );
}
