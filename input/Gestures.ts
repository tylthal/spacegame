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

// Middle: Must be Curled
PointGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
PointGesture.addCurl(Finger.Middle, FingerCurl.HalfCurl, 0.9); // Allow slightly loose curl

// Ring: Must be Curled
PointGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
PointGesture.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.9);

// Pinky: Must be Curled
PointGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
PointGesture.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.9);


// --- Left Hand: PINCH READY (Optional) ---
// If we want to detect the *shape* of a pinch (Index/Thumb close),
// Fingerpose isn't distance based.
// We'll stick to manual distance check for the "Click", but we could
// enforce a "Pinch Pose" where Index/Thumb are not FullCurl?
// For now, let's just export PointGesture.
