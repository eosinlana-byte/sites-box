require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 }) : null;
if (pool) pool.on('error', (e) => console.error('smith pg', e.message));
async function dbq(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

async function initDb() {
  if (!pool) return;
  async function run(sql, params) {
    try { return await dbq(sql, params); }
    catch (e) { console.error("smith sql:", e.message); return null; }
  }
  await run("CREATE SCHEMA IF NOT EXISTS smith");
  await run(`CREATE TABLE IF NOT EXISTS smith.enquiries (id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,project_type TEXT NOT NULL,budget TEXT,message TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS smith.portfolios (id SERIAL PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,url TEXT,tags TEXT,image TEXT,quote TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`);
  await run("ALTER TABLE smith.portfolios ADD COLUMN IF NOT EXISTS image TEXT");
  await run("ALTER TABLE smith.portfolios ADD COLUMN IF NOT EXISTS quote TEXT");
  await run("ALTER TABLE smith.portfolios ADD COLUMN IF NOT EXISTS result TEXT");
  await run(`CREATE TABLE IF NOT EXISTS smith.subscribers (id SERIAL PRIMARY KEY,email TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS smith.posts (id SERIAL PRIMARY KEY,slug TEXT UNIQUE NOT NULL,title TEXT NOT NULL,excerpt TEXT DEFAULT '',body TEXT DEFAULT '',created_at TIMESTAMPTZ DEFAULT NOW())`);

  // Smith must not share the name "testimonials" with Mira/Morgan.
  // Their table has quote/name, not client. That is the toast you saw.
  await run(`CREATE TABLE IF NOT EXISTS sm_testimonials (
    id SERIAL PRIMARY KEY,
    quote TEXT DEFAULT '',
    client TEXT NOT NULL DEFAULT '',
    role TEXT DEFAULT '',
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await run("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS quote TEXT DEFAULT ''");
  await run("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS client TEXT DEFAULT ''");
  await run("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS role TEXT DEFAULT ''");
  await run("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''");
  await run("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await run("ALTER TABLE smith.testimonials ADD COLUMN IF NOT EXISTS client TEXT DEFAULT ''");
  await run("ALTER TABLE smith.testimonials ADD COLUMN IF NOT EXISTS quote TEXT DEFAULT ''");
  await run("ALTER TABLE smith.testimonials ADD COLUMN IF NOT EXISTS role TEXT DEFAULT ''");
  await run("ALTER TABLE smith.testimonials ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''");
  await run(`INSERT INTO sm_testimonials (quote, client, role, image, created_at)
    SELECT COALESCE(quote,''), COALESCE(client,''), COALESCE(role,''), COALESCE(image,''), COALESCE(created_at, NOW())
    FROM smith.testimonials
    WHERE (SELECT COUNT(*) FROM sm_testimonials) = 0`);

  const postCount = await run("SELECT COUNT(*)::int AS count FROM smith.posts");
  if (postCount && postCount.rows[0].count === 0) {
    await run("INSERT INTO smith.posts (slug,title,excerpt,body) VALUES ($1,$2,$3,$4)", [
      "before-i-build",
      "What I need before I build",
      "Pages, examples, deadline, and who will update the site after launch.",
      "A website goes faster when pages, examples, deadline, and who updates it are clear on day one."
    ]);
  }
  await run(`UPDATE smith.portfolios SET result='Live site with admin, songs, and enquiries.' WHERE name='Jackson Ryder' AND (result IS NULL OR result='')`);
  await run(`UPDATE smith.portfolios SET result='Studio can update work without a developer for every change.' WHERE name='Okolibooks Creative' AND (result IS NULL OR result='')`);
  await run(`UPDATE smith.portfolios SET result='Authors can send a brief from the site.', url='https://sites-box.onrender.com/mirah' WHERE name='Mirah Tracy'`);
  const count = await run("SELECT COUNT(*)::int AS count FROM smith.portfolios");
  if (count && count.rows[0].count === 0) {
    await run("INSERT INTO smith.portfolios (name, description, url, tags) VALUES ($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12)", [
      "Jackson Ryder","Personal website with portfolio, music, and contact features.","https://jackson-ryder.onrender.com/","DESIGN, FULL-STACK",
      "Okolibooks Creative","Creative studio site with portfolio, services, and admin tools.","https://okolibookscreative.onrender.com/","UI, ADMIN",
      "Mirah Tracy","Service website with structured pages and enquiry flow.","https://mirah-tracy.onrender.com/","DESIGN, FRONTEND"
    ]);
  }
}


app.get('/api/content', async (req,res) => {
  if (!pool) return res.json({ portfolios: [], testimonials: [] });
  try {
    const p = await dbq('SELECT * FROM smith.portfolios ORDER BY id');
    let t = { rows: [] };
    try { t = await dbq('SELECT * FROM sm_testimonials ORDER BY id DESC'); } catch (_) {}
    res.json({ portfolios: p.rows, testimonials: t.rows });
  } catch (e) {
    console.error(e);
    res.json({ portfolios: [], testimonials: [] });
  }
});
app.post('/api/enquiries', async (req,res) => {
  const {name,email,projectType,budget,message}=req.body;
  if(!name||!email||!message) return res.status(400).json({ok:false,error:'Please complete the required fields.'});
  if(!pool) return res.status(503).json({ok:false,error:'Form is not connected to email yet.'});
  try { await dbq('INSERT INTO smith.enquiries (name,email,project_type,budget,message) VALUES ($1,$2,$3,$4,$5)',[name,email,projectType,budget||'',message]); res.json({ok:true}); }
  catch(e){ console.error(e); res.status(500).json({ok:false,error:'The enquiry could not be saved. Please try again.'}); }
});

function cookieValue(req,name){const found=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));return found?decodeURIComponent(found.slice(name.length+1)):'';}
function sessionToken(){return crypto.createHmac('sha256',process.env.SM_ADMIN_PASSWORD||process.env.ADMIN_PASSWORD||'missing').update('smithmichael-admin').digest('hex');}
function loggedIn(req){return cookieValue(req,'smith_admin')===sessionToken();}
function loginPage(error=''){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smith Michael Admin</title><style>${adminCss()}</style></head><body><main class="login"><h1>Smith Michael</h1><p>Admin login</p>${error?`<p class="error">${esc(error)}</p>`:''}<form method="post" action="/smith/admin/login"><label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>SIGN IN</button></form></main></body></html>`;}
function adminCss(){return `*{box-sizing:border-box}body{margin:0;background:#121212;color:#f4f1ea;font:14px Inter,Arial,sans-serif;padding:28px}.login{width:min(430px,100%);margin:8vh auto;background:#1b1b1b;border:1px solid rgba(244,241,234,.14);padding:34px}.login h1{font-size:30px;margin:0}.login p{color:#a3a3a3}.error{color:#ef927f!important}label{display:grid;gap:8px;color:#a3a3a3;margin:18px 0}input,textarea{width:100%;padding:11px;background:#121212;border:1px solid #555;color:#f4f1ea;font:inherit}button{background:#e8a54b;color:#121212;border:0;padding:11px 16px;font-weight:bold;cursor:pointer}.admin-wrap{max-width:1200px;margin:auto}.admin-head{display:flex;justify-content:space-between;align-items:center;gap:15px;border-bottom:1px solid rgba(244,241,234,.14);padding-bottom:18px}.admin-head h1{margin:0}.panel{background:#1b1b1b;border:1px solid rgba(244,241,234,.14);padding:22px;margin:22px 0}.panel h2{margin-top:0}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.grid .full{grid-column:1/-1}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:left;vertical-align:top;padding:11px 8px;border-bottom:1px solid rgba(244,241,234,.14)}th{color:#e8a54b;font-size:12px}td{color:#d0d0d0}.actions{display:flex;gap:8px;flex-wrap:wrap}.danger{background:#9b3e35;color:#fff}.muted{color:#a3a3a3}@media(max-width:700px){.grid{grid-template-columns:1fr}.grid .full{grid-column:auto}table{display:block;overflow:auto;white-space:nowrap}}`;}

app.post('/api/subscribe', async (req,res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ ok:false, error:'Enter a valid email.' });
  if (!pool) return res.status(503).json({ ok:false, error:'Signup is not connected yet.' });
  try {
    await dbq('INSERT INTO smith.subscribers (email) VALUES ($1)', [email]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Could not save.' });
  }
});
app.get('/api/posts', async (_req,res) => {
  if (!pool) return res.json({ items: [] });
  try {
    const r = await dbq('SELECT slug,title,excerpt,created_at FROM smith.posts ORDER BY id DESC');
    res.json({ items: r.rows });
  } catch (e) {
    res.json({ items: [] });
  }
});
app.get('/blog', (_req,res) => res.sendFile(path.join(__dirname,'sm-blog.html')));
app.get('/blog/before-i-build', (_req,res) => res.sendFile(path.join(__dirname,'sm-blog-before.html')));
app.get('/blog/landing-or-full', (_req,res) => res.sendFile(path.join(__dirname,'sm-blog-landing.html')));
app.get('/blog/contact-form', (_req,res) => res.sendFile(path.join(__dirname,'sm-blog-form.html')));
app.get('/blog/after-launch', (_req,res) => res.sendFile(path.join(__dirname,'sm-blog-after.html')));
app.get('/checklist', (_req,res) => res.sendFile(path.join(__dirname,'sm-checklist.html')));
app.get('/admin',(req,res)=>{if(!loggedIn(req))return res.status(200).send(loginPage()); res.sendFile(path.join(__dirname,'sm-admin.html'));});
app.get('/api/admin/content',async(req,res)=>{
  if(!loggedIn(req))return res.status(401).json({error:'Login required'});
  const out={portfolios:[],testimonials:[],enquiries:[]};
  if(!pool)return res.json(out);
  try{ const p=await dbq('SELECT * FROM smith.portfolios ORDER BY id'); out.portfolios=p.rows; }catch(e){ console.error('smith portfolios',e.message); }
  try{ const t=await dbq('SELECT * FROM sm_testimonials ORDER BY id DESC'); out.testimonials=t.rows; }catch(e){ console.error('smith testimonials',e.message); }
  try{ const e=await dbq('SELECT * FROM smith.enquiries ORDER BY created_at DESC'); out.enquiries=e.rows; }catch(e){ console.error('smith enquiries',e.message); }
  res.json(out);
});
app.get('/api/admin/portfolio/:id/image',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});const r=await dbq('SELECT image FROM smith.portfolios WHERE id=$1',[req.params.id]);res.json({image:r.rows[0]?.image||''});});
app.get('/api/admin/testimonial/:id/image',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});const r=await dbq('SELECT image FROM sm_testimonials WHERE id=$1',[req.params.id]);res.json({image:r.rows[0]?.image||''});});
app.post('/api/admin/portfolio',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});const {name,description,url,tags,image,quote}=req.body;const r=await dbq('INSERT INTO smith.portfolios(name,description,url,tags,image,quote) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[name,description,url||'',tags||'',image||'',quote||'']);res.json(r.rows[0]);});
app.put('/api/admin/portfolio/:id',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});const {name,description,url,tags,image,quote}=req.body;const r=await dbq('UPDATE smith.portfolios SET name=$1,description=$2,url=$3,tags=$4,image=COALESCE(NULLIF($5,\'\'),image),quote=$6 WHERE id=$7 RETURNING *',[name,description,url||'',tags||'',image||'',quote||'',req.params.id]);res.json(r.rows[0]);});
app.delete('/api/admin/portfolio/:id',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});await dbq('DELETE FROM smith.portfolios WHERE id=$1',[req.params.id]);res.json({ok:true});});
app.post('/api/admin/testimonial',async(req,res)=>{
  if(!loggedIn(req))return res.status(401).json({error:'Login required'});
  const quote=String(req.body.quote||'').trim();
  const client=String(req.body.client||req.body.name||'').trim();
  const role=String(req.body.role||'').trim();
  const image=req.body.image||'';
  if(!client||!quote) return res.status(400).json({error:'Need a quote and a name'});
  const sql='INSERT INTO sm_testimonials(quote,client,role,image) VALUES($1,$2,$3,$4) RETURNING id,quote,client,role,created_at';
  const params=[quote,client,role,image];
  try {
    const r=await dbq(sql, params);
    return res.json(r.rows[0]);
  } catch(e) {
    console.error('smith testi insert', e.message);
    try {
      await dbq(`CREATE TABLE IF NOT EXISTS sm_testimonials (id SERIAL PRIMARY KEY,quote TEXT DEFAULT '',client TEXT NOT NULL DEFAULT '',role TEXT DEFAULT '',image TEXT DEFAULT '',created_at TIMESTAMPTZ DEFAULT NOW())`);
      await dbq("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS client TEXT DEFAULT ''");
      await dbq("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS quote TEXT DEFAULT ''");
      await dbq("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS role TEXT DEFAULT ''");
      await dbq("ALTER TABLE sm_testimonials ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''");
      const r=await dbq(sql, params);
      return res.json(r.rows[0]);
    } catch(e2) {
      console.error('smith testi retry', e2.message);
      res.status(500).json({error:e2.message||'Could not save'});
    }
  }
});
app.put('/api/admin/testimonial/:id',async(req,res)=>{
  if(!loggedIn(req))return res.status(401).json({error:'Login required'});
  const {quote,client,role,image}=req.body;
  try {
    const r=await dbq('UPDATE sm_testimonials SET quote=$1,client=$2,role=$3,image=COALESCE(NULLIF($4,\'\'),image) WHERE id=$5 RETURNING *',[quote||'',client,role||'',image||'',req.params.id]);
    res.json(r.rows[0]);
  } catch(e) {
    console.error('smith testi update', e.message);
    res.status(500).json({error:e.message||'Could not save'});
  }
});
app.delete('/api/admin/testimonial/:id',async(req,res)=>{if(!loggedIn(req))return res.status(401).json({error:'Login required'});await dbq('DELETE FROM sm_testimonials WHERE id=$1',[req.params.id]);res.json({ok:true});});
async function loadAdmin(res){const [e,p,t]=await Promise.all([dbq('SELECT * FROM smith.enquiries ORDER BY created_at DESC'),dbq('SELECT * FROM smith.portfolios ORDER BY id'),dbq('SELECT * FROM sm_testimonials ORDER BY id DESC')]);res.send(adminShell(`<section class="panel"><h2>Portfolio</h2><form method="post" action="/admin/portfolio/save"><input type="hidden" name="id"><div class="grid"><label>Name<input name="name" required></label><label>URL<input name="url" type="url"></label><label class="full">Description<input name="description" required></label><label class="full">Tags<input name="tags" placeholder="DESIGN, FRONTEND"></label></div><button>SAVE PORTFOLIO</button></form><table><tr><th>Name</th><th>Description</th><th>URL</th><th>Actions</th></tr>${p.rows.map(r=>`<tr><td><form method="post" action="/admin/portfolio/save"><input type="hidden" name="id" value="${r.id}"><input name="name" value="${escAttr(r.name)}" required></td><td><input name="description" value="${escAttr(r.description)}" required></td><td><input name="url" value="${escAttr(r.url)}"><input name="tags" value="${escAttr(r.tags)}"></td><td class="actions"><button>SAVE</button></form><form method="post" action="/admin/portfolio/delete"><input type="hidden" name="id" value="${r.id}"><button class="danger">DELETE</button></form></td></tr>`).join('')}</table></section><section class="panel"><h2>Testimonials</h2><form method="post" action="/admin/testimonial/save"><input type="hidden" name="id"><div class="grid"><label class="full">Quote<textarea name="quote" required></textarea></label><label>Client<input name="client" required></label><label>Role<input name="role"></label></div><button>SAVE TESTIMONIAL</button></form><table><tr><th>Quote</th><th>Client</th><th>Role</th><th>Actions</th></tr>${t.rows.map(r=>`<tr><td><form method="post" action="/admin/testimonial/save"><input type="hidden" name="id" value="${r.id}"><textarea name="quote" required>${esc(r.quote)}</textarea></td><td><input name="client" value="${escAttr(r.client)}" required></td><td><input name="role" value="${escAttr(r.role)}"></td><td><button>SAVE</button></form><form method="post" action="/admin/testimonial/delete"><input type="hidden" name="id" value="${r.id}"><button class="danger">DELETE</button></form></td></tr>`).join('')}</table></section><section class="panel"><h2>Enquiries</h2><p class="muted">${e.rows.length} saved enquiries</p><table><tr><th>Date</th><th>Name</th><th>Email</th><th>Project</th><th>Budget</th><th>Message</th></tr>${e.rows.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${esc(r.name)}</td><td><a href="mailto:${escAttr(r.email)}?subject=${encodeURIComponent('Re: your Smith Michael enquiry')}">${esc(r.email)}</a><br><a href="mailto:${escAttr(r.email)}?subject=${encodeURIComponent('Re: your Smith Michael enquiry')}">Reply by email ↗</a></td><td>${esc(r.project_type)}</td><td>${esc(r.budget)}</td><td>${esc(r.message)}</td></tr>`).join('')}</table></section>`));}
app.post('/admin/portfolio/save',async(req,res)=>{if(!loggedIn(req))return res.redirect('/admin');const {id,name,description,url,tags}=req.body;if(id)await dbq('UPDATE smith.portfolios SET name=$1,description=$2,url=$3,tags=$4 WHERE id=$5',[name,description,url||'',tags||'',id]);else await dbq('INSERT INTO smith.portfolios(name,description,url,tags) VALUES($1,$2,$3,$4)',[name,description,url||'',tags||'']);res.redirect('/admin');});
app.post('/admin/portfolio/delete',async(req,res)=>{if(loggedIn(req))await dbq('DELETE FROM smith.portfolios WHERE id=$1',[req.body.id]);res.redirect('/admin');});
app.post('/admin/testimonial/save',async(req,res)=>{if(!loggedIn(req))return res.redirect('/admin');const {id,quote,client,role}=req.body;if(id)await dbq('UPDATE sm_testimonials SET quote=$1,client=$2,role=$3 WHERE id=$4',[quote,client,role||'',id]);else await dbq('INSERT INTO sm_testimonials(quote,client,role) VALUES($1,$2,$3)',[quote,client,role||'']);res.redirect('/admin');});
app.post('/admin/testimonial/delete',async(req,res)=>{if(loggedIn(req))await dbq('DELETE FROM sm_testimonials WHERE id=$1',[req.body.id]);res.redirect('/admin');});
app.post('/admin/login',(req,res)=>{const configured=String(process.env.SM_ADMIN_USERNAME||process.env.ADMIN_USERNAME||'merlin').trim().toLowerCase();const pass=String(process.env.SM_ADMIN_PASSWORD||process.env.ADMIN_PASSWORD||'').trim();if(String(req.body.username||'').trim().toLowerCase()===configured&&String(req.body.password||'').trim()===pass){res.setHeader('Set-Cookie',`smith_admin=${encodeURIComponent(sessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);return res.redirect('/smith/admin');}res.status(401).send(loginPage('Incorrect username or password.'));});
app.post('/admin/logout',(req,res)=>{res.setHeader('Set-Cookie','smith_admin=; Path=/; Max-Age=0');res.redirect('/smith/admin');});
function adminShell(content){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smith Michael Admin</title><style>${adminCss()}</style></head><body><main class="admin-wrap"><header class="admin-head"><div><h1>Smith Michael</h1><p class="muted">Portfolio, testimonials, and enquiries</p></div><form method="post" action="/admin/logout"><button>LOG OUT</button></form></header>${content}</main></body></html>`;}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function escAttr(v){return esc(v);}
module.exports = { app, init: initDb };

if (require.main === module) {
  initDb()
    .then(() => app.listen(port, "0.0.0.0", () => console.log(`Smith Michael site listening on ${port}`)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
