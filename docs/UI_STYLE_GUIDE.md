
# UI/UX Style Guide: Orbital Sniper

## 1. Design Philosophy: "Holographic Tactical"
The interface is designed to resemble a Heads-Up Display (HUD) projected onto a starfighter cockpit or a neural link interface.

*   **Immersion**: UI elements should feel like they exist *on top of* the void, not on a flat page.
*   **High Contrast**: Bright neon accents against deep black backgrounds to ensure readability against the starfield.
*   **Data-Dense**: Use of monospace fonts and tabular numbers implies precision and technical sophistication.
*   **Floating Elements**: Components should float without solid distinct containers where possible, using gradients and blurs to ground them.

---

## 2. Color System

### Primary Backgrounds
*   **Void Black**: `bg-black` (#000000) - The canvas.
*   **Glass Panel**: `bg-black/60` or `bg-black/80` - Used for containers (HUD, Pause Menu labels). Always paired with `backdrop-blur-md`.

### Functional Colors
The color palette maps directly to game function.

| Function | Color | Tailwind Class | Hex (Three.js) | Context |
| :--- | :--- | :--- | :--- | :--- |
| **System / Core** | **Cyan** | `text-cyan-400` / `border-cyan-500` | `0x00ffff` | Default HUD, Score, Hull, Start. |
| **Critical / Danger** | **Red** | `text-red-500` / `border-red-500` | `0xff0000` | Game Over, Low HP, Enemies, Venting. |
| **Warning / Ready** | **Orange/Yellow** | `text-orange-500` / `text-yellow-500` | `0xffaa00` | Missiles, Reset Function. |
| **Utility / Sensor** | **Purple** | `text-purple-400` / `border-purple-500` | `0xff00ff` | Calibration, Database, Sensors. |
| **Success / Action** | **Green** | `text-green-400` / `border-green-500` | `0x00ff00` | Resume, Full Health. |

---

## 3. Typography

The game uses a mix of System Sans-Serif for titles and Monospace for data.

### Hierarchy

**1. Headline (Phase Titles)**
*   **Usage**: "PAUSED", "READY", "CRITICAL FAILURE"
*   **Style**: `font-sans`, `font-black`, `uppercase`
*   **Tracking**: `tracking-[0.2em]` (Very wide)
*   **Effects**: Drop Shadow / Glow
*   **Size**: `text-5xl` (Mobile) to `text-8xl` (Desktop)

**2. Label (Buttons & Modules)**
*   **Usage**: "RESET", "RESUME", "THERMAL LOAD"
*   **Style**: `font-sans`, `font-bold`, `uppercase`
*   **Tracking**: `tracking-widest`
*   **Size**: `text-[10px]` to `text-xs`

**3. Data (HUD Metrics)**
*   **Usage**: Score, FPS, Health %
*   **Style**: `font-mono`, `font-bold`
*   **Feature**: `tabular-nums` (Prevents jitter when numbers change)

**4. Subtext (Descriptions)**
*   **Usage**: "System Halted", "Simulation"
*   **Style**: `font-mono` or `font-sans`, `opacity-60` or `text-color-darker`
*   **Tracking**: `tracking-wider`
*   **Size**: `text-[8px]`

---

## 4. UI Components

### Glass Panels
Containers for text (like in the Pause Menu or Help Screen) should use the "Glass" effect:
```tsx
<div className="bg-black/40 border border-cyan-500/20 backdrop-blur-md rounded-sm p-4">
  {/* Content */}
</div>
```

### Connector Lines (The "Tether" Look)
When a 2D label corresponds to a 3D object (Pause Menu), use a gradient fade line to connect them visually without clutter.
```tsx
<div className="h-10 w-0.5 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
```

### Progress Bars (Hull / Heat / Reload)
Bars require three layers:
1.  **Container**: Dark background (`bg-gray-900/80`), rounded, overflow hidden.
2.  **Border**: Thin, colored border (`border-cyan-500/30`).
3.  **Fill**: Colored background, often with a gradient (`bg-gradient-to-r`).
4.  **Glow (Optional)**: If active/full, add a shadow (`shadow-[0_0_15px_COLOR]`).

---

## 5. Effects & Animation

### Neon Glow
All "Active" elements must emit light.
*   **CSS**: `drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]` or `shadow-[0_0_15px_#06b6d4]`.
*   **Three.js**: `emissive` material property with `emissiveIntensity > 1.0`.

### Pulse / Heartbeat
Used for "Waiting for Input" or "Critical Warning".
*   **Class**: `animate-pulse`

### Scanlines / Overlay
The `WebcamFeed` uses a CSS mix-blend mode overlay to unify the real-world video with the game aesthetic.
*   **Style**: `mix-blend-overlay`, `opacity-50`, `radial-gradient`.

---

## 6. Layout & Responsiveness

### The "Cinematic Gap"
*   **Mobile**: UI is tightly packed. Legends are hidden to maximize viewports.
*   **Desktop (`md:`)**: UI elements are pushed to the far corners (`p-8`). The center 60% of the screen remains clear for gameplay.

### Target Locking (Pause Menu)
Labels must be positioned using `vh` (Viewport Height) units to maintain alignment with the fixed FOV of the 3D camera.
*   **Formula**: `left-[calc(50% + offset_in_vh)]`
*   **Alignment**: Flex-col centered.
