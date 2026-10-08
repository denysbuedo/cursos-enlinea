import { NextResponse } from "next/server";
import { requireAuth, signOfflineSyncToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-config";
import { getCourseContentVersion } from "@/lib/course-version";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function localized(value: unknown, lang = "es") {
  if (!value || typeof value !== "object") return String(value || "");
  const record = value as Record<string, unknown>;
  return String(record[lang] || record.es || record.en || "");
}

function addAudioResource(session: { resources: unknown; audioUrl: string | null }) {
  return [
    ...(Array.isArray(session.resources) ? session.resources : []),
    ...(session.audioUrl ? [{ title: "Audio de la sesión", url: session.audioUrl, type: "AUDIO" }] : []),
  ];
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        modules: {
          where: { sessions: { some: { status: "PUBLISHED" } } },
          orderBy: { order: "asc" },
          include: { sessions: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } } },
        },
        sessions: { where: { status: "PUBLISHED", moduleId: null }, orderBy: { order: "asc" } },
        instructor: { select: { name: true } },
      },
    });
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: session.userId, courseId: course.id, status: "ACTIVE" },
      include: { completions: { select: { sessionId: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (!enrollment && session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "El curso debe estar matriculado para exportarlo" }, { status: 403 });
    }

    const syncToken = enrollment
      ? await signOfflineSyncToken(session.userId, course.id, enrollment.id)
      : null;
    const packageData = {
      packageVersion: 2,
      courseId: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor.name,
      coverImageUrl: course.coverImageUrl,
      modules: course.modules.map((module) => ({
        ...module,
        sessions: module.sessions.map((courseSession) => ({
          ...courseSession,
          resources: addAudioResource(courseSession),
        })),
      })),
      sessions: course.sessions.map((courseSession) => ({
        ...courseSession,
        resources: addAudioResource(courseSession),
      })),
      progress: enrollment?.progress || 0,
      completedSessionIds: enrollment?.completions.map((completion) => completion.sessionId) || [],
      contentVersion: getCourseContentVersion(course),
      syncEndpoint: `${APP_URL.replace(/\/$/, "")}/api/offline/sync`,
      syncToken,
    };
    const serialized = JSON.stringify(packageData).replace(/<\/script/gi, "<\\/script");
    const title = localized(course.title);
    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Curso offline</title>
<style>
:root{--blue:#005aa9;--dark:#17212b;--muted:#52667a;--line:#d8e1ea;--soft:#f4f7fb;--success:#287a4b;--warning:#8a5a00}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--dark);font:16px/1.55 Arial,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px 72px}header{border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:34px}h1{margin:0 0 14px;color:#17212b;font-size:42px;line-height:1.15}h2{margin:0 0 12px;color:#17212b;font-size:26px;line-height:1.25}h3{margin:0 0 10px;font-size:18px;line-height:1.35}.muted{color:var(--muted)}#description{max-width:820px;font-size:18px;line-height:1.7;margin:0 0 22px}.cover{display:block;max-height:280px;width:100%;object-fit:contain;background:var(--soft);margin:24px 0 28px}.progress{height:12px;background:#e8ecf1;border-radius:8px;overflow:hidden;max-width:820px}.progress>span{display:block;height:100%;background:var(--blue);width:0;transition:width .2s}.sync-panel{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:16px}.sync-panel button,.session button{border:1px solid var(--blue);background:var(--blue);color:#fff;padding:9px 14px;cursor:pointer;font-weight:600}.sync-panel button:disabled,.session button:disabled{cursor:default;opacity:.7}.status{font-size:13px;color:var(--muted)}.status.success{color:var(--success)}.status.warning{color:var(--warning)}.module{border-top:1px solid var(--line);padding:30px 0 8px}.module+.module{margin-top:22px}.module>p{max-width:820px;margin:0 0 18px}.session{border-top:1px solid var(--line);padding:26px 0 28px;background:#fff}.session.done{background:#f3fbf6;border-top-color:#9bd3b0;padding-left:16px;padding-right:16px}.session p{max-width:900px;margin:0 0 14px}.session a{color:var(--blue)}.resource-list{margin-top:22px;padding:16px;border:1px solid var(--line);background:#f7f9fb;max-width:900px}.resource-list>strong{display:block;margin-bottom:10px}.resource{display:flex;align-items:center;gap:8px;margin:8px 0;padding:10px 12px;border:1px solid var(--line);background:#fff;color:var(--blue);text-decoration:none;font-weight:600}.resource::before{content:'↗';font-size:14px}.practice{margin:20px 0;padding:14px 16px;border-left:4px solid #7aa6d8;background:var(--soft);max-width:900px}@media(max-width:640px){main{padding:28px 16px 56px}h1{font-size:32px}#description{font-size:16px}.cover{max-height:210px}}@media print{button{display:none}}
</style></head><body><main><header><h1 id="title"></h1><p id="description" class="muted"></p><p class="status">Curso offline. Los videos y recursos externos requieren conexión para abrirse.</p><img id="cover" class="cover" alt="" hidden><div><strong>Progreso: <span id="progressLabel">0%</span></strong><div class="progress"><span id="progressBar"></span></div></div><div class="sync-panel"><button type="button" id="syncButton">Actualizar y sincronizar progreso</button><span id="syncStatus" class="status">Los cambios se guardan en este dispositivo.</span></div></header><section id="content"></section></main>
<script id="course-data">window.__COURSE_PACKAGE__=${serialized};</script>
<script>(function(){const COURSE=window.__COURSE_PACKAGE__;const key='curso-offline-'+String(COURSE.courseId||'curso').replace(/[^a-z0-9-]/gi,'');const stored=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};let done=new Set([...(COURSE.completedSessionIds||[]),...stored()]);const text=v=>{if(!v)return'';if(typeof v==='string')return v;return v.es||v.en||''};const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));const allSessions=()=>[...document.querySelectorAll('[data-session]')];function update(){const sessions=allSessions();const ids=new Set(sessions.map(el=>el.dataset.session));done=new Set([...done].filter(id=>ids.has(id)));const completed=sessions.filter(el=>done.has(el.dataset.session)).length;const percent=sessions.length?Math.round(completed/sessions.length*100):Number(COURSE.progress||0);document.getElementById('progressLabel').textContent=percent+'%';document.getElementById('progressBar').style.width=percent+'%';localStorage.setItem(key,JSON.stringify([...done]));sessions.forEach(el=>{const complete=done.has(el.dataset.session);el.classList.toggle('done',complete);const button=el.querySelector('[data-complete]');if(button){button.disabled=complete;button.textContent=complete?'Sesión completada':'Marcar como completada';}});}function sessionHtml(s){const resources=Array.isArray(s.resources)?s.resources.map(r=>'<a class="resource" target="_blank" rel="noopener" href="'+esc(r.url||'')+'">'+esc(r.title||r.url||'Recurso')+'</a>').join(''):'';const video=s.videoUrl?'<p><a target="_blank" rel="noopener" href="'+esc(s.videoUrl)+'">Abrir video ('+esc(s.videoPlatform||'enlace externo')+')</a></p>':'';const practice=text(s.practicePrompt)?'<div class="practice"><strong>Actividad de práctica</strong><br>'+esc(text(s.practicePrompt))+'</div>':'';return '<article class="session" data-session="'+esc(s.id)+'"><h3>'+esc(text(s.title))+'</h3><p class="muted">'+esc(text(s.description))+'</p>'+video+practice+(resources?'<div class="resource-list"><strong>Bibliografía y materiales</strong>'+resources+'</div>':'')+'<p><button type="button" data-complete="'+esc(s.id)+'">Marcar como completada</button></p></article>';}function render(){document.getElementById('title').textContent=text(COURSE.title);document.getElementById('description').textContent=text(COURSE.description);if(COURSE.coverImageUrl){const cover=document.getElementById('cover');cover.src=COURSE.coverImageUrl;cover.hidden=false;}document.getElementById('content').innerHTML=(COURSE.modules||[]).map(m=>'<section class="module"><h2>'+esc(text(m.title))+'</h2><p class="muted">'+esc(text(m.description))+'</p>'+((m.sessions||[]).map(sessionHtml).join(''))+'</section>').join('')+(COURSE.sessions||[]).map(sessionHtml).join('');document.querySelectorAll('[data-complete]').forEach(button=>button.addEventListener('click',()=>{done.add(button.dataset.complete);update();}));update();}async function syncOffline(){const status=document.getElementById('syncStatus');if(!COURSE.syncToken){status.textContent='Este paquete no tiene una matrícula sincronizable.';return;}if(!navigator.onLine){status.textContent='Sin conexión. Los cambios quedan guardados en este dispositivo.';return;}status.className='status';status.textContent='Actualizando progreso...';try{const response=await fetch(COURSE.syncEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+COURSE.syncToken},body:JSON.stringify({completedSessionIds:[...done],contentVersion:COURSE.contentVersion})});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo sincronizar');done=new Set(result.data.completedSessionIds||[]);update();if(result.data.contentChanged){status.className='status warning';status.textContent='El curso tiene una versión más reciente. Descargue nuevamente el paquete para estudiar con el contenido actualizado.';}else{status.className='status success';status.textContent='Progreso actualizado y sincronizado correctamente: '+result.data.progress+'%';}}catch(error){status.className='status warning';status.textContent='No se pudo sincronizar: '+(error.message||'error de conexión');}}render();document.getElementById('syncButton').addEventListener('click',syncOffline);window.addEventListener('online',syncOffline);if(navigator.onLine)window.addEventListener('load',()=>void syncOffline());})();</script></body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${course.slug}-offline.html"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo exportar el curso offline" }, { status: 500 });
  }
}
