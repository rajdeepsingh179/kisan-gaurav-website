export default function loadMotionFeatures() {
  return import("../motionFeatures").then((module) => module.default);
}
