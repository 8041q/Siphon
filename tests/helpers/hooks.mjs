// A small hook/native adapter: exercise component behavior without starting Expo.
export function hookHarness() {
  const slots = [];
  let cursor = 0, dirty = false;
  const effects = [];
  const next = factory => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = factory();
    return index;
  };
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    createContext: value => {
      const context = { value };
      context.Provider = { context };
      return context;
    },
    useContext: context => context.value,
    memo: component => component,
    useState: initial => {
      const index = next(() => typeof initial === 'function' ? initial() : initial);
      return [slots[index], value => {
        const changed = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(changed, slots[index])) { slots[index] = changed; dirty = true; }
      }];
    },
    useRef: initial => slots[next(() => ({ current: initial }))],
    useMemo: (factory, dependencies) => {
      const index = next(() => ({ dependencies: undefined }));
      if (!sameDeps(slots[index].dependencies, dependencies)) slots[index] = { dependencies, value: factory() };
      return slots[index].value;
    },
    useCallback: (callback, dependencies) => react.useMemo(() => callback, dependencies),
    useEffect: (effect, dependencies) => {
      const index = next(() => ({ dependencies: undefined }));
      if (!sameDeps(slots[index].dependencies, dependencies)) {
        slots[index].dependencies = dependencies;
        effects.push(() => { slots[index].cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  const walk = node => !node || typeof node !== 'object' ? []
    : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const render = component => {
    cursor = 0; dirty = false;
    const tree = component();
    for (const node of walk(tree)) if (node.type?.context) node.type.context.value = node.props.value;
    return tree;
  };
  const flushEffects = () => { while (effects.length) effects.shift()(); };
  const unmount = () => { for (const slot of slots) slot?.cleanup?.(); };
  return { react, render, flushEffects, unmount, walk, get dirty() { return dirty; } };
}

export function fakeTimers() {
  let id = 0, now = 1000;
  const timers = new Map();
  const setTimeout = (callback, delay = 0) => { const handle = ++id; timers.set(handle, { callback, at: now + delay }); return handle; };
  const clearTimeout = handle => timers.delete(handle);
  const advance = ms => {
    now += ms;
    for (const [handle, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(handle); timer.callback(); }
    }
  };
  return { setTimeout, clearTimeout, advance, now: () => now, get size() { return timers.size; } };
}
