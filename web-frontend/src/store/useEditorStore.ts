// src/store/useEditorStore.ts
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

/** Types - adapted to match your existing types **/
export interface ComponentItem {
  id: number;
  name: string;
  object?: string;    // CSV "object" column (preferred key for counting)
  legend?: string;    // CSV legend
  suffix?: string;    // CSV suffix
  svg?: string;
  icon?: string;
  png?: string;
  grips?: Grip[];
  description?: string;
}

export interface Grip {
  x: number; // percentage from left
  y: number; // percentage from bottom
  type: "input" | "output";
}

export interface CanvasItem {
  id: number;
  name: string;
  objectKey?: string;      // object || name - used for counting
  label?: string;          // e.g. PRV01A/B or Insulation01
  legend?: string;
  suffix?: string;
  description?: string;
  svg?: string;
  png?: string;
  icon?: string;
  grips?: Grip[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  sequence: number;       // increasing counter for insertion order
  addedAt: number;        // timestamp
}

export interface Connection {
  id: number;
  sourceItemId: number;
  sourceGripIndex: number;
  targetItemId: number;
  targetGripIndex: number;
  waypoints: { x: number; y: number }[];
}

export interface CanvasState {
  items: CanvasItem[];
  connections: Connection[];
  counts: Record<string, number>; // counts keyed by objectKey
  sequenceCounter: number;        // increments each add to preserve order
}

/** Global store shape **/
interface EditorStore {
  editors: Record<string, CanvasState>;

  // lifecycle
  initEditor: (editorId: string, initial?: Partial<CanvasState>) => void;
  removeEditor: (editorId: string) => void;

  // item ops
  addItem: (editorId: string, component: ComponentItem, opts?: Partial<Pick<CanvasItem, "x" | "y" | "width" | "height" | "rotation">>) => CanvasItem;
  updateItem: (editorId: string, itemId: number, patch: Partial<CanvasItem>) => void;
  deleteItem: (editorId: string, itemId: number) => void;

  // connection ops
  addConnection: (editorId: string, conn: Omit<Connection, "id">) => Connection;
  updateConnection: (editorId: string, connectionId: number, patch: Partial<Connection>) => void;
  removeConnection: (editorId: string, connectionId: number) => void;

  // batch operations
  updateCanvasState: (editorId: string, state: CanvasState) => void;

  // helpers
  getEditorState: (editorId: string) => CanvasState | undefined;
  getItemsInOrder: (editorId: string) => CanvasItem[];
  resetCounts: (editorId: string) => void;

  // persistence hooks (optional)
  hydrateEditor: (editorId: string, state: CanvasState) => void;
  exportEditorJSON: (editorId: string) => any;
}

function padCount(n: number) {
  return n.toString().padStart(2, "0"); // "01", "02", ...
}

let globalIdCounter = Date.now(); // Initialize with current timestamp

export const useEditorStore = create<EditorStore>((set, get) => ({
  editors: {},

  initEditor: (editorId, initial = {}) =>
    set((s) => {
      if (s.editors[editorId]) return s; // already initialized
      return {
        editors: {
          ...s.editors,
          [editorId]: {
            items: initial.items || [],
            connections: initial.connections || [],
            counts: initial.counts || {},
            sequenceCounter: initial.sequenceCounter || 0,
          },
        },
      };
    }),

  removeEditor: (editorId) =>
    set((s) => {
      const next = { ...s.editors };
      delete next[editorId];
      return { editors: next };
    }),

  addItem: (editorId, component, opts = {}) => {
    // ensure editor exists
    const editor = get().editors[editorId] ?? {
      items: [],
      connections: [],
      counts: {},
      sequenceCounter: 0,
    };
    
    // create key for counts (prefer object, fallback to name)
    const key = component.object?.trim() || component.name.trim();

    const currentCount = editor.counts[key] ?? 0;
    const nextCount = currentCount + 1;

    const legend = component.legend ?? "";
    const suffix = component.suffix ?? "";

    const label = `${legend}${padCount(nextCount)}${suffix}`; // Legend + Count + Suffix

    const id = ++globalIdCounter; // Use incremental IDs for React keys
    const seq = (editor.sequenceCounter ?? 0) + 1;

    const newItem: CanvasItem = {
      id,
      name: component.name,
      objectKey: key,
      label,
      legend,
      suffix,
      description: component.description ?? "",
      svg: component.svg,
      png: component.png,
      icon: component.icon,
      grips: component.grips,
      x: typeof opts.x === "number" ? opts.x : 100,
      y: typeof opts.y === "number" ? opts.y : 100,
      width: typeof opts.width === "number" ? opts.width : 80,
      height: typeof opts.height === "number" ? opts.height : 40,
      rotation: typeof opts.rotation === "number" ? opts.rotation : 0,
      sequence: seq,
      addedAt: Date.now(),
    };

    // update store
    set((s) => ({
      editors: {
        ...s.editors,
        [editorId]: {
          items: [...(s.editors[editorId]?.items ?? editor.items), newItem],
          connections: s.editors[editorId]?.connections ?? editor.connections,
          counts: { ...(s.editors[editorId]?.counts ?? editor.counts), [key]: nextCount },
          sequenceCounter: seq,
        },
      },
    }));

    return newItem;
  },

  updateItem: (editorId, itemId, patch) => {
    set((s) => {
      const ed = s.editors[editorId];
      if (!ed) return s;
      return {
        editors: {
          ...s.editors,
          [editorId]: {
            ...ed,
            items: ed.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          },
        },
      };
    });
  },

  deleteItem: (editorId, itemId) => {
    set((s) => {
      const ed = s.editors[editorId];
      if (!ed) return s;
      
      // Also remove connections associated with this item
      const filteredConnections = ed.connections.filter(
        conn => conn.sourceItemId !== itemId && conn.targetItemId !== itemId
      );

      return {
        editors: {
          ...s.editors,
          [editorId]: {
            ...ed,
            items: ed.items.filter((it) => it.id !== itemId),
            connections: filteredConnections,
            // counts are NOT decremented to preserve label uniqueness history
          },
        },
      };
    });
  },

  addConnection: (editorId, conn) => {
    const id = ++globalIdCounter;
    const newConnection: Connection = { id, ...conn };
    
    set((s) => {
      const ed = s.editors[editorId] ?? { items: [], connections: [], counts: {}, sequenceCounter: 0 };
      return {
        editors: {
          ...s.editors,
          [editorId]: {
            ...ed,
            connections: [...ed.connections, newConnection],
          },
        },
      };
    });
    
    return newConnection;
  },

  updateConnection: (editorId, connectionId, patch) => {
    set((s) => {
      const ed = s.editors[editorId];
      if (!ed) return s;
      return {
        editors: {
          ...s.editors,
          [editorId]: {
            ...ed,
            connections: ed.connections.map((conn) => 
              conn.id === connectionId ? { ...conn, ...patch } : conn
            ),
          },
        },
      };
    });
  },

  removeConnection: (editorId, connectionId) => {
    set((s) => {
      const ed = s.editors[editorId];
      if (!ed) return s;
      return {
        editors: {
          ...s.editors,
          [editorId]: {
            ...ed,
            connections: ed.connections.filter((c) => c.id !== connectionId),
          },
        },
      };
    });
  },

  updateCanvasState: (editorId, state) => {
    set((s) => ({
      editors: {
        ...s.editors,
        [editorId]: state,
      },
    }));
  },

  getEditorState: (editorId) => get().editors[editorId],

  getItemsInOrder: (editorId) => {
    const ed = get().editors[editorId];
    if (!ed) return [];
    return [...ed.items].sort((a, b) => a.sequence - b.sequence);
  },

  resetCounts: (editorId) => {
    set((s) => {
      const ed = s.editors[editorId];
      if (!ed) return s;
      return {
        editors: {
          ...s.editors,
          [editorId]: { ...ed, counts: {} },
        },
      };
    });
  },

  hydrateEditor: (editorId, state) =>
    set((s) => ({
      editors: {
        ...s.editors,
        [editorId]: state,
      },
    })),

  exportEditorJSON: (editorId) => {
    const ed = get().editors[editorId];
    return ed ? JSON.parse(JSON.stringify(ed)) : null; // deep copy
  },
}));