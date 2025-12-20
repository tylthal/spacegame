# Orbital Sniper: Void Defense - User Manual

## 1. System Requirements
- **Browser**: Chrome, Edge, or Brave (WebGPU/WebGL2 support required).
- **Hardware**: 
  - Webcam (720p or higher recommended).
  - Dedicated GPU recommended (for smooth 60fps rendering).
- **Environment**: Well-lit room, ensuring hands are clearly visible to the camera.

## 2. Initialization & Calibration
Upon loading, the "Neural Link" will initialize the computer vision models.

### The Calibration Phase
Before the game begins, the system must establish a "Zero Point" for your aiming hand.
1.  **Position**: Sit comfortably. Raise both hands into the camera view.
2.  **Gesture**: 
    - **Right Hand**: Hold it comfortably in a neutral position (this will be the center of your screen).
    - **Left Hand**: Pinch your **Index Finger** and **Thumb** together.
3.  **Hold**: Keep this gesture for **2.5 seconds** until the circular progress bar completes.

*Note: If calibration fails, ensure your hands are within the "Virtual Mousepad" guide box shown on screen.*

## 3. Combat Controls

The game uses a dual-hand control scheme to prevent "Gorilla Arm" fatigue.

| Hand | Action | Gesture | Description |
| :--- | :--- | :--- | :--- |
| **Right** | **Aiming** | Open Palm / Point | Move your hand relative to the calibrated center. Movement is amplified (approx 3x) so small wrist movements cover the whole screen. |
| **Left** | **Plasma Cannon** | **Pinch** (Index + Thumb) | Fires rapid energy projectiles. Generates heat. |
| **Left** | **Void Missile** | **Closed Fist** | Launches a slow-moving, high-yield explosive. Detonates on proximity or impact. Large splash damage. |
| **Right** | **Tactical Pause** | **Open Palm** (Fingers Up) | Hold an open "Stop" gesture for 0.6s to pause the simulation. |

## 4. HUD & Systems

### Top Left: Score & FPS
- **Orbital Score**: Points earned from destroying enemies.
- **Neural FPS**: The frame rate of the hand-tracking engine (target is 30Hz). *Hidden on mobile devices.*

### Top Right: Integrity & Lives
- **Neural Link Integrity (Hull)**: Your health bar. If this reaches 0%, you lose a life.
- **Lives**: You start with 3 lives. Losing all 3 results in a Game Over.

### Bottom Center: Weapon Status
- **Thermal Load (Top Bar)**: Increases as you fire the cannon.
  - **Overheat**: If the bar fills completely, weapons lock for **2 seconds** (VENTING).
- **Warhead (Bottom Bar)**: Progress bar for Missile cooldown.
  - **Ready**: Bar is orange/glowing.
  - **Arming**: Bar is refilling.

## 5. Game Phases
1.  **Ready**: Shoot the cyan "Start" target to begin.
2.  **Playing**: Defend against waves of enemies.
3.  **Paused**: Time stops.
    - Shoot **Green** (Top): Resume.
    - Shoot **Blue** (Bottom): **Database** (View Enemy Intel).
    - Shoot **Yellow** (Left): Reset Game.
    - Shoot **Purple** (Right): Recalibrate Hand Sensors.
4.  **Database / Help**:
    - View enemy stats and 3D models.
    - Shoot **Cyan** (Right): Next Page / Manual.
    - Shoot **Purple** (Left): Cycle Enemy Model (Page 2).
    - Shoot **Orange** (Bottom): Exit to Pause Menu.
5.  **Game Over**: Displays final score. Shoot the red "Reboot" module to try again.

## 6. Troubleshooting
- **Jittery Aim**: Improve lighting or recalibrate. Ensure no other people are in the frame.
- **Weapons Not Firing**: Ensure your Left Hand is clearly visible and not overlapping with your Right Hand.
- **Performance Drop**: Close other browser tabs using the GPU.

## 7. Mobile & Tablet Play
The interface automatically adapts to smaller screens.
- **Engagement Protocol**: The controls legend is hidden on mobile to maximize visibility of enemies.
- **Weapon Status**: The bar is shifted higher to avoid interference with the Home Indicator on iOS devices.
- **Webcam**: The preview window is reduced in size.
