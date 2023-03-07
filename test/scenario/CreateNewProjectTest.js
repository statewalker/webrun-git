import expect from "expect.js";
import { newGitHistory, writeFiles, readFileContent } from "../testUtils.js";

describe("Create New Project", function () {
  it(`should initialize git history with the corresponding folders`, async () => {
    const api = newGitHistory({
      workDir: "/abc/cde",
      gitDir: "/toto/.git",
    });
    await checkDir(api.workDir, null);
    await checkDir(api.gitDir, null);

    await api.init();

    await checkDir(api.workDir, {
      "kind": "directory",
      "name": "cde",
      "path": "/abc/cde",
    });
    await checkDir(api.gitDir, {
      "kind": "directory",
      "name": ".git",
      "path": "/toto/.git",
    });

    async function checkDir(path, control) {
      const info = await api.filesApi.stats(path);
      if (!control) expect(info).to.be(null);
      else {
        const { lastModified, ...controlInfo } = control;
        expect(info.path).to.eql(path);
        expect(info).to.eql(controlInfo);
      }
    }
  });

  it(`should initialize default branches and switch to the working branch`, async () => {
    const api = newGitHistory({});
    const branches = await api.getBranches();
    expect(branches).to.eql(["main", "private"]);
    expect(await api.getCurrentBranch()).to.eql("private");
  });

  it(`should initialize custom working and main branches`, async () => {
    const api = newGitHistory({
      mainBranch: "xyz",
      workingBranch: "zyx",
    });
    const branches = await api.getBranches();
    expect(branches).to.eql([api.mainBranch, api.workingBranch]);
    expect(await api.getCurrentBranch()).to.eql("zyx");
  });

  it(`should initialize git repository in an existing folder`, async () => {
    const api = newGitHistory({
      workDir: "/workspace/projectOne",
      gitDir: "/workspace/projectOne/.git",
      files: {
        "/workspace/projectOne/README.md": "Hello, there in our project!",
        "/workspace/projectOne/src/index.js": "console.log('ABC');",
      },
    });
    const fileInfo = await api.filesApi.stats(
      "/workspace/projectOne/src/index.js",
    );
    expect(!!fileInfo).to.be(true);
    expect(fileInfo.path).to.eql("/workspace/projectOne/src/index.js");

    const branches = await api.getBranches();
    expect(branches).to.eql(["main", "private"]);
    expect(await api.getCurrentBranch()).to.eql("private");
  });

  it(`should not add existing files to the history`, async () => {
    const api = newGitHistory({
      workDir: "/workspace/projectOne",
      gitDir: "/workspace/projectOne/.git",
      files: {
        "/workspace/projectOne/README.md": "Hello, there in our project!",
        "/workspace/projectOne/src/index.js": "console.log('ABC');",
      },
    });
    const results = {};
    for await (let fileInfo of api.getFilesStatus()) {
      results[fileInfo.path] = fileInfo.status;
    }
    expect(results).to.eql({
      "/workspace/projectOne/README.md": "*added",
      "/workspace/projectOne/src/index.js": "*added",
    });
  });

  it(`should be able to check if files are ignored`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/.gitignore": `*.txt`,
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
      },
    });
    expect(await api.isIgnored("/projectOne/cde.txt")).to.be(true);
    expect(await api.isIgnored("/projectOne/deep/sub/folder/xyz.txt")).to.be(
      true,
    );
  });

  it(`should be able to ignore files using .gitignore`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
        "/projectOne/.gitignore": `*.txt`,
      },
    });
    const results = {};
    for await (let fileInfo of api.getFilesStatus()) {
      results[fileInfo.path] = fileInfo.status;
    }
    expect(results).to.eql({
      "/projectOne/abc.md": "*added",
      "/projectOne/cde.txt": "ignored",
      "/projectOne/efg.md": "*added",
      "/projectOne/deep/sub/folder/xyz.txt": "ignored",
    });
  });

  it(`should be able to save files`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
        "/projectOne/.gitignore": `*.txt`,
      },
    });

    let results = {};
    for await (let fileInfo of api.getFilesStatus()) {
      results[fileInfo.path] = fileInfo.status;
    }
    expect(results).to.eql({
      "/projectOne/abc.md": "*added",
      "/projectOne/cde.txt": "ignored",
      "/projectOne/efg.md": "*added",
      "/projectOne/deep/sub/folder/xyz.txt": "ignored",
    });

    const savedFiles = await api.saveFiles();
    expect(savedFiles).to.eql(["abc.md", "efg.md"]);

    results = {};
    for await (let fileInfo of api.getFilesStatus()) {
      results[fileInfo.path] = fileInfo.status;
    }
    expect(results).to.eql({
      "/projectOne/abc.md": "added",
      "/projectOne/cde.txt": "ignored",
      "/projectOne/efg.md": "added",
      "/projectOne/deep/sub/folder/xyz.txt": "ignored",
    });
  });

  it(`should save only modified/added files`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
        "/projectOne/.gitignore": `*.txt`,
      },
    });
    let savedFiles = await api.saveFiles();
    expect(savedFiles).to.eql(["abc.md", "efg.md"]);

    await writeFiles(api.filesApi, {
      "/projectOne/efg.md": "EFG File 123",
    });

    savedFiles = await api.saveFiles();
    expect(savedFiles).to.eql(["efg.md"]);
  });

  it(`should create multiple version and get the history of modifications`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
        "/projectOne/.gitignore": `*.txt`,
      },
    });

    let history = await api.getLog();
    expect(Array.isArray(history)).to.be(true);
    expect(history.length).to.be(1);

    let savedFiles = await api.saveFiles();
    history = await api.getLog();
    expect(history.length).to.be(2);
    expect(savedFiles).to.eql(["abc.md", "efg.md"]);
    expect(history[0].commit.message).to.eql(`abc.md\nefg.md\n`);

    await writeFiles(api.filesApi, {
      "/projectOne/efg.md": "EFG File 123",
    });
    savedFiles = await api.saveFiles();
    expect(savedFiles).to.eql(["efg.md"]);

    history = await api.getLog();
    expect(history.length).to.be(3);
    expect(history[0].commit.message).to.eql(`efg.md\n`);

    await writeFiles(api.filesApi, {
      "/projectOne/efg.md": "EFG File 456",
    });
    savedFiles = await api.saveFiles();
    expect(savedFiles).to.eql(["efg.md"]);
  });

  it(`should restore previous versions`, async () => {
    const api = newGitHistory({
      workDir: "/projectOne",
      gitDir: "/projectOne/.git",
      files: {
        "/projectOne/abc.md": "ABC File",
        "/projectOne/cde.txt": "CDE File",
        "/projectOne/efg.md": "EFG File",
        "/projectOne/deep/sub/folder/xyz.txt": "XYZ File",
        "/projectOne/.gitignore": `*.txt`,
      },
    });

    await api.saveFiles();
    await writeFiles(api.filesApi, {
      "/projectOne/efg.md": "EFG File 123",
    });
    await api.saveFiles();
    await writeFiles(api.filesApi, {
      "/projectOne/efg.md": "EFG File 456",
    });
    await api.saveFiles();


    let text = await readFileContent(api.filesApi, "/projectOne/efg.md");
    expect(text).to.eql("EFG File 456");

    const history = await api.getLog();
    const commitId = history[1].oid;
    await api.checkout({ commitId });

    text = await readFileContent(api.filesApi, "/projectOne/efg.md");
    expect(text).to.eql("EFG File 123");


    expect(history[0].commit.message).to.eql(`efg.md\n`)

  });
  /* * /
  it(`should be able to save files in the history`, async () => {
    const api = newGitHistory({
      workDir : "/workspace/projectOne",
      gitDir : "/workspace/projectOne/.git",
      files: {
        "/workspace/projectOne/README.md": "Hello, there in our project!",
        "/workspace/projectOne/src/index.js": "console.log('ABC');",
      },
    });
    const results = {};
    for await (let fileInfo of api.getFilesStatus()) {
      results[fileInfo.path] = fileInfo.status;
    }
    expect(results).to.eql({
      "/workspace/projectOne/README.md": "*added",
      "/workspace/projectOne/src/index.js": "*added"
    })
  });
  // */
});
