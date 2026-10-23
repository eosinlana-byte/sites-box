const $ = (s) => document.querySelector(s);
const toast = (text, ms = 2500) => {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
};
const esc = (v) =>
  String(v || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(url, options = {}) {
  if (url.startsWith("/api") || url.startsWith("/admin")) url = "/smith" + url;
  const r = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed (" + r.status + ")");
  return data;
}
let content = { portfolios: [], testimonials: [], enquiries: [] };

function tagChips(tags) {
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join("");
}

function workCard(x) {
  const shot = x.image
    ? `<img class="work-shot" src="${esc(x.image)}" alt="">`
    : `<div class="work-shot blank">No image</div>`;
  const url = String(x.url || "").trim();
  const link = url
    ? `<a class="work-url" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url.replace(/^https?:\/\//, ""))}</a>`
    : `<span class="work-url off">No live URL</span>`;
  return `<article class="work-card">${shot}<div class="work-body">
    <h3>${esc(x.name)}</h3>
    ${link}
    <p class="work-desc">${esc(x.description)}</p>
    <div class="work-tags">${tagChips(x.tags)}</div>
    <div class="work-actions">
      <button class="btn ghost" data-pe="${x.id}" type="button">Edit</button>
      <button class="btn danger" data-pd="${x.id}" type="button">Delete</button>
    </div>
  </div></article>`;
}

function render() {
  $("#portfolioRows").innerHTML = content.portfolios.length
    ? content.portfolios.map(workCard).join("")
    : '<p class="empty">No portfolio items yet. Add work and it will show on the public site.</p>';
  $("#testimonialRows").innerHTML = content.testimonials.length
    ? content.testimonials
        .map(
          (x) =>
            `<tr><td>${x.image ? `<img class="admin-thumb" src="${x.image}" alt="">` : "No image"}</td><td>${esc(x.client)}</td><td>${esc(x.role)}</td><td class="row-actions"><button class="btn ghost" data-te="${x.id}">Edit</button><button class="btn danger" data-td="${x.id}">Delete</button></td></tr>`
        )
        .join("")
    : '<tr><td colspan="4" class="empty">No testimonials.</td></tr>';
  $("#enquiryRows").innerHTML = content.enquiries.length
    ? content.enquiries
        .map(
          (x) =>
            `<tr><td>${x.created_at ? new Date(x.created_at).toLocaleString() : ""}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.project_type)}</td><td>${esc(x.budget)}</td><td>${esc(x.message)}</td></tr>`
        )
        .join("")
    : '<tr><td colspan="6" class="empty">No enquiries yet.</td></tr>';
  document.querySelectorAll("[data-pe]").forEach((b) => (b.onclick = () => openPortfolio(content.portfolios.find((x) => String(x.id) === b.dataset.pe))));
  document.querySelectorAll("[data-pd]").forEach((b) => (b.onclick = () => removeItem("portfolio", b.dataset.pd)));
  document.querySelectorAll("[data-te]").forEach((b) => (b.onclick = () => openTestimonial(content.testimonials.find((x) => String(x.id) === b.dataset.te))));
  document.querySelectorAll("[data-td]").forEach((b) => (b.onclick = () => removeItem("testimonial", b.dataset.td)));
}

async function load() {
  content = await api("/api/admin/content");
  render();
}

async function removeItem(kind, id) {
  if (!confirm("Delete this item?")) return;
  const key = kind === "portfolio" ? "portfolios" : "testimonials";
  const prev = content[key];
  content[key] = content[key].filter((x) => String(x.id) !== String(id));
  render();
  toast("Deleted");
  try {
    await api("/api/admin/" + kind + "/" + id, { method: "DELETE" });
  } catch (err) {
    content[key] = prev;
    render();
    toast(err.message);
  }
}

function showPreview(src) {
  const img = $("#portfolioPreview");
  if (src) {
    img.src = src;
    img.classList.add("on");
  } else {
    img.removeAttribute("src");
    img.classList.remove("on");
  }
}

function openPortfolio(x) {
  $("#portfolioId").value = x?.id || "";
  $("#portfolioName").value = x?.name || "";
  $("#portfolioDescription").value = x?.description || "";
  $("#portfolioUrl").value = x?.url || "";
  $("#portfolioTags").value = x?.tags || "";
  $("#portfolioQuote").value = x?.quote || "";
  $("#portfolioImage").value = "";
  $("#portfolioModalTitle").textContent = x ? "Edit work" : "Add work";
  showPreview(x?.image || "");
  $("#portfolioModal").classList.add("open");
}
function openTestimonial(x) {
  $("#testimonialId").value = x?.id || "";
  $("#testimonialQuote").value = x?.quote || "";
  $("#testimonialClient").value = x?.client || "";
  $("#testimonialRole").value = x?.role || "";
  $("#testimonialImage").value = "";
  $("#testimonialModalTitle").textContent = x ? "Edit testimonial" : "Add testimonial";
  $("#testimonialModal").classList.add("open");
}
function closeModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("open"));
}
$("#addPortfolio").onclick = () => openPortfolio();
$("#addTestimonial").onclick = () => openTestimonial();
document.querySelectorAll(".cancel,.backdrop").forEach((x) => (x.onclick = closeModals));
$("#portfolioImage").onchange = () => {
  const file = $("#portfolioImage").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => showPreview(reader.result);
  reader.readAsDataURL(file);
};
function fileData(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$("#portfolioForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("#portfolioId").value;
  const body = {
    name: $("#portfolioName").value,
    description: $("#portfolioDescription").value,
    url: $("#portfolioUrl").value,
    tags: $("#portfolioTags").value,
    quote: $("#portfolioQuote").value,
    image: await fileData($("#portfolioImage").files[0]),
  };
  closeModals();
  toast(id ? "Edited" : "Added");
  const temp = { id: id || "tmp-" + Date.now(), ...body };
  if (id) content.portfolios = content.portfolios.map((x) => (String(x.id) === String(id) ? { ...x, ...temp, image: body.image || x.image } : x));
  else content.portfolios = [...content.portfolios, temp];
  render();
  try {
    const saved = await api(id ? "/api/admin/portfolio/" + id : "/api/admin/portfolio", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    if (saved && saved.id) {
      content.portfolios = content.portfolios.map((x) => (String(x.id) === String(temp.id) ? saved : x));
      render();
    }
  } catch (err) {
    toast(err.message);
    load().catch(() => {});
  }
};

$("#testimonialForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("#testimonialId").value;
  const file = $("#testimonialImage").files[0];
  if (file && file.size > 400000) {
    toast("Photo too large. Use a smaller jpg.");
    return;
  }
  const body = {
    quote: $("#testimonialQuote").value,
    client: $("#testimonialClient").value,
    role: $("#testimonialRole").value,
    image: await fileData(file),
  };
  if (!id && !body.image) {
    toast("Add a screenshot");
    return;
  }
  try {
    const saved = await api(id ? "/api/admin/testimonial/" + id : "/api/admin/testimonial", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    closeModals();
    toast(id ? "Edited" : "Added");
    if (saved && saved.id) {
      if (id) content.testimonials = content.testimonials.map((x) => (String(x.id) === String(id) ? saved : x));
      else content.testimonials = [saved, ...content.testimonials];
    }
    render();
    await load();
  } catch (err) {
    toast(err.message, 6000);
  }
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("on"));
    tab.classList.add("on");
    document.querySelectorAll("main section").forEach((s) => s.classList.toggle("hidden", s.id !== tab.dataset.tab));
  };
});
$("#logout").onclick = async () => {
  await fetch("/smith/admin/logout", { method: "POST" });
  location.reload();
};
load().catch((e) => toast(e.message || "Could not load"));
