"use client";
import React from "react";
import Editor from "@monaco-editor/react";
import { Registry, parseRawGrammar, INITIAL, StateStack } from "vscode-textmate";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";
interface Cache {
  "source.c"?: string
  "source.c++"?: string
}
type Source = "source.c";
const PLISTS = {
  "source.c":
    "https://raw.githubusercontent.com/textmate/c.tmbundle/master/Syntaxes/C.plist",
};
const cache: Cache = {};
const getPlist = async function (scopeName: Source) {
  if (!cache[scopeName]) {
    cache[scopeName] = await fetch(PLISTS[scopeName]).then((response) =>
      response.text()
    );
  }
  return cache[scopeName];
};

const getRegistry = async function () {
  const res = await fetch("/onig.wasm");
  const vscodeOnigurumaLib = async () => await loadWASM(await res.arrayBuffer()).then(() => {
    return {
      createOnigScanner(sources: string[]) { return new OnigScanner(sources); },
      createOnigString(str: string) { return new OnigString(str); }
    };
  });
  return new Registry({
    onigLib: vscodeOnigurumaLib(),
    async loadGrammar(scopeName: Source) {
      if (PLISTS[scopeName]) {
        const data = await getPlist(scopeName);
        if(data) return parseRawGrammar(data);
      }
      return null;
    },
  });
};
const script = `#include <stdio.h>\nint main(){\n\treturn 0;\n}`;
class State {
  private _ruleStack: StateStack
  constructor(ruleStack: StateStack) { this._ruleStack = ruleStack; }
  get ruleStack() { return this._ruleStack; }
  clone() { return new State(this._ruleStack); }
  equals(other: State) { return other === this; }
}
export default function App() {
  const [result, setResult] = React.useState<any>("empty");
  const handleEditorDidMount = async () => {
    console.log("yess");

    const registry = await getRegistry();
    const grammar = await registry.loadGrammar("source.c");
    if (!grammar) return;
    window.monaco.languages.setTokensProvider("c", {
      getInitialState: () => INITIAL,
      tokenize: (line: string, state: State) => {
        const res = grammar.tokenizeLine(line, state.ruleStack);
        return {
          endState: new State(res.ruleStack),
          tokens: res.tokens.map((token) => ({
            ...token,
            scopes: token.scopes[token.scopes.length - 1],
          })),
        };
      },
    });

    //extra-dont care
    const r = script
      .split("\n")
      .filter((x) => x)
      .map((line) => {
        const tokenizeResult = grammar.tokenizeLine(line, INITIAL);
        return {
          line,
          tokens: tokenizeResult.tokens.map((token) => {
            const tokenText = line.substring(token.startIndex, token.endIndex);
            return {
              token: tokenText,
              scopes: token.scopes.join(" > "),
            };
          }),
        };
      });
    setResult(r);
  };

  return (
    <div className="App">
      <h2>Code:</h2>
      <Editor
        height="300px" // By default, it fully fits with its parent
        language={"c"}
        value={script}
        onMount={handleEditorDidMount}
      />{" "}
      <pre>
        <code>{script}</code>
      </pre>
      <h2>Result:</h2>
      <pre>
        <code>{JSON.stringify(result, null, 2)}</code>
      </pre>
    </div>
  );
}
