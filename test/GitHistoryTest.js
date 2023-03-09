import { MemFilesApi, NodeFilesApi } from "@statewalker/webrun-files";
import * as git from "isomorphic-git";
import gitHttp from "isomorphic-git/http/node/index.js";
import GitHistory from "../src/GitHistory.js";
import expect from "expect.js";
import { newGitHistory } from "./testUtils.js";

describe("GitHistory", function () {
  it(`should rise an error if there is there is no Isomorphic Git instances defined`, async () => {
    let error;
    try {
      const git = undefined;
      new GitHistory({
        git,
        gitHttp,
        filesApi: new MemFilesApi(),
        userName: "JohnSmith",
      });
    } catch (e) {
      error = e;
    }
    expect(error instanceof Error).to.be(true);
    expect(error.message).to.eql("IsomorphicGit API is not defined.");
  });

  it(`should rise an error if there is no FilesApi defined`, async () => {
    let error;
    try {
      const filesApi = undefined;
      new GitHistory({ git, gitHttp, filesApi, userName: "JohnSmith" });
    } catch (e) {
      error = e;
    }
    expect(error instanceof Error).to.be(true);
    expect(error.message).to.eql("FilesApi is not defined");
  });

  it(`should rise an error if there is no user's name defined`, async () => {
    let error;
    try {
      new GitHistory({
        git,
        gitHttp,
        filesApi: new MemFilesApi(),
        userName: undefined,
      });
    } catch (e) {
      error = e;
    }
    expect(error instanceof Error).to.be(true);
    expect(error.message).to.eql("The user's name is not defined");
  });

  it(`should define default git and working directories`, async () => {
    const api = await newGitHistory();
    expect(api.workDir).to.be("/");
    expect(api.gitDir).to.be("/.git");
  });

  it(`should be able to overload default git and working directories (1)`, async () => {
    const api = await newGitHistory({
      workDir: "/a/b/c",
    });
    expect(api.workDir).to.be("/a/b/c");
    expect(api.gitDir).to.be("/a/b/c/.git");
  });
  it(`should be able to overload default git and working directories (2)`, async () => {
    const api = await newGitHistory({
      workDir: "/a/b/c",
      gitDir: "/.xyz",
    });
    expect(api.workDir).to.be("/a/b/c");
    expect(api.gitDir).to.be("/.xyz");
  });
  it(`should be able to overload default git and working directories (3)`, async () => {
    const api = await newGitHistory({
      workDir: "a/b/c/",
      gitDir: ".xyz",
    });
    expect(api.workDir).to.be("/a/b/c");
    expect(api.gitDir).to.be("/.xyz");
  });

  it(`should successfully create the .git folder during the history initialization`, async () => {
    const filesApi = new MemFilesApi();
    const api = new GitHistory({
      git,
      gitHttp,
      userName: "JohnSmith",
      userEmail: "john.smith@foo.bar",
      // userBranch : "john-smith",
      filesApi,
      workDir: "/abc",
    });

    let dirInfo = await filesApi.stats("/abc/.git");
    expect(!!dirInfo).to.be(false);
    await api._init();
    dirInfo = await filesApi.stats("/abc/.git");
    expect(!!dirInfo).to.be(true);
    expect(dirInfo.path).to.be("/abc/.git");
    expect(dirInfo.kind).to.be("directory");

    const configFileInfo = await filesApi.stats("/abc/.git/config");
    expect(configFileInfo.kind).to.be("file");
    expect(configFileInfo.path).to.be("/abc/.git/config");
  });

  //   it(`should successfully initialize the history`, async () => {
  //     const files = {
  //       "/abc/about/team.md": "This document describes our super-team!",
  //       "/abc/README.md": "Welcome to the project! -" + Date.now(),
  //       "/abc/js/index.js": "console.log('Abc');",
  //     };
  //     // const api = newGitHistory({});

  //     const filesApi = new NodeFilesApi({
  //       fs: fsPromises,
  //       rootDir: new URL("./data-workspaces", import.meta.url).pathname,
  //     });
  //     const api = new GitHistory({
  //       log: console.error,
  //       userName: "JohnSmith",
  //       userEmail: "john.smith@foo.bar",
  //       userBranch : "john-smith",
  //       filesApi,
  //       workDir: "/abc",
  //     });
  //     await api.init();
  // return ;
  //     await writeFiles(api.filesApi, files);

  //     // for await (let f of api.getStatus()) {

  //     // }
  //     // const status = await api.getStatus();
  //     // console.log('>>', status);
  //     const versions = await api.getVersions();
  //     // expect(versions).to.eql([]);

  //     await api.saveFiles();
  //   });
});
