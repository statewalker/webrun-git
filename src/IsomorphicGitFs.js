class Stat {
  constructor(stats) {
    this.stats = stats;
  }
  get type() {
    return this.stats.kind === "directory" ? "dir" : "file";
  }
  get mode() {
    return 644;
  }
  get size() {
    return this.stats.size || 0;
  }
  get ino() {
    return;
  }
  get mtimeMs() {
    return this.stats.lastModified || 0;
  }
  get ctimeMs() {
    return this.mtimeMs;
  }
  get uid() {
    return 1;
  }
  get gid() {
    return 1;
  }
  get dev() {
    return 1;
  }
  isFile() {
    return this.type === "file";
  }
  isDirectory() {
    return this.type === "dir";
  }
  isSymbolicLink() {
    return false; // this.type === "symlink";
  }
}

/**
 * See https://isomorphic-git.org/docs/en/fs
 */
export default class IsomorphicGitFs {
  static newGitFs(filesApi) {
    return { promises: new IsomorphicGitFs({ filesApi }) };
  }

  constructor(options) {
    this.options = options;
    if (!this.filesApi) throw new Error("Files API is not defined");
    [""];
  }

  get filesApi() {
    return this.options.filesApi;
  }

  async readFile(path, options = {}) {
    console.log("readFile", path, options);
    let stop = false;
    if (options.signal) {
      options.signal.addEventListener("abort", (event) => stop = true, {
        once: true,
      });
    }
    const chunks = [];
    const stats = await this.stat(path);
    if (!stats || !stats.isFile()) throw new Error("Bad type");
    for await (const chunk of this.filesApi.read(path)) {
      if (stop) break;
      chunks.push(chunk);
    }

    if (options.encoding) {
      if (!chunks.length) return "";
      const decoder = new TextDecoder();
      return chunks.reduce((str, chunk) => str += decoder.decode(chunk), "");
    } else {
      if (!chunks.length) return new Uint8Array([]);
      return mergeChunks(chunks);
    }
  }

  async writeFile(file, data, options = {}) {
    console.log("writeFile", arguments);
    if ((typeof data === "string") || (data instanceof Uint8Array)) {
      data = [data];
    }
    let it = asIterator(data);
    it = withEncoder(it);
    return await this.filesApi.write(file, it);

    async function* withEncoder(it) {
      const encoder = new TextEncoder();
      for await (const chunk of it) {
        yield (typeof chunk === "string") ? encoder.encode(chunk) : chunk;
      }
    }
  }

  async unlink(path) {
    console.log("unlink", path);
    await this.filesApi.remove(path);
  }

  async readdir(path, options = {}) {
    console.log("readdir", path, options);
    const list = [];
    for await (const { name } of this.filesApi.list(path)) {
      list.push(name);
    }
    return list;
  }

  async mkdir(path, mode) {
    console.log("mkdir", path, mode);
    // await this.filesApi.write(`${path}/.placeholder`, []);
  }

  async stat(path, options = {}) {
    console.log("stat", path, options);
    const stat = await this.filesApi.stats(path);
    if (!stat) {
      throw Object.assign(new Error("Not found"), {
        code: "ENOENT", // || err.code === 'ENOTDIR'
      });
    }
    return new Stat(stat);
  }

  // --------------------------------------
  async rmdir(path) {
    console.log("rmdir", path);
    await this.filesApi.remove(path);
  }

  async lstat(path, options) {
    console.log("lstat", path, options);
    return await this.stat(path, options);
  }

  // // --------------------------------------
  async readlink(path, options) {
    console.log("readlink", path, options);
    throw new Error("Not implemented");
  }

  async symlink(target, path, type) {
    console.log("symlink", target, path, type);
    throw new Error("Not implemented");
  }

  async chmod(path, mode) {
    console.log("chmod", path, mode);
    throw new Error("Not implemented");
  }
}

function asIterator(value) {
  if ((value === null) || (typeof value !== "object")) value = [];
  return value[Symbol.asyncIterator]
    ? value[Symbol.asyncIterator]()
    : value[Symbol.iterator]
    ? value[Symbol.iterator]()
    : [][Symbol.iterator]();
}

function mergeChunks(chunks) {
  const size = chunks.reduce((size, chunk) => size += chunk.length, 0);
  const result = new Uint8ClampedArray(size);
  let pos = 0;
  for (let chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}
