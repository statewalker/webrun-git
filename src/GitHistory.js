import IsomorphicGitFs from "./IsomorphicGitFs.js";
import resolvePath from "./resolvePath.js";

/**
 * This class provides a simplified workflow of history management for "projects" -
 * folders under version control with Git.
 *
 * Notions:
 * * "version" - a separate branch
 * * "private version" - user-specific branch; has the name of the user
 * * "shared version" - the "main" branch / the branch where all users merge their work
 * * "integrate" ? - merge the contributions from the "shared version" ("main" branch)
 *   in the "private version" (user's branch)
 * * "share" - merge user's contributions to the shared version (merge from user's branch in "main");
 *   the "share" action could be performed only after "integration" of contributions of other people
 *   in the user's branch
 * * "save" - create a new entry in the current user's branch (a new commit)
 * * "synchronize" - send local changes to the server and recieve remote changes in the local repo
 */
export default class GitHistory {
  constructor(options = {}) {
    this.options = options;
    if (!this.git) throw new Error("IsomorphicGit API is not defined.");
    if (!this.filesApi) throw new Error("FilesApi is not defined");
    if (!this.userName) throw new Error("The user's name is not defined");
    if (!this.workingBranch) {
      throw new Error("The user's branch is not defined");
    }
    this._fs = IsomorphicGitFs.newGitFs(this.filesApi);
  }

  get git() {
    return this.options.git;
  }

  get filesApi() {
    return this.options.filesApi;
  }

  get userName() {
    return this.options.userName;
  }

  get userEmail() {
    return this.options.userEmail;
  }

  get mainBranch() {
    return this.options.mainBranch || "main";
  }

  get workingBranch() {
    return this.options.workingBranch || "private"; // this.options.workingBranch || this.userEmail || this.userName;
  }

  get workDir() {
    return resolvePath("/", this.options.workDir || "./");
  }

  get gitDir() {
    return this.options.gitDir
      ? resolvePath("/", this.options.gitDir)
      : resolvePath(this.workDir, ".git");
  }

  get placeholderFileName() {
    return this.options.placeholderFileName || ".gitkeep";
  }

  log(...args) {
    if (this.options.log) this.options.log(...args);
  }

  async checkout({ commitId } = {}) {
    await this.init();
    return await this._run("checkout", {
      ref: commitId,
    });
  }

  async _run(method, options = {}) {
    this.log(`git.${method}(`, options, `)`);
    return await this.git[method]({
      fs: this._fs,
      dir: this.workDir,
      gitdir: this.gitDir,
      //   ref: this.workingBranch,
      author: {
        name: this.userName,
        email: this.userEmail,
      },
      ...options,
    });
  }

  async getLog() {
    await this.init();
    return await this._run("log", {
      ref: await this.getCurrentBranch(),
    });
  }

  async getCurrentBranch() {
    await this.init();
    return await this._run("currentBranch");
  }

  async getBranches() {
    await this.init();
    return await this._run("listBranches");
  }

  async *getFilesStatus(...args) {
    await this.init();
    yield* this._getFilesStatus(...args);
  }

  async isIgnored(path) {
    await this.init();
    return await this._run("isIgnored", {
      filepath: this._toLocalPath(path),
    });
  }

  async saveFiles(...args) {
    await this.init();
    return await this._saveFiles(...args);
  }

  async _saveFiles(
    { filter = () => true, branchName, message } = {},
  ) {
    branchName = branchName || await this.getCurrentBranch();
    let commitId;
    const list = await this._visitNonCommittedFiles({
      filter,
      action: async (filepath) => await this._run("add", { filepath }),
    });
    if (list.length) {
      message = message ? message + "\n\n" : "";
      message += list.join("\n");
      commitId = await this._run("commit", { message, ref: branchName });
    }
    return {
      commitId,
      files : list,
    };
  }

  async init() {
    return this._initializationPromise = this._initializationPromise ||
      Promise.resolve().then(() => this._init());
  }

  async *_getFilesStatus(accept = () => true) {
    const gitDir = this.gitDir;
    const workDir = this.workDir;
    const it = visit(this.filesApi, workDir, async (info) => {
      if (info.path.indexOf(gitDir) === 0) return false;
      const ok = await accept(info);
      return ok === undefined || Boolean(ok);
    });

    for await (let info of it) {
      if (info.kind === "directory") continue;
      const status = await this._run("status", {
        filepath: this._toLocalPath(info.path),
      });
      yield { ...info, status };
    }
    async function* visit(filesApi, root, accept) {
      for await (let fileInfo of filesApi.list(root, { recursive: false })) {
        if (!await accept(fileInfo)) continue;
        yield fileInfo;
        if (fileInfo.kind === "directory") {
          yield* visit(filesApi, fileInfo.path, accept);
        }
      }
    }
  }

  async _init() {
    const mainBranch = this.mainBranch;
    const versions = await this._run("listBranches");
    if (!versions.length) {
      // Initialize history
      await this._run("init", {
        defaultBranch: mainBranch,
      });
      await this._run("branch", {
        checkout: true,
        ref: mainBranch,
      });

      const placeholderFile = this.placeholderFileName;
      const fullPath = resolvePath(this.workDir, placeholderFile);
      await this.filesApi.write(fullPath, []);
      await this._run("add", {
        filepath: placeholderFile,
      });
      await this._run("commit", {
        message: "Initial commit",
      });
    } else if (versions.indexOf(mainBranch) < 0) {
      // Create the shared (main) branch if it does not exist
      await this._run("branch", {
        checkout: true,
        ref: mainBranch,
      });
    }

    await this._switchToBranch(this.workingBranch, true);
  }

  async _visitNonCommittedFiles(
    { filter = () => true, action = async () => {} } = {},
  ) {
    let files = [];
    for await (const fileInfo of this._getFilesStatus(filter)) {
      if (!this._isDirty(fileInfo)) continue;
      const filepath = this._toLocalPath(fileInfo.path);
      const result = await action(filepath, fileInfo);
      if (result === undefined || Boolean(result)) files.push(filepath);
    }
    return files;
  }

  _toLocalPath(path) {
    const workDir = this.workDir;
    const prefixLen = workDir.length > 1 ? workDir.length + 1 : workDir.length;
    return path.substring(prefixLen);
  }

  _isDirty(fileInfo) {
    // See change statuses: https://isomorphic-git.org/docs/en/status
    return (fileInfo.status && fileInfo.status[0] === "*");
  }

  async _switchToBranch(branchName, create = true) {
    const versions = await this._run("listBranches");
    // Check the branch
    if (versions.indexOf(branchName) < 0) {
      if (!create) return false;
      await this._run("branch", {
        checkout: false,
        ref: branchName,
      });
    }
    await this._run("checkout", { ref: branchName, force: true });
    return true;
  }

  // ----------------------------------------

  /* * /

  async _checkNullBranch() {
    const branches = await this._run("listBranches");
    const nullBranch = "wip";
    if (branches.indexOf(nullBranch) < 0) {
      const emptyTreeId = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
      const nullCommitId = await this._run("commit", {
        ref: nullBranch,
        tree: emptyTreeId,
        parent: [],
        author: {
          name: "noname",
          email: "noname",
        },
        message: "empty branch",
      });
      await this._run("branch", {
        checkout: false,
        ref: nullBranch,
        object: nullCommitId,
      });
    }
    const nullBranchId = await this._run("resolveRef", { ref: nullBranch });
    return [nullBranch, nullBranchId];
  }

  async _checkout({ branchName, filter, create } = {}) {
    const list = await this._visitNonCommittedFiles({ filter });
    let tmpBranchId;
    if (list.length) {
      // There are modification in the local folder.
      // Step 1: create a new temporary branch without history
      // Step 2: commit all modifications there
      // Step 3: reset the state of the current folder to the original branch
      // Step 4: checkout the target branch
      // Step 5: apply saved file changes on top of this target branch

      const [nullBranchName, nullBranchId] = await this._checkNullBranch();
      for (let filepath of list) {
        await this._run("add", { filepath });
      }

      const tmpBranch = "wip--" + branchName + "--" + Date.now();
      const commitId = await this._run("commit", {
        message: "WIP",
        ref: tmpBranch,
        noUpdateBranch: true,
        parent: [nullBranchId],
      });

      await this._run("branch", {
        checkout: false,
        ref: tmpBranch,
        object: commitId,
      });

      // for (let filepath of list) {
      //   await this._run("resetIndex", { filepath })
      // }

      tmpBranchId = await this._run("resolveRef", { ref: tmpBranch });
    }
    await this._run("checkout", { ref: branchName, force: true });
    if (tmpBranchId) {
      await this._run("checkout", {
        ref: tmpBranchId,
        noUpdateHead: true,
        track: false,
        filepaths: list,
        force: true,
      });

      for (let filepath of list) {
        await this._run("resetIndex", { filepath });
      }

      // await this._run("deleteBranch", { ref : tmpBranch })
    }
  }
  // */
}
