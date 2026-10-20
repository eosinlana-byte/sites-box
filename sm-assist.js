(function () {
  const steps = ["type", "fresh", "name", "email", "notes", "done"];
  const state = { step: "type", type: "", fresh: "", name: "", email: "", notes: "" };

  const root = document.createElement("div");
  root.id = "smAssist";
  root.innerHTML = `
    <button class="gpt-fab" id="gptOpen" type="button" aria-label="Open project assistant">
      <span class="gpt-fab-dot"></span>
      Project assistant
    </button>
    <div class="gpt-panel" id="gptPanel" hidden>
      <header class="gpt-head">
        <div>
          <strong>Smith</strong>
          <span>Project assistant</span>
        </div>
        <div class="gpt-head-actions">
          <button type="button" id="gptFormSwitch">Use the form</button>
          <button type="button" id="gptClose" aria-label="Close">✕</button>
        </div>
      </header>
      <div class="gpt-thread" id="gptThread"></div>
      <div class="gpt-chips" id="gptChips"></div>
      <form class="gpt-form" id="gptForm">
        <input id="gptInput" autocomplete="off" placeholder="Message Smith..." />
        <button type="submit" aria-label="Send">➤</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  const panel = document.getElementById("gptPanel");
  const thread = document.getElementById("gptThread");
  const chips = document.getElementById("gptChips");
  const form = document.getElementById("gptForm");
  const input = document.getElementById("gptInput");

  function esc(v) {
    return String(v || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function add(role, text) {
    const row = document.createElement("div");
    row.className = "gpt-row " + role;
    const safe = esc(text);
    if (role === "bot") {
      row.innerHTML = `<div class="gpt-avatar">S</div><div class="gpt-bubble">${safe}</div>`;
    } else {
      row.innerHTML = `<div class="gpt-bubble">${safe}</div>`;
    }
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function setChips(items) {
    chips.innerHTML = "";
    items.forEach((label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.onclick = () => handle(label);
      chips.appendChild(b);
    });
  }

  function promptStep() {
    if (state.step === "type") {
      add("bot", "Hi. I can take a short brief for Smith. What do you need built?");
      setChips(["Business website", "Artist website", "Author website", "Landing page", "Custom website", "Other"]);
    } else if (state.step === "fresh") {
      add("bot", "Is this a new website, or a redesign of one you already have?");
      setChips(["New website", "Redesign"]);
    } else if (state.step === "name") {
      add("bot", "What is your name?");
      setChips([]);
    } else if (state.step === "email") {
      add("bot", "What email should Smith reply to?");
      setChips([]);
    } else if (state.step === "notes") {
      add("bot", "Tell me what the site should do. Pages, examples, deadline. Short is fine.");
      setChips([]);
    }
  }

  async function finish() {
    const message = [
      state.fresh,
      state.notes,
    ].filter(Boolean).join("\n\n");
    add("bot", "Saving that for Smith...");
    setChips([]);
    try {
      const r = await fetch("/smith/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          email: state.email,
          projectType: state.type,
          message: message || state.type,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not save");
      add("bot", "Saved. Smith replies within 24 hours. You can also email smithmichael221133@gmail.com");
    } catch (e) {
      add("bot", e.message + ". You can use the contact form on the page instead.");
    }
    state.step = "done";
  }

  function handle(text) {
    const t = String(text || "").trim();
    if (!t || state.step === "done") return;
    add("user", t);
    if (state.step === "type") {
      state.type = t;
      state.step = "fresh";
      promptStep();
      return;
    }
    if (state.step === "fresh") {
      state.fresh = t;
      state.step = "name";
      promptStep();
      return;
    }
    if (state.step === "name") {
      state.name = t;
      state.step = "email";
      promptStep();
      return;
    }
    if (state.step === "email") {
      if (!t.includes("@")) {
        add("bot", "I need a real email so Smith can reply.");
        return;
      }
      state.email = t;
      state.step = "notes";
      promptStep();
      return;
    }
    if (state.step === "notes") {
      state.notes = t;
      finish();
    }
  }

  function openAssist(e) {
    if (e) e.preventDefault();
    panel.hidden = false;
    document.getElementById("gptOpen").hidden = true;
    if (!thread.childElementCount) promptStep();
    input.focus();
  }
  function closeAssist() {
    panel.hidden = true;
    document.getElementById("gptOpen").hidden = false;
  }
  document.getElementById("gptOpen").onclick = openAssist;
  document.getElementById("gptClose").onclick = closeAssist;
  document.getElementById("gptFormSwitch").onclick = () => {
    closeAssist();
    const box = document.getElementById("contact");
    if (box) box.scrollIntoView({ behavior: "smooth" });
  };
  document.querySelectorAll("[data-open-assist]").forEach((el) => {
    el.addEventListener("click", openAssist);
  });
  window.openSmithAssist = openAssist;
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    handle(v);
  };
})();
