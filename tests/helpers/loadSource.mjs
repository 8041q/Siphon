import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

export async function loadSource(relative, dependencies = {}, globals = {}) {
  const source = await readFile(new URL(`../../${relative}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: false },
  }).outputText;
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, {
    module, exports: module.exports, console, setTimeout, clearTimeout, AbortController,
    __DEV__: false, ...globals,
    require: name => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export function esStation(id = 1, lng = -8, lat = 37.5, price = 1.5) {
  return {
    type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { id: `es-${id}`, source: 'ES', brand: 'BP', address: 'Road', municipality: 'Town',
      fuels: { gasoline95: price, diesel: price }, province: 'Province', postalCode: '12345', schedule: 'L-D: 24H', extra: {} },
  };
}
