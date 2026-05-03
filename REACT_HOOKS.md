# React Hooks — Refresher for Backend Devs

> You wrote Angular and React 2-4 years ago. Your backend instincts are solid.
> This doc maps React hooks to mental models you already have.

---

## The Core Mental Model

In class components (old React / Angular-style), lifecycle was **method-based**:
```
constructor → componentDidMount → componentDidUpdate → componentWillUnmount
```

Hooks replace all of that with **function calls inside a function component**.
The component is just a function that React calls on every render.

```jsx
function MyComponent(props) {
  // hooks go here — same rules as function calls
  // return JSX
}
```

**Golden Rule:** Hooks must be called at the top level, never inside loops, conditions, or nested functions.

---

## useState — Local component state

**Backend analogy:** A field in a request-scoped object. It lives for the life of the component (like a request), and changing it causes a re-render (like triggering a response rebuild).

```jsx
const [count, setCount] = useState(0);
//     ^value  ^setter    ^initial value
```

- `count` is the **current snapshot** — it never changes mid-render
- `setCount(newVal)` schedules a re-render with the new value
- Calling setter with the **same reference** skips re-render (shallow equality)

```jsx
// Functional update — use when new state depends on old state
setCount(prev => prev + 1);

// Object state — must spread, React won't diff deep
const [user, setUser] = useState({ name: '', age: 0 });
setUser(prev => ({ ...prev, name: 'Abhay' })); // ✅
setUser(prev => { prev.name = 'Abhay'; return prev; }); // ❌ same ref, no re-render
```

---

## useEffect — Side effects & lifecycle

**Backend analogy:** Middleware / lifecycle hooks in a framework (like Angular's `ngOnInit`, `ngOnChanges`, `ngOnDestroy` — but unified).

```jsx
useEffect(() => {
  // runs AFTER render, in the browser
  // this is your "ngOnInit" territory

  return () => {
    // cleanup — runs before next effect OR on unmount
    // this is your "ngOnDestroy"
  };
}, [dependency, array]);
```

### Dependency array controls WHEN it fires:

| Array         | When it runs                              |
|---------------|-------------------------------------------|
| omitted       | After **every** render (usually wrong)    |
| `[]`          | Once on mount, cleanup on unmount         |
| `[a, b]`      | On mount + whenever `a` or `b` changes   |

```jsx
// Mount only — fetch initial data
useEffect(() => {
  fetchData().then(setData);
}, []);

// React to prop/state change — like ngOnChanges
useEffect(() => {
  console.log('userId changed:', userId);
  fetchUserData(userId);
}, [userId]);

// Cleanup subscriptions / timers
useEffect(() => {
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval); // cleanup
}, []);
```

**Common mistake:** Forgetting deps causes stale closures (the function captures an old value and never sees updates).

---

## useRef — Mutable value that doesn't trigger re-renders

**Backend analogy:** An instance variable on a singleton. It persists across calls but changing it has no side effects on the framework.

### Two use cases:

**1. DOM reference** (like Angular's `@ViewChild`):
```jsx
const videoRef = useRef(null);

useEffect(() => {
  videoRef.current.play(); // direct DOM access
}, []);

return <video ref={videoRef} />;
```

**2. Mutable value that survives re-renders without triggering them:**
```jsx
const intervalRef = useRef(null);

// Store the interval ID — changing it won't re-render
intervalRef.current = setInterval(tick, 1000);

// Later:
clearInterval(intervalRef.current);
```

**Key difference from useState:** `ref.current = x` is silent — no re-render. Use it for things the UI doesn't need to react to (timers, previous values, MediaRecorder instances, etc).

---

## useMemo — Memoize an expensive computed value

**Backend analogy:** A cache with an invalidation key. Recomputes only when the keys change.

```jsx
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}, [items]); // only recomputes when `items` changes
```

**When to use:**
- Expensive computation (sort, filter, transform of large arrays)
- Object/array you're passing as a prop to a memoized child (otherwise new reference every render = child always re-renders)

**When NOT to use:**
- Simple values — `useMemo(() => a + b, [a, b])` is pointless overhead
- Everything by default — profile first

```jsx
// ✅ Worth memoizing
const filteredBoxes = useMemo(() =>
  boxes.filter(b => b.visible && b.layer === activeLayer),
  [boxes, activeLayer]
);

// ❌ Not worth it
const label = useMemo(() => `Track ${id}`, [id]);
```

---

## useCallback — Memoize a function reference

**Backend analogy:** Same as useMemo but for functions. The function is only recreated when its dependencies change.

```jsx
const handleClick = useCallback((e) => {
  doSomething(value); // captures `value` from closure
}, [value]); // recreated when `value` changes
```

**Why this matters:** In JavaScript, `() => {}` creates a new function object on every call. If you pass that function as a prop, the child sees a new reference every render — breaking `memo`.

```jsx
// Without useCallback — child re-renders every time parent does
<Canvas onDraw={() => drawBox(id)} />

// With useCallback — child only re-renders when `id` changes
const handleDraw = useCallback(() => drawBox(id), [id]);
<Canvas onDraw={handleDraw} />
```

**Rule of thumb:** Use `useCallback` when passing functions to `memo`-wrapped components or into `useEffect` deps.

---

## memo — Memoize a whole component

**Backend analogy:** HTTP cache — skip reprocessing if the input hasn't changed.

```jsx
const MyComponent = memo(function MyComponent({ value, onClick }) {
  // only re-renders if `value` or `onClick` reference changes
  return <div onClick={onClick}>{value}</div>;
});
```

Without `memo`, a parent re-rendering always re-renders all children, even if props are identical.

**It's shallow comparison by default.** If you pass an object/array/function, you need `useMemo`/`useCallback` on the parent side to stabilize those references.

```jsx
// Parent
const style = useMemo(() => ({ color: 'red' }), []); // stable ref
const handleClick = useCallback(() => console.log('click'), []); // stable ref

<MyMemoizedChild style={style} onClick={handleClick} />
```

---

## How They Work Together

```jsx
const MyFeature = memo(function MyFeature({ trackId, onUpdate }) {
  // 1. Local state
  const [volume, setVolume] = useState(1);

  // 2. Ref for DOM / mutable value
  const audioRef = useRef(null);

  // 3. Side effect — sync to audio element when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 4. Memoize derived data
  const displayVolume = useMemo(() => Math.round(volume * 100), [volume]);

  // 5. Stable callback to pass down
  const handleVolumeChange = useCallback((e) => {
    setVolume(parseFloat(e.target.value));
    onUpdate(trackId, e.target.value);
  }, [trackId, onUpdate]);

  return (
    <div>
      <audio ref={audioRef} />
      <input type="range" value={volume} onChange={handleVolumeChange} />
      <span>{displayVolume}%</span>
    </div>
  );
});
```

---

## Quick Decision Guide

| Need to...                                | Use           |
|-------------------------------------------|---------------|
| Store UI state (triggers re-render)       | `useState`    |
| Run code after render / on mount          | `useEffect`   |
| Hold a DOM element or timer/interval ref  | `useRef`      |
| Hold any value without triggering render  | `useRef`      |
| Cache an expensive computation            | `useMemo`     |
| Stabilize a function reference            | `useCallback` |
| Skip re-rendering an unchanged child      | `memo`        |

---

## Pitfalls to Watch

**1. Stale closures in useEffect**
```jsx
// ❌ `count` is always 0 here — captured at mount
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);

// ✅ use ref for mutable latest value
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const id = setInterval(() => console.log(countRef.current), 1000);
  return () => clearInterval(id);
}, []);
```

**2. Infinite loops in useEffect**
```jsx
// ❌ `data` is new array every render → triggers effect → sets data → re-render
const [data, setData] = useState([]);
useEffect(() => { setData([...data, 1]); }, [data]);

// ✅ use functional update or remove the dep
useEffect(() => { setData(prev => [...prev, 1]); }, []); // run once
```

**3. Object/array deps that are always "new"**
```jsx
// ❌ `options` is a new object every render
useEffect(() => { init(options); }, [options]);

// ✅ destructure primitive deps
const { width, height } = options;
useEffect(() => { init({ width, height }); }, [width, height]);
```

**4. Over-memoizing**
`useMemo` and `useCallback` have overhead. Don't reach for them first — reach for them when you observe re-render issues or expensive recalculations.

---

## useMemo vs useCallback — The Real Difference

`useCallback` is literally just `useMemo` that returns the function itself:

```js
useCallback(fn, deps)
// is the same as
useMemo(() => fn, deps)
```

**useMemo** — memoizes the **result** of calling the function. Must `return`:
```jsx
const sorted = useMemo(() => {
  return [...items].sort(); // ← return required, or sorted = undefined
}, [items]);
```

**useCallback** — memoizes **the function itself**. No return needed in the outer call:
```jsx
const handleClick = useCallback((e) => {
  doSomething(e); // the function can return something or not — up to you
}, [dep]);
```

The function you pass to `useCallback` can return a value normally — that's just what the function does when called. `useCallback` doesn't care about that return value, it only cares about keeping the same function reference.

---

## Why React Creates a New Function Every Render

A React component is a plain JavaScript function React calls on every render. Every `const fn = () => {}` inside it creates a **new object in memory**:

```js
const a = () => {};
const b = () => {};
a === b // false — different objects, even with identical code
```

So without `useCallback`:
```
render 1: handleClick → memory address #001
render 2: handleClick → memory address #002  ← new object
child sees: #001 !== #002 → "prop changed" → re-renders unnecessarily
```

With `useCallback`:
```
render 1: handleClick → #001
render 2: handleClick → #001  ← same object returned from cache
child sees: #001 === #001 → skip re-render
```

---

## Passing Functions as Props

```jsx
onClick={handleClick}      // pass the function — React calls it on click
onClick={handleClick()}    // call it RIGHT NOW — pass the return value to onClick
onClick={() => handleClick(id)} // wrap to bake in an argument
```

The `()` wrapper is needed when you need to pass arguments:
```jsx
// ❌ calls immediately on render
<Button onClick={handleClick(id)} />

// ✅ runs only when clicked
<Button onClick={() => handleClick(id)} />
```

Think of it like a phone number vs making the call:
- `onClick={handleClick}` → here's my number, call me when clicked
- `onClick={handleClick()}` → I'm calling right now, here's what I said

---

## Why useEffect Exists (useCallback/useMemo Can't Replace It)

`useMemo` and `useCallback` are about **caching** — they don't *do* anything side-effecty.

`useEffect` is for **talking to the outside world** — things React can't do in a pure render:

```
fetch data from a server
start/stop a timer
talk to a video/audio/canvas element
listen to a websocket
write to localStorage
```

React's render must be pure and fast. `useEffect` is the escape hatch that runs *after* React is done rendering.

```jsx
// useEffect — starts MediaRecorder, can't do this during render
useEffect(() => {
  const recorder = new MediaRecorder(stream);
  recorder.start();
  return () => recorder.stop();
}, [stream]);

// useMemo — pure calculation, no outside world
const canvasSize = useMemo(() => ({
  width: boxes.reduce(...),
  height: boxes.reduce(...)
}), [boxes]);
```

```
useMemo      → remember a VALUE, no side effects
useCallback  → remember a FUNCTION, no side effects
useEffect    → talk to the OUTSIDE WORLD after render
```

---

## Async in useEffect

`useEffect` callback must return nothing or a cleanup function. `async` functions always return a Promise — so you can't make the callback itself async:

```jsx
// ❌ returns a Promise, React ignores it and warns
useEffect(async () => {
  const data = await fetch(url);
  setData(data);
}, []);

// ✅ define async inside, call immediately
useEffect(() => {
  async function load() {
    const data = await fetch(url);
    setData(data);
  }
  load();
}, []);
```

With cleanup to prevent setState on unmounted component:
```jsx
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetch(url);
    if (!cancelled) setData(data); // skip if unmounted
  }

  load();
  return () => { cancelled = true; };
}, []);
```

---

## What NOT to Put Where

```
render body   → pure only. No fetch, no setState, no timers
useMemo       → compute and return a value. Nothing else
useCallback   → define a function. Nothing else
useEffect     → side effects only. setState is ok but watch deps
```

```jsx
// ❌ setState inside useMemo — causes re-render inside render = infinite loop
const value = useMemo(() => {
  setCount(5);
  return count * 2;
}, [count]);

// ❌ setState in useEffect with the same value as dep = infinite loop
useEffect(() => {
  setCount(count + 1);
}, [count]);

// ✅ setState in useEffect with controlled deps
useEffect(() => {
  setData(initialValue);
}, []); // runs once
```

---

## Promises

A promise is JavaScript saying "I don't have the answer yet, I'll get back to you."

```
pending   → waiting
fulfilled → got the data
rejected  → something failed
```

Two ways to handle:
```js
// .then/.catch
fetch(url)
  .then(data => console.log(data))
  .catch(err => console.log(err));

// async/await — same thing, reads top to bottom
async function getData() {
  try {
    const data = await fetch(url);
    console.log(data);
  } catch (err) {
    console.log(err);
  }
}
```

JavaScript never actually pauses. While the promise is pending, JS keeps running other code. The `.then` callback queues up and runs later when data arrives.

---

## useContext — Avoid Prop Drilling

Prop drilling = passing a prop through components that don't need it just to reach a deep child.

```jsx
// 1. create context
const UserContext = createContext(null);

// 2. wrap tree with Provider
function App() {
  const [user, setUser] = useState({ name: 'Abhay' });
  return (
    <UserContext.Provider value={user}>
      <Layout /> {/* no props needed */}
    </UserContext.Provider>
  );
}

// 3. any child grabs it directly
function Profile() {
  const user = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

Good for: auth state, theme, language, global settings.
Not for: frequently changing values (every change re-renders all consumers), or everything by default.

---

## Other Hooks — Brief

**useReducer** — `useState` for complex related state. Instead of multiple `useState` calls, one reducer handles all updates:
```jsx
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'START_RECORDING' });
dispatch({ type: 'ADD_BOX', payload: newBox });
```

**Custom hooks** — extract repeated hook logic into a reusable function:
```jsx
function useMediaStream(constraints) {
  const [stream, setStream] = useState(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia(constraints).then(setStream);
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);
  return stream;
}

const stream = useMediaStream({ video: true }); // any component
```

**React Query** — replaces `useEffect` + `useState` for data fetching. The promise is still there, React Query just runs it and manages loading/error/data state for you:
```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetch(`/api/user/${id}`) // returns a promise
});
```

---

## Debugging Hooks

Use **React DevTools** browser extension:
- **Components tab** — see live state, props, refs for any component
- **Profiler tab** — record renders, see exactly why each component re-rendered

Quick console debugging:
```jsx
useEffect(() => {
  console.log('effect ran', someValue);
}, [someValue]);

console.log('rendered', { stateA, stateB, propX }); // track what changed
```
