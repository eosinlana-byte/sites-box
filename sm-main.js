const heroVideo = document.querySelector(".hero-video");
const codePoster = document.querySelector(".code-poster");
if (heroVideo) {
  heroVideo.addEventListener("canplay", () => {
    if (codePoster) codePoster.style.display = "none";
  });
}

const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Saving enquiry...";
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/smith/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save enquiry.");
      form.reset();
      status.textContent = "Enquiry saved. I reply within 24 hours.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

const signup = document.querySelector("#signup-form");
const signupStatus = document.querySelector("#signup-status");
if (signup) {
  signup.addEventListener("submit", async (event) => {
    event.preventDefault();
    signupStatus.textContent = "Saving...";
    const email = new FormData(signup).get("email");
    try {
      const response = await fetch("/smith/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save.");
      signup.reset();
      signupStatus.innerHTML = 'Saved. <a href="/smith/checklist">Open the checklist ↗</a>';
    } catch (error) {
      signupStatus.textContent = error.message;
    }
  });
}

async function loadManagedContent() {
  const work = document.querySelector(".real-work");
  const testimonials = document.querySelector(".testimonial-grid");
  try {
    const response = await fetch("/smith/api/content");
    if (!response.ok) return;
    const data = await response.json();
    if (work && data.portfolios && data.portfolios.length) {
      work.innerHTML = data.portfolios
        .map((item, index) => {
          const colors = ["jackson-card", "okolibooks-card", "mirah-card"];
          const tags = String(item.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => `<span>${tag}</span>`)
            .join("");
          const proof = {
            "Jackson Ryder": "Mobile-first • Music player + admin • Contact form",
            "Okolibooks Creative": "Mobile-first • Admin for work • Enquiry form",
            "Mirah Tracy": "Mobile layout • Enquiry form • Service pages",
          };
          const resultLine = proof[item.name] || item.result || "";
          const result = resultLine ? `<p class="result">${escapeHtml(resultLine)}</p>` : "";
          const urlFix = { "Mirah Tracy": "https://sites-box.onrender.com/mirah" };
          const liveUrl = urlFix[item.name] || item.url || "#";
          let host = "";
          try {
            const u = new URL(liveUrl);
            host = u.host + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
          } catch (_) {}
          const urlLine = host ? `<p class="project-url">${escapeHtml(host)}</p>` : "";
          return `<article class="project"><a class="project-link" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer"><div class="live-card ${colors[index % colors.length]}">${item.image ? `<img class="portfolio-thumb" src="${item.image}" alt="">` : item.quote ? `<blockquote class="portfolio-quote">“${escapeHtml(item.quote)}”</blockquote>` : ""}<span>${escapeHtml(item.name)}</span><em>OPEN SITE ↗</em></div></a><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p>${result}${urlLine}<div class="tags">${tags}</div></article>`;
        })
        .join("");
    }
    const testiWrap = document.getElementById("testimonials");
    const navTesti = document.getElementById("navTesti");
    if (testimonials && data.testimonials && data.testimonials.length) {
      if (testiWrap) testiWrap.hidden = false;
      if (navTesti) navTesti.hidden = false;
      testimonials.innerHTML = data.testimonials
        .map(
          (item) =>
            `<figure class="testimonial-image-card">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.client)} testimonial">` : `<blockquote><p>${escapeHtml(item.quote || "")}</p><cite>${escapeHtml(item.client)}${item.role ? `, ${escapeHtml(item.role)}` : ""}</cite></blockquote>`}<figcaption>${escapeHtml(item.client)}${item.role ? `, ${escapeHtml(item.role)}` : ""}</figcaption></figure>`
        )
        .join("");
    } else if (testiWrap) {
      testiWrap.hidden = true;
    }
  } catch (_) {}
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
loadManagedContent();
const links = [...document.querySelectorAll('nav a[href^="#"]')];
const sections = [...document.querySelectorAll("main section[id]")];
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    }),
  { rootMargin: "-35% 0px -55% 0px" }
);
sections.forEach((section) => observer.observe(section));
