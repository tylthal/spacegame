import { GestureDescription, Finger, FingerCurl } from 'fingerpose';

// --- Right Hand: POINT GESTURE ---
// Strictly require Index extended, others curled.
// Thumb is loose (can be curled or not).

export const PointGesture = new GestureDescription('point');

// Thumb: Don't care (give equal weight to both or just don't add strictly)
// Actually, if we strictly don't care, we don't add constraints. 
// But let's say "NoCurl" or "HalfCurl" is fine, but "FullCurl" is also fine?
// User said "Thumb doesn't matter". We'll just omit Thumb constraints entirely.

// Index: Must be NOT curled (Straight)
PointGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);

// OTHER FINGERS:
// We explicitly DO NOT constrain Middle, Ring, or Pinky.
// This allows "Open Hand", "Gun", or "Relaxed Point" to all register as 'point'.
// The user requested: "It just needs to see at a minimum the pointer finger".
// This makes the gesture extremely robust to occlusion or relaxed hand states.


// --- Left Hand: PINCH READY (Optional) ---
// If we want to detect the *shape* of a pinch (Index/Thumb close),
// Fingerpose isn't distance based.
// We'll stick to manual distance check for the "Click", but we could
// enforce a "Pinch Pose" where Index/Thumb are not FullCurl?
// For now, let's just export PointGesture.
