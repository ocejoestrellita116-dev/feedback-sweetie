export type CursorMode = 'default' | 'hover' | 'drag' | 'hidden';

export interface ExperienceState {
  /** User has passed the enter/intro gate */
  entered: boolean;
  /** Global menu overlay is open */
  menuOpen: boolean;
  /** Current cursor visual mode */
  cursorMode: CursorMode;

  /* ── Pointer ── */
  pointerX: number;
  pointerY: number;
  /** Lerped pointer X (0-1, viewport-relative) */
  pointerLerpX: number;
  /** Lerped pointer Y (0-1, viewport-relative) */
  pointerLerpY: number;

  /* ── Capability flags (set once on mount) ── */
  isTouch: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;

  /** Hero scroll section is currently in viewport */
  heroActive: boolean;
}

export interface ExperienceActions {
  setEntered: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setCursorMode: (v: CursorMode) => void;
  setHeroActive: (v: boolean) => void;
  /** Smooth-scroll to a target (CSS selector or element) */
  scrollTo: (target: string | HTMLElement, options?: { offset?: number; duration?: number }) => void;
}

export type ExperienceContextValue = ExperienceState & ExperienceActions;
