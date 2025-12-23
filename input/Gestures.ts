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


// --- Left Hand: PINCH GESTURE ---
// Thumb and Index coming together (both half-curled or no-curl is acceptable)
// Other fingers don't matter for the pinch detection

export const PinchGesture = new GestureDescription('pinch');

// For a pinch, both thumb and index should be somewhat curled (coming together)
// We'll accept NoCurl or HalfCurl for both, but not FullCurl
PinchGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
PinchGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);

PinchGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 0.8);
PinchGesture.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);

// Middle, Ring, Pinky: Don't care - user may have them open or closed

