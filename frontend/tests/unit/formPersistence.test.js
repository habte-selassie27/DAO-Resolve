// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { nextTick, reactive, ref } from "vue";
import { bindFormDraft, bindRefDraft, peekDraft } from "../../src/lib/formPersistence.js";

// Every test uses its own storage key, so no cross-test cleanup is needed;
// the module itself falls back transparently when localStorage is unavailable.

describe("bindFormDraft", () => {
  it("saves on change and restores on a fresh bind (simulated reload)", async () => {
    const defaults = { a: "", b: 0, checks: [] };
    const form = reactive({ ...defaults, checks: [] });
    bindFormDraft("unit:form", form, defaults);
    form.a = "hello";
    form.b = 7;
    form.checks = [{ id: "c1" }];
    await nextTick();

    const reloaded = reactive({ a: "", b: 0, checks: [] });
    const rebinding = bindFormDraft("unit:form", reloaded, defaults);
    expect(rebinding.restored).toBe(true);
    expect(reloaded.a).toBe("hello");
    expect(reloaded.b).toBe(7);
    expect(reloaded.checks).toEqual([{ id: "c1" }]);
  });

  it("drops nothing-to-save defaults: no draft exists before any change", () => {
    const defaults = { a: "" };
    const form = reactive({ ...defaults });
    bindFormDraft("unit:empty", form, defaults);
    expect(peekDraft("unit:empty")).toBe(null);
  });

  it("reset returns the form to defaults and clears the draft after the watcher flush", async () => {
    const defaults = { a: "", b: 0 };
    const form = reactive({ ...defaults });
    const binding = bindFormDraft("unit:reset", form, defaults);
    form.a = "pending";
    await nextTick();
    expect(peekDraft("unit:reset")).not.toBe(null);

    binding.reset();
    await nextTick();
    expect(form.a).toBe("");
    expect(peekDraft("unit:reset")).toBe(null);

    const reloaded = reactive({ a: "", b: 0 });
    expect(bindFormDraft("unit:reset", reloaded, defaults).restored).toBe(false);
  });

  it("reset does not swallow a later user edit", async () => {
    const defaults = { a: "", b: 0 };
    const form = reactive({ ...defaults });
    const binding = bindFormDraft("unit:noskip", form, defaults);
    form.a = "one";
    await nextTick();
    binding.reset();
    await nextTick();
    form.a = "typed after reset";
    await nextTick();
    expect(peekDraft("unit:noskip")).toContain("typed after reset");
  });

  it("keep clears the draft without touching shown values", async () => {
    const defaults = { a: "" };
    const form = reactive({ ...defaults });
    const binding = bindFormDraft("unit:keep", form, defaults);
    form.a = "stays visible";
    await nextTick();
    binding.keep();
    await nextTick();
    expect(form.a).toBe("stays visible");
    expect(peekDraft("unit:keep")).toBe(null);
  });

  it("accepts a factory for defaults and recomputes it at reset time", async () => {
    let stamp = "t1";
    const form = reactive({ stamp: "" });
    const binding = bindFormDraft("unit:factory", form, () => ({ stamp: stamp }));
    form.stamp = "draft";
    await nextTick();
    stamp = "t2"; // would be picked up on every later reset
    binding.reset();
    await nextTick();
    expect(form.stamp).toBe("t2");
    expect(peekDraft("unit:factory")).toBe(null);
  });
});

describe("bindRefDraft", () => {
  it("restores ref values (reason string and evidence array) after a reload", async () => {
    const reason = ref("");
    const evidence = ref([]);
    bindRefDraft("unit:refs", { reason, evidence }, { reason: "", evidence: [] });
    reason.value = "the window was closed";
    evidence.value = [{ side: "RESPONDENT", kind: "URL", ref: "https://x.example" }];
    await nextTick();

    const reason2 = ref("");
    const evidence2 = ref([]);
    const rebinding = bindRefDraft("unit:refs", { reason: reason2, evidence: evidence2 }, {
      reason: "",
      evidence: [],
    });
    expect(rebinding.restored).toBe(true);
    expect(reason2.value).toBe("the window was closed");
    expect(evidence2.value).toEqual([{ side: "RESPONDENT", kind: "URL", ref: "https://x.example" }]);
  });

  it("reset clears both fields and the stored draft", async () => {
    const r = ref("");
    const binding = bindRefDraft("unit:refreset", { r }, { r: "" });
    r.value = "draft text";
    await nextTick();
    binding.reset();
    await nextTick();
    expect(r.value).toBe("");
    expect(peekDraft("unit:refreset")).toBe(null);
  });
});
