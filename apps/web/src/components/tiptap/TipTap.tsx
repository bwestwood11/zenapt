"use client";

import TextAlign from "@tiptap/extension-text-align";
import { useEditor, EditorContent, EditorContext } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "react";
import Blockquote from "@tiptap/extension-blockquote";
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji";
import DragHandle from "@tiptap/extension-drag-handle-react";
import Link from "@tiptap/extension-link";
import { MenuBar } from "./menu";

type Props = {
  initialContent: string;
};

export const SimpleEditor = ({
  initialContent,
  onChange
}: {
  initialContent: string;
  onChange: (props: {html:string, json:Object, text:string}) => void
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Blockquote,
      Emoji.configure({
        emojis: gitHubEmojis,
        enableEmoticons: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
        linkOnPaste: true,
      }),
    ], // define your extension array
    content: initialContent, // initial content
    onUpdate(props) {
      const editor = props.editor
      const html = editor.getHTML()
      const json = editor.getJSON()
      const text = editor.getText()

      onChange({html, json, text})
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none  p-4",
      },
    },
    immediatelyRender: false,
    
  });

  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
        <div className="border-border border relative overflow-y-hidden rounded-sm h-full ">
          <MenuBar />
          <EditorContent className="flex-1 z-10" editor={editor} />
        </div>
    </EditorContext.Provider>
  );
};

const Tiptap = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Blockquote,
      Emoji.configure({
        emojis: gitHubEmojis,
        enableEmoticons: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
        linkOnPaste: true,
      }),
    ], // define your extension array
    content: "<p>Hello World!</p>", // initial content
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none  p-4",
      },
    },
  });

  // Memoize the provider value to avoid unnecessary re-renders
  const providerValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={providerValue}>
      <MenuBar />

      <EditorContent className="w-full h-full" editor={editor} />
    </EditorContext.Provider>
  );
};

export { Tiptap };
