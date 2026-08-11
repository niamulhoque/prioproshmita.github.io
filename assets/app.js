(() => {
const $=s=>document.querySelector(s);
function loadTrips(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch(e){return []}}
function saveTrips(t){localStorage.setItem(STORAGE_KEY,JSON.stringify(t))}
function districtBySlug(slug){return DISTRICTS.find(d=>d.slug===slug)}
function visitedSet(){return new Set(loadTrips().map(t=>t.districtId))}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function photoMarkup(t,cls=""){return t.photos?.[0]?`<img class="${cls}" src="${t.photos[0]}" alt="${escapeHtml(t.title)}">`:`<div class="trip-photo">📷</div>`}

async function buildMap(){
 const svg=$("#bdMap"); if(!svg) return;
 try{
   const res=await fetch(GEOJSON_URL);
   if(!res.ok) throw Error("GeoJSON failed");
   const geo=await res.json();
   const features=(geo.features||[]).filter(f=>f.geometry && ["Polygon","MultiPolygon"].includes(f.geometry.type));
   if(features.length<60) throw Error("District boundary data incomplete");

   let minX=999,maxX=-999,minY=999,maxY=-999;
   const allRings=[];
   const collect=(rings)=>{
     rings.forEach(r=>r.forEach(([x,y])=>{
       minX=Math.min(minX,x); maxX=Math.max(maxX,x);
       minY=Math.min(minY,y); maxY=Math.max(maxY,y);
     }));
   };
   features.forEach(f=>{
     const g=f.geometry;
     if(g.type==="Polygon"){ collect(g.coordinates); allRings.push({f,rings:g.coordinates}); }
     else { g.coordinates.forEach(poly=>{collect(poly); allRings.push({f,rings:poly});}); }
   });

   const pad=38,W=700,H=820;
   const scale=Math.min((W-pad*2)/(maxX-minX),(H-pad*2)/(maxY-minY));
   const sx=x=>pad+(x-minX)*scale;
   const sy=y=>H-(pad+(y-minY)*scale);
   const visited=visitedSet();
   const frag=document.createDocumentFragment();

   features.forEach(f=>{
     const p=f.properties||{};
     const name=p.shapeName||p.shape_name||p.name||p.NAME||p.district||p.DISTRICT||p.dt_name||p.district_name||"District";
     const bn=p.bn_name||p.BN_NAME||p.shapeNameBn||p.shapeNameBN||"";
     const match=districtByName(name,bn);
     const slug=match?.slug||String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
     const id=match?.id;
     const polygons=f.geometry.type==="Polygon"? [f.geometry.coordinates] : f.geometry.coordinates;
     const pathD=polygons.flatMap(poly=>poly.map(r=>r.map(([x,y],i)=>`${i?"L":"M"}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(" ")+" Z")).join(" ");
     const path=document.createElementNS("http://www.w3.org/2000/svg","path");
     path.setAttribute("d",pathD);
     path.classList.add("district");
     if(id&&visited.has(id)) path.classList.add("visited");
     path.dataset.slug=slug; path.dataset.name=name; path.dataset.bn=bn; path.dataset.id=id||"";
     const label=match?`${match.name} • ${match.bn}`:name;
     path.setAttribute("aria-label",label);
     // Native browser tooltip: always shows the district name on hover.
     const title=document.createElementNS("http://www.w3.org/2000/svg","title");
     title.textContent=label + (id&&visited.has(id) ? " — ✓ Visited" : "");
     path.appendChild(title);
     path.addEventListener("mouseenter",e=>{path.classList.add("hovered"); showDistrictCard(match,name,bn,id&&visited.has(id),e);});
     path.addEventListener("mousemove",e=>showDistrictCard(match,name,bn,id&&visited.has(id),e));
     path.addEventListener("mouseleave",()=>{path.classList.remove("hovered"); hideDistrictCard();});
     path.addEventListener("click",()=>location.href=`district.html?district=${encodeURIComponent(slug)}`);
     frag.appendChild(path);
   });

   svg.innerHTML="";
   svg.appendChild(frag);
   $("#mapLoading")?.classList.add("hidden");
   renderVisitedLabels(svg);
   renderDistrictDirectory();
 }catch(e){
   console.error(e);
   $("#mapLoading").innerHTML=`<div style="max-width:420px;text-align:center;padding:20px"><h3>Map data could not load</h3><p style="color:#6d7b72">The district boundary service could not be reached. Check your internet connection and try again.</p><button class="btn primary" onclick="location.reload()">Retry</button></div>`;
 }
}
function districtByName(en,bn){return DISTRICTS.find(d=>d.name.toLowerCase()===String(en).toLowerCase()||d.bn===bn||d.name.toLowerCase().replace(/[^a-z]/g,"")===String(en).toLowerCase().replace(/[^a-z]/g,""))}
function renderVisitedLabels(svg){
  [...svg.querySelectorAll("path.district.visited")].forEach(p=>{
    const bb=p.getBBox();
    const text=document.createElementNS("http://www.w3.org/2000/svg","text");
    text.setAttribute("x",bb.x+bb.width/2);
    text.setAttribute("y",bb.y+bb.height/2);
    text.setAttribute("class","map-label visited-label");
    text.textContent=(p.dataset.name||"").replace(/ District$/i,"");
    svg.appendChild(text);
  });
}
function showDistrictCard(match,name,bn,isVisited,e){
  const box=$("#districtHoverCard"); if(!box)return;
  const en=match?.name||name;
  const bangla=match?.bn||bn||"";
  box.innerHTML=`<strong>${escapeHtml(en)}</strong>${bangla?`<span>${escapeHtml(bangla)}</span>`:""}<small>${isVisited?"✓ Visited":"Not visited"} • Click to open story</small>`;
  if(e){
    const shell=box.parentElement.getBoundingClientRect();
    let x=e.clientX-shell.left+16, y=e.clientY-shell.top+16;
    const maxX=shell.width-box.offsetWidth-12;
    const maxY=shell.height-box.offsetHeight-12;
    box.style.left=Math.max(12,Math.min(x,maxX))+"px";
    box.style.top=Math.max(12,Math.min(y,maxY))+"px";
  }
  box.classList.add("show");
}
function hideDistrictCard(){$("#districtHoverCard")?.classList.remove("show")}
function renderDistrictDirectory(){
  const grid=$("#districtDirectory"); if(!grid)return;
  const visited=visitedSet();
  grid.innerHTML=DISTRICTS.map(d=>`<a class="district-chip ${visited.has(d.id)?"visited":""}" data-id="${d.id}" data-search="${escapeHtml((d.name+" "+d.bn).toLowerCase())}" href="district.html?district=${encodeURIComponent(d.slug)}"><span>${escapeHtml(d.name)}</span><small>${escapeHtml(d.bn)}</small>${visited.has(d.id)?'<b>✓</b>':""}</a>`).join("");
}
function showTip(e,txt){const t=$("#tooltip");if(!t)return;t.textContent=txt;t.style.display="block";const r=$("#map")?.getBoundingClientRect();t.style.left=(e.clientX-r.left+12)+"px";t.style.top=(e.clientY-r.top+12)+"px"}
function hideTip(){$("#tooltip")?.style&&($("#tooltip").style.display="none")}
function updateStats(){
 const trips=loadTrips(); const v=new Set(trips.map(t=>t.districtId));
 $("#visitedCount")&&($("#visitedCount").textContent=v.size);$("#tripCount")&&($("#tripCount").textContent=trips.length);
 const grid=$("#latestTrips"),empty=$("#emptyTrips");if(!grid)return;
 if(!trips.length){grid.innerHTML="";empty?.classList.remove("hidden");return}
 empty?.classList.add("hidden");
 grid.innerHTML=trips.slice().reverse().slice(0,6).map(t=>{const d=DISTRICTS.find(x=>x.id===t.districtId);return `<article class="trip-card"><div class="trip-photo">${photoMarkup(t)}</div><div class="trip-card-body"><div class="trip-meta">${escapeHtml(d?.name||"District")} • ${escapeHtml(t.date||"")}</div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.summary||"A memory from our journey.")}</p><a class="text-link" href="district.html?district=${encodeURIComponent(d?.slug||"")}">Read story →</a></div></article>`}).join("");
}
function searchMap(){
 const q=($("#districtSearch")?.value||"").toLowerCase().trim();
 document.querySelectorAll(".district").forEach(p=>{
   const hay=(p.dataset.name+" "+p.dataset.bn).toLowerCase();
   p.classList.toggle("dim",!!q&&!hay.includes(q));
   p.classList.toggle("search-hit",!!q&&hay.includes(q));
 });
 document.querySelectorAll(".district-chip").forEach(c=>{
   c.classList.toggle("search-hidden",!!q&&!c.dataset.search.includes(q));
 });
}
function initDistrict(){
 const el=$("#districtPage");if(!el)return;const slug=new URLSearchParams(location.search).get("district")||"";const d=districtBySlug(slug);
 if(!d){el.innerHTML=`<section class="district-hero"><a class="back" href="index.html">← Back to map</a><h1>District not found</h1></section>`;return}
 const trips=loadTrips().filter(t=>t.districtId===d.id); const latest=trips[trips.length-1];
 el.innerHTML=`<section class="district-hero"><a class="back" href="index.html">← Back to Bangladesh map</a><div class="district-kicker"><span class="eyebrow">${escapeHtml(d.division)} DIVISION</span></div><h1>${escapeHtml(d.name)}<span>${escapeHtml(d.bn)}</span></h1></section>
 <section class="district-content"><div class="story-layout"><div><p class="eyebrow">OUR JOURNEY</p><h2>${escapeHtml(latest?.title||"No trip recorded yet")}</h2><div class="story">${escapeHtml(latest?.story||"We have not added a story for this district yet. Use the Add New Trip page to record your memories.")}</div></div><aside class="side-card"><h3>Places we visited</h3><div class="places">${(latest?.places||[]).map(x=>`<span class="place">${escapeHtml(x)}</span>`).join("")||"<span style='color:#7b877e;font-size:13px'>Add places from the trip form.</span>"}</div></aside></div>
 <div class="gallery">${trips.flatMap(t=>(t.photos||[]).map((src,i)=>`<figure><img src="${src}" alt="${escapeHtml(t.title)} photo ${i+1}" loading="lazy" onclick="openLightbox(this.src)"></figure>`)).join("")||"<div class='empty-state' style='grid-column:1/-1'>📷 No photos yet.</div>"}</div>
 <div class="timeline"><p class="eyebrow" style="margin-top:55px">TRIP TIMELINE</p>${trips.slice().reverse().map(t=>`<div class="timeline-item"><div class="timeline-date">${escapeHtml(t.date||"Undated trip")}</div><h3>${escapeHtml(t.title)}</h3><p class="story">${escapeHtml(t.summary||"")}</p></div>`).join("")||"<p style='color:#7b877e'>Your trips will appear here as you add them.</p>"}</div></section>`;
}
window.openLightbox=function(src){const d=document.createElement("div");d.style="position:fixed;inset:0;background:#07140fe8;z-index:100;display:grid;place-items:center;padding:20px;cursor:zoom-out";d.innerHTML=`<img src="${src}" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:12px;box-shadow:0 30px 80px #0008">`;d.onclick=()=>d.remove();document.body.appendChild(d)}
async function initForm(){
 const form=$("#tripForm");if(!form)return;const select=$("#district");DISTRICTS.forEach(d=>{const o=document.createElement("option");o.value=d.id;o.textContent=`${d.name} — ${d.bn}`;select.appendChild(o)});
 const preview=$("#preview"), photos=$("#photos"); let photoData=[];
 photos.addEventListener("change",async()=>{preview.innerHTML="";photoData=[];for(const f of photos.files){const src=await resizeImage(f,1400,.82);photoData.push(src);const img=document.createElement("img");img.src=src;preview.appendChild(img)}});
 form.addEventListener("submit",e=>{e.preventDefault();const places=$("#places").value.split(",").map(x=>x.trim()).filter(Boolean);const trip={id:crypto.randomUUID?.()||String(Date.now()),districtId:select.value,date:$("#date").value,title:$("#title").value.trim(),summary:$("#summary").value.trim(),story:$("#story").value.trim(),places,photos:photoData};const trips=loadTrips();trips.push(trip);saveTrips(trips);$("#saveMsg").textContent="Saved successfully. Opening the district page…";setTimeout(()=>location.href=`district.html?district=${encodeURIComponent(DISTRICTS.find(d=>d.id===trip.districtId).slug)}`,500)});
 $("#exportBtn")?.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(loadTrips(),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="our-travel-diary-backup.json";a.click();URL.revokeObjectURL(a.href)});
 $("#importFile")?.addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const arr=JSON.parse(await f.text());if(!Array.isArray(arr))throw Error();saveTrips(arr);location.reload()}catch{alert("Invalid diary backup file.")}});
 $("#clearBtn")?.addEventListener("click",()=>{if(confirm("Delete all trips stored in this browser?")){localStorage.removeItem(STORAGE_KEY);location.reload()}});
}
function resizeImage(file,max,quality){return new Promise(resolve=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",quality))};img.src=r.result};r.readAsDataURL(file)})}
document.addEventListener("DOMContentLoaded",()=>{updateStats();buildMap();initDistrict();initForm();$("#districtSearch")?.addEventListener("input",searchMap);$("#resetMap")?.addEventListener("click",()=>{$("#districtSearch").value="";searchMap()})});
})();
