import path from "node:path";

// Filesystem paths become contract POSIX paths only at the CLI boundary.
// safeFile still rejects parent traversal and absolute/drive paths afterwards.
export function relativeEvidencePath(root, target, filesystemPath = path) {
  return filesystemPath.relative(root, target).split(filesystemPath.sep).join("/");
}
