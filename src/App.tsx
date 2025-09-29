import { useEffect, useRef, useState } from "react";
import "./App.css";

import { loader } from "@monaco-editor/react";

import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Folder,
  Save,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

import { ScrollArea } from "@/components/ui/scroll-area";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import Editor, { type Monaco } from "@monaco-editor/react";
import { configureMonacoYaml } from "monaco-yaml";
import { schema_array, templates } from "./config";
import { Button } from "./components/ui/button";
import { Separator } from "@radix-ui/react-menubar";

function App() {
  const [open, setOpen] = useState(false);
  const [fileHandle, setFileHandle] = useState(null);
  const [content, setContent] = useState(
    "Welcome to the generic yaml schema editor!"
  );

  const [lastSavedContent, setLastSavedContent] = useState("");

  const [preSetupDone, setPreSetupDone] = useState(false);
  const [editor, setEditor] = useState<any>();
  const [currentSchema, setCurrentSchema] = useState(schema_array[0].filename);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [errors, setErrors] = useState(
    [] as {
      line: number;
      message: string;
      severity: number;
    }[]
  );

  const [openFilename, setOpenfilename] = useState("");

  useEffect(() => {
    document.title = `Editing ${openFilename.length == 0 ? "untitled file" : openFilename}`;
  }, [openFilename]);

  useEffect(() => {
    Promise.all([
      // load workers
      (async () => {
        const [
          { default: EditorWorker },
          // { default: JsonWorker },
          // { default: CssWorker },
          // { default: HtmlWorker },
          // { default: TsWorker },
          { default: YamlWorker },
        ] = await Promise.all(
          // vite static analysis
          // https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
          [
            import("./editor.worker?worker"),
            // import('monaco-editor/esm/vs/language/json/json.worker?worker'),
            // import('monaco-editor/esm/vs/language/css/css.worker?worker'),
            // import('monaco-editor/esm/vs/language/html/html.worker?worker'),
            // import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
            import("./yaml.worker?worker"),
          ]
        );

        // https://github.com/vitejs/vite/discussions/1791#discussioncomment-321046
        // @ts-ignore
        window.MonacoEnvironment = {
          getWorker(_moduleId: string, label: string) {
            switch (label) {
              case "editorWorkerService":
                return new editorWorker();
              case "yaml":
                return new YamlWorker();
              default:
                throw new Error(`Unknown label ${label}`);
            }
          },
        };

        loader.config({ monaco });
        loader.init();
      })(),
    ]).then(() => setPreSetupDone(true));
  });

  useEffect(() => {
    const blockExit = false;
    if (blockExit) {
      window.addEventListener("beforeunload", function (e) {
        e.preventDefault();
        setTimeout(function () {
          // Timeout to wait for user response
          setTimeout(function () {
            // Timeout to wait onunload, if not fired then this will be executed
            console.log("User stayed on the page.");
          }, 50);
        }, 50);
      });
    }

    const down = (e: KeyboardEvent) => {
      if (e.key == "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      if (e.key == "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveFile();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  async function setupMonaco(monaco: Monaco) {
    configureMonacoYaml(monaco, {
      enableSchemaRequest: true,
      schemas: schema_array.map((e) => e.schema as any),
    });
    console.log(schema_array);
    return monaco;
  }

  async function openFile() {
    // Close dialog first
    setOpen(false);

    // @ts-ignore
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: "YAML Files",
          accept: { "application/x-yaml": [".yaml", ".yml"] },
        },
      ],
    });
    setFileHandle(fileHandle);
    const file = await fileHandle.getFile();
    const newContent = await file.text();
    setContent(newContent);
    setLastSavedContent(newContent);

    switchSchema(currentSchema, newContent);
    toast.success("File read successfully!");
  }

  async function saveFile(createNew?: boolean) {
    let newFileHandle = null;
    if (!fileHandle || createNew) {
      // @ts-ignore
      newFileHandle = await window.showSaveFilePicker({
        suggestedName: "file.yaml",
        types: [
          {
            description: "YAML Files",
            accept: { "application/x-yaml": [".yaml", ".yml"] },
          },
        ],
      });
    }

    let localFileHandle = fileHandle ?? newFileHandle
    setFileHandle(localFileHandle)
    setOpenfilename(localFileHandle.name)

    // @ts-ignore
    const writable = await localFileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    setOpen(false);
    setLastSavedContent(content);
    toast.success("File saved successfully!");
  }

  // Allows switching schemas.
  async function switchSchema(schemaName: string, newContent?: string) {
    setOpen(false);
    setCurrentSchema(schemaName);

    let editorContent = newContent ?? content;

    editor.getModel()?.dispose();
    editor.setModel(
      monaco.editor.createModel(
        editorContent,
        undefined,
        monaco.Uri.parse(`file:///${schemaName}`)
      )
    );

    editor.getModel().setValue(editorContent + "\n");
    editor.getModel().setValue(editorContent);
    console.log(editor.getModel());
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-2 flex flex-row items-center gap-2">
        <Menubar className="grow-0 w-min">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={openFile}>
                <Folder />
                <span>Open a new file</span>
              </MenubarItem>

              <MenubarItem onSelect={() => saveFile()} disabled={!fileHandle}>
                <Save />
                <span>Save the current file</span>
              </MenubarItem>
              <MenubarItem onSelect={() => saveFile(true)}>
                <Save />
                <span>Save the current file as a new file</span>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Schema</MenubarTrigger>
            <MenubarContent>
              {schema_array.map((e) => (
                <MenubarItem
                  onSelect={() => switchSchema(e.filename)}
                  disabled={e.filename == currentSchema}
                >
                  <Settings />
                  <div className="flex flex-col gap-1">
                    <span>Switch to schema {e.displayName}</span>
                    <span className="text-xs">{e.description}</span>
                  </div>
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Templates</MenubarTrigger>
            <MenubarContent>
              {templates.map((e) => (
                <MenubarItem
                  onSelect={() => {
                    switchSchema(e.schema, e.content);
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span>Use schema {e.displayName}</span>
                    <span className="text-xs">{e.description}</span>
                  </div>
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <p className="font-light">
          {content == lastSavedContent
            ? "File saved."
            : "File contains modifications, please save."}
        </p>
        <DropdownMenu
          open={dropdownOpen}
          onOpenChange={(e) => setDropdownOpen(e)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant={errors.length == 0 ? "outline" : "destructive"}
              className="ml-auto"
            >
              {errors.length == 0
                ? "No errors!"
                : `${errors.length} error${errors.length != 1 ? "s" : ""}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <ScrollArea className="">
              {errors.map((e) => (
                <div>
                  <Button
                    variant="ghost"
                    size={"sm"}
                    onClick={() => {
                      console.log("hi");
                      setDropdownOpen(false);
                      editor.revealLine(e.line);
                      editor.setPosition({
                        lineNumber: e.line,
                        column: 0,
                      });
                    }}
                  >
                    Line {e.line}: {e.message}
                  </Button>
                  <Separator />
                </div>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Sonner />
      {preSetupDone && (
        <Editor
          className="w-screen"
          defaultLanguage="yaml"
          onChange={(e) => setContent(e ?? "")}
          theme="vs-dark"
          beforeMount={setupMonaco}
          onMount={(editor, monaco) => {
            setEditor(editor);
            editor.getModel()?.dispose();
            editor.setModel(
              monaco.editor.createModel(
                content,
                undefined,
                monaco.Uri.parse(`file:///${currentSchema}`)
              )
            );

            monaco.editor.onDidChangeMarkers(([uri]) => {
              const markers = monaco.editor.getModelMarkers({ resource: uri });
              setErrors(
                markers.map((e) => ({
                  line: e.startLineNumber,
                  message: e.message,
                  severity: e.severity,
                }))
              );
            });

            console.log(editor.getModel());
          }}
        />
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search.." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="File operations">
            <CommandItem onSelect={openFile}>
              <Folder />
              <span>Open a new File</span>
            </CommandItem>
            <CommandItem onSelect={() => saveFile()} disabled={!fileHandle}>
              <Save />
              <span>Save the current file</span>
            </CommandItem>
            <CommandItem onSelect={() => saveFile(true)}>
              <Save />
              <span>Save the current file as a new file</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Schema">
            {schema_array.map((e) => (
              <CommandItem
                onSelect={() => switchSchema(e.filename)}
                disabled={e.filename == currentSchema}
              >
                <Settings />
                <div className="flex flex-col gap-1">
                  <span>Switch to schema {e.displayName}</span>
                  <span className="text-xs">{e.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default App;
