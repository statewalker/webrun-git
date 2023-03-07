export default function resolvePath(...pathList) {
  const segments = pathList.reduce(
    (segments, path) => {
      const pathSegments = path.split("/");
      if (pathSegments[0] === '')
        return pathSegments;
      segments.push(...pathSegments);
      return segments;
    },
    []
  );
  const absolute = segments[0] === '';
  const result = [];
  for (const segment of segments) {
    if (segment === "..") {
      result.pop();
    } else if (segment !== "" && segment !== ".")
      result.push(segment);
  }
  if (absolute) {
    if (!result.length)
      result.push("");
    result.unshift("");
  }
  return result.join("/");
}
