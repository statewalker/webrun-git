import { MemFilesApi } from "@statewalker/webrun-files";
import GitHistory from "../src/GitHistory.js";
import * as git from "isomorphic-git";

export function newGitHistory({ files, userName = "JohnSmith", ...options } = {}) {
  const filesApi = new MemFilesApi({ git, files });
  const history = new GitHistory({
    git,
    userName,
    ...options,
    filesApi,
  });
  return history;
}

export async function writeFiles(api, files) {
  for (const [path, content] of Object.entries(files)) {
    await writeFileContent(api, path, content);
  }
}

export async function writeFileContent(api, path, content) {
  await api.write(path, async function* () {
    const textEncoder = new TextEncoder();
    yield textEncoder.encode(content);
  });
}

export async function readFileContent(api, path) {
  const decoder = new TextDecoder();
  let str = "";
  for await (let chunk of api.read(path)) {
    str += decoder.decode(chunk);
  }
  return str;
}
