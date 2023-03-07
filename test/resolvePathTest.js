import expect from "expect.js";
import resolvePath from "../src/resolvePath.js";

describe("resolvePath", function () {

  it(`concatanate simple paths`, async () => {
    expect(resolvePath()).to.eql("");
    expect(resolvePath("a")).to.eql("a");
    expect(resolvePath("a", "b")).to.eql("a/b");
    expect(resolvePath("a", "b/c/d")).to.eql("a/b/c/d");
    expect(resolvePath("a/b", "c/d")).to.eql("a/b/c/d");
  });

  it(`resolve absolute paths`, async () => {
    expect(resolvePath("/")).to.eql("/");
    expect(resolvePath("/a")).to.eql("/a");
    expect(resolvePath("/a/b")).to.eql("/a/b");
    expect(resolvePath("a", "/b")).to.eql("/b");
    expect(resolvePath("/a", "b/c/d")).to.eql("/a/b/c/d");
    expect(resolvePath("/a/b", "c/d")).to.eql("/a/b/c/d");
  });

  it(`should resolve relative paths`, async () => {
    expect(resolvePath("../../b")).to.eql("b");
    expect(resolvePath("../../b/c")).to.eql("b/c");
    expect(resolvePath("a/../b/../c/../d")).to.eql("d");
    expect(resolvePath("a/b/c/../../d/e")).to.eql("a/d/e");
    expect(resolvePath("a/b/c/../../../d/e")).to.eql("d/e");
  });

  it(`should resolve relative references for absolute paths`, async () => {
    expect(resolvePath("/", "../../b")).to.eql("/b");
    expect(resolvePath("/", "../../b/c")).to.eql("/b/c");
    expect(resolvePath("/", "a/../b/../c/../d")).to.eql("/d");
    expect(resolvePath("/", "a/b/c/../../d/e")).to.eql("/a/d/e");
    expect(resolvePath("/", "a/b/c/../../../d/e")).to.eql("/d/e");
    expect(resolvePath("/", "a/b/c/", "../../", "../d/e")).to.eql("/d/e");
  });

  it(`should ignore empty segments`, async () => {
    expect(resolvePath("a//.//b/.//./c")).to.eql("a/b/c");
    expect(resolvePath("../../b/c")).to.eql("b/c");
    expect(resolvePath("a/../b/../c/../d")).to.eql("d");
    expect(resolvePath("a/b/c/../../d/e")).to.eql("a/d/e");
    expect(resolvePath("a/b/c/../../../d/e")).to.eql("d/e");
  });

  it(`should ignore empty segments in absolute paths`, async () => {
    expect(resolvePath("/a//.//b/.//./c")).to.eql("/a/b/c");
    expect(resolvePath("/../../b/c")).to.eql("/b/c");
    expect(resolvePath("/a/../b/../c/../d")).to.eql("/d");
    expect(resolvePath("/a/b/c/../../d/e")).to.eql("/a/d/e");
    expect(resolvePath("/a/b/c/../../../d/e")).to.eql("/d/e");
  });
});
