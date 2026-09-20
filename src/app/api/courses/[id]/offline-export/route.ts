import { NextResponse } from "next/server";
import { requireAuth, signOfflineSyncToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function localized(value: unknown, lang = "es") {
  if (!value || typeof value !== "object") return String(value || "");
  const record = value as Record<string, unknown>;
  return String(record[lang] || record.es || record.en || "");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        modules: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, include: { sessions: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } } } },
        sessions: { where: { status: "PUBLISHED", moduleId: null }, orderBy: { order: "asc" } },
        evaluations: { take: 1 },
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
      title: course.title,
      description: course.description,
      instructor: course.instructor.name,
      coverImageUrl: course.coverImageUrl,
      modules: course.modules,
      sessions: course.sessions,
      evaluation: course.evaluations[0] || null,
      progress: enrollment?.progress || 0,
      completedSessionIds: enrollment?.completions.map((completion) => completion.sessionId) || [],
      syncEndpoint: `${new URL(request.url).origin}/api/offline/sync`,
      syncToken,
    };
    const serialized = JSON.stringify(packageData).replace(/<\/script/gi, "<\\/script");
    const title = localized(course.title);
    let html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Curso offline</title>
<style>
:root{--blue:#005aa9;--dark:#17212b;--muted:#52667a;--line:#d8e1ea;--soft:#f4f7fb}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--dark);font:16px/1.55 Arial,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px 72px}header{border-bottom:1px solid var(--line);padding-bottom:30px;margin-bottom:34px}h1{margin:0 0 14px;color:#17212b;font-size:42px;line-height:1.15;letter-spacing:-.01em}h2{margin:0 0 12px;color:#17212b;font-size:26px;line-height:1.25}h3{margin:0 0 10px;font-size:18px;line-height:1.35}.muted{color:var(--muted)}#description{max-width:820px;font-size:18px;line-height:1.7;margin:0 0 22px}.cover{display:block;max-height:280px;width:100%;object-fit:contain;background:var(--soft);margin:24px 0 28px}.progress{height:12px;background:#e8ecf1;border-radius:8px;overflow:hidden;max-width:820px}.progress>span{display:block;height:100%;background:var(--blue);width:0;transition:width .2s}.module{border-top:1px solid var(--line);padding:30px 0 8px}.module+.module{margin-top:22px}.module>p{max-width:820px;margin:0 0 18px}.session{border-top:1px solid var(--line);padding:26px 0 28px;background:#fff}.session.done{background:#f3fbf6;border-top-color:#9bd3b0;padding-left:16px;padding-right:16px}.session p{max-width:900px;margin:0 0 14px}.session button,.evaluate{border:1px solid var(--blue);background:var(--blue);color:#fff;padding:9px 14px;cursor:pointer;font-weight:600}.session a{color:var(--blue)}.resource-list{margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.resource{display:block;margin:9px 0}.practice{margin:20px 0;padding:14px 16px;border-left:4px solid #7aa6d8;background:var(--soft);max-width:900px}.question{border-top:1px solid var(--line);padding:20px 0}.status{font-size:13px;color:var(--muted)}@media(max-width:640px){main{padding:28px 16px 56px}h1{font-size:32px}#description{font-size:16px}.cover{max-height:210px}}@media print{button{display:none}}
 </style><style>.session p:has(a[href]){position:relative;display:flex;align-items:center;justify-content:center;min-height:150px;max-width:900px;margin:22px 0;padding:20px;background:#10283d;border:1px solid #234b69;border-radius:6px;overflow:hidden}.session p:has(a[href])::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,90,169,.45),rgba(16,40,61,.92))}.session p:has(a[href]) a{position:relative;display:inline-flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:700;border:1px solid rgba(255,255,255,.7);padding:10px 16px;background:rgba(0,0,0,.2)}.session p:has(a[href]) a::before{content:"▶";font-size:14px}.session p:has(a[href]) a:hover{background:rgba(255,255,255,.12)}</style></head><body><main><header><h1 id="title"></h1><p id="description" class="muted"></p><p class="status">Curso offline · Los videos y recursos externos requieren conexión para abrirse.</p><img id="cover" class="cover" alt="" hidden><div><strong>Progreso: <span id="progressLabel">0%</span></strong><div class="progress"><span id="progressBar"></span></div></div><div class="sync-panel"><button type="button" id="syncButton">Sincronizar progreso</button><span id="syncStatus" class="status">Los cambios se guardan en este dispositivo.</span></div></header><section id="content"></section><section id="evaluation"></section></main>
<script>const COURSE=${serialized};const key='curso-offline-'+btoa(unescape(encodeURIComponent(COURSE.title.es||COURSE.title.en))).replace(/[^a-z0-9]/gi,'');const done=new Set([...(COURSE.completedSessionIds||[]),...JSON.parse(localStorage.getItem(key)||'[]')]);const text=v=>{if(!v)return'';if(typeof v==='string')return v;return v.es||v.en||''};const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));function update(){const all=[...document.querySelectorAll('[data-session]')];const percent=all.length?Math.round(done.size/all.length*100):Number(COURSE.progress||0);document.getElementById('progressLabel').textContent=percent+'%';document.getElementById('progressBar').style.width=percent+'%';localStorage.setItem(key,JSON.stringify([...done]));all.forEach(el=>el.classList.toggle('done',done.has(el.dataset.session)));}function sessionHtml(s){const resources=Array.isArray(s.resources)?s.resources.map(r=>'<a class="resource" target="_blank" rel="noopener" href="'+esc(r.url||'')+'">'+esc(r.title||r.url||'Recurso')+'</a>').join(''):'';const video=s.videoUrl?'<p><a target="_blank" rel="noopener" href="'+esc(s.videoUrl)+'">Abrir video ('+esc(s.videoPlatform||'enlace externo')+')</a></p>':'';const practice=text(s.practicePrompt)?'<div class="practice"><strong>Actividad de práctica</strong><br>'+esc(text(s.practicePrompt))+'</div>':'';return '<article class="session" data-session="'+esc(s.id)+'"><h3>'+esc(text(s.title))+'</h3><p class="muted">'+esc(text(s.description))+'</p>'+video+practice+(resources?'<div><strong>Bibliografía y materiales</strong>'+resources+'</div>':'')+'<p><button type="button" data-complete="'+esc(s.id)+'">Marcar como completada</button></p></article>';}function evaluateOffline(){const evaluation=COURSE.evaluation;let correct=0;let answered=0;(evaluation.questions||[]).forEach((question,index)=>{const selected=document.querySelector('input[name="q'+index+'"]:checked');if(!selected)return;answered++;const expected=question.correctAnswer||[];const option=(question.options||[]).find(item=>String(item.id||item.value||item.text)===selected.value);if(expected.includes(selected.value)||(option&&option.correct===true))correct++;});const score=evaluation.questions.length?Math.round(correct/evaluation.questions.length*100):0;localStorage.setItem(key+'-evaluation',JSON.stringify({score,correct,answered}));document.getElementById('evaluationResult').textContent='Resultado guardado en este dispositivo: '+score+'% ('+correct+'/'+evaluation.questions.length+')';}document.getElementById('title').textContent=text(COURSE.title);document.getElementById('description').textContent=text(COURSE.description);if(COURSE.coverImageUrl){const cover=document.getElementById('cover');cover.src=COURSE.coverImageUrl;cover.hidden=false;}document.getElementById('content').innerHTML=(COURSE.modules||[]).map(m=>'<section class="module"><h2>'+esc(text(m.title))+'</h2><p class="muted">'+esc(text(m.description))+'</p>'+((m.sessions||[]).map(sessionHtml).join(''))+'</section>').join('')+(COURSE.sessions||[]).map(sessionHtml).join('');document.querySelectorAll('[data-complete]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.complete;if(done.has(id))done.delete(id);else done.add(id);update();}));const evaluation=COURSE.evaluation;if(evaluation&&Array.isArray(evaluation.questions)&&evaluation.questions.length){document.getElementById('evaluation').innerHTML='<h2>'+esc(text(evaluation.title))+'</h2><p class="muted">Aprobación: '+esc(evaluation.passingScore)+'%</p>'+evaluation.questions.map((q,i)=>'<div class="question"><strong>'+((i+1))+'. '+esc(text(q.prompt||q.question))+'</strong>'+((q.options||[]).map(o=>'<label style="display:block"><input type="radio" name="q'+i+'" value="'+esc(o.id||o.value||o.text)+'"> '+esc(text(o.text||o))+'</label>').join(''))+'</div>').join('')+'<button class="evaluate" type="button" onclick="evaluateOffline()">Guardar respuestas</button><p id="evaluationResult" class="status"></p>';}update();</script></body></html>`;
    html = html.replace("let correct=0;let answered=0;", "let correct=0;let answered=0;const answers=[];");
    html = html.replace("if(!selected)return;answered++;", "if(!selected)return;answered++;answers.push({questionId:question.id||('q'+(index+1)),answer:selected.value});");
    html = html.replace("JSON.stringify({score,correct,answered})", "JSON.stringify({score,correct,answered,answers})");
    html = html.replace("update();</script>", `update();
async function syncOffline(){
  const status=document.getElementById('syncStatus');
  if(!COURSE.syncToken){status.textContent='Este paquete no tiene una matrícula sincronizable.';return;}
  if(!navigator.onLine){status.textContent='Sin conexión. Los cambios quedan guardados en este dispositivo.';return;}
  status.textContent='Sincronizando...';
  const savedEvaluation=JSON.parse(localStorage.getItem(key+'-evaluation')||'null');
  const evaluation=COURSE.evaluation&&savedEvaluation&&Array.isArray(savedEvaluation.answers)?{evaluationId:COURSE.evaluation.id,answers:savedEvaluation.answers}:null;
  try{
    const response=await fetch(COURSE.syncEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+COURSE.syncToken},body:JSON.stringify({completedSessionIds:[...done],evaluation})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'No se pudo sincronizar');
    (result.data.completedSessionIds||[]).forEach(id=>done.add(id));
    update();
    status.textContent='Sincronizado correctamente · Progreso '+result.data.progress+'%';
  }catch(error){status.textContent='No se pudo sincronizar: '+error.message;}
}
document.getElementById('syncButton').addEventListener('click',syncOffline);window.addEventListener('online',syncOffline);</script>`);
    html = html.replaceAll("<div><strong>Bibliografía y materiales</strong>", "<div class=\"resource-list\"><strong>Bibliografía y materiales</strong>");
    html = html.replace("</head>", "<style>.resource-list{margin-top:22px;padding:16px;border:1px solid #d8e1ea;background:#f7f9fb;max-width:900px}.resource-list>strong{display:block;margin-bottom:10px;color:#17212b}.resource-list .resource{display:flex;align-items:center;gap:8px;margin:8px 0;padding:10px 12px;border:1px solid #d8e1ea;background:#fff;color:#005aa9;text-decoration:none;font-weight:600}.resource-list .resource::before{content:'↗';font-size:14px}.resource-list .resource:hover{border-color:#005aa9;background:#f4f8fc}</style></head>");
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${course.slug}-offline.html"`, "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "No se pudo exportar el curso offline" }, { status: 500 });
  }
}
