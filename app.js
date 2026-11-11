const $ = (id) => document.getElementById(id);
const STORE = { memories: "pacoca_memories_v1", history: "pacoca_history_v1", endpoint: "pacoca_endpoint_v1" };
let memories = JSON.parse(localStorage.getItem(STORE.memories) || "[]");
let history = JSON.parse(localStorage.getItem(STORE.history) || "[]");
$("endpoint").value = localStorage.getItem(STORE.endpoint) || "";

function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function addMessage(text, who){
  const el = document.createElement("article"); el.className = `bubble ${who}`;
  const label = document.createElement("b"); label.textContent = who === "user" ? "Você" : "Paçoca";
  const p = document.createElement("p"); p.textContent = text;
  el.append(label,p); $("messages").appendChild(el); el.scrollIntoView({behavior:"smooth",block:"end"});
}
function renderMemory(){
  $("memoryList").replaceChildren();
  if(!memories.length){ const p=document.createElement("p");p.className="hint";p.textContent="Ainda não há memórias guardadas."; $("memoryList").append(p);return; }
  memories.slice().reverse().forEach((m)=>{
    const card=document.createElement("div");card.className="memory-item";
    const p=document.createElement("p");p.textContent=m.text;
    const b=document.createElement("button");b.textContent="Excluir";b.onclick=()=>{memories=memories.filter(x=>x.id!==m.id);save(STORE.memories,memories);renderMemory();};
    card.append(p,b);$("memoryList").append(card);
  });
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===btn.dataset.view));
}));
$("memoryForm").addEventListener("submit",e=>{
  e.preventDefault();const text=$("memoryText").value.trim();if(!text)return;
  memories.push({id:crypto.randomUUID(),text,createdAt:new Date().toISOString()});save(STORE.memories,memories);$("memoryText").value="";renderMemory();
});
$("saveEndpoint").onclick=()=>{localStorage.setItem(STORE.endpoint,$("endpoint").value.trim());alert("Endereço salvo neste aparelho. A conexão só funcionará quando o servidor compatível estiver pronto.");};
$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({memories,history,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="memoria-pacoca.json";a.click();URL.revokeObjectURL(a.href);
};
async function send(){
  const text=$("messageInput").value.trim();if(!text)return;
  $("messageInput").value="";addMessage(text,"user");history.push({role:"user",content:text});save(STORE.history,history);
  const endpoint=localStorage.getItem(STORE.endpoint);
  if(!endpoint){
    const reply="Boa! Sua mensagem chegou. Ainda estou no protótipo: já consigo guardar memórias e conversar por voz, mas meu cérebro de IA ainda não foi conectado. O próximo passo é configurar um servidor seguro para eu responder de verdade, sem expor chaves de API no celular.";
    addMessage(reply,"bot");history.push({role:"assistant",content:reply});save(STORE.history,history);speak(reply);return;
  }
  try{
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,history:history.slice(-20),memories,profile:{name:"Paçoca",language:"pt-BR",personality:"amigo sincero, jovem, descontraído, inteligente e bem-humorado"}})});
    if(!response.ok)throw new Error(`Servidor respondeu ${response.status}`);
    const data=await response.json();if(!data.reply)throw new Error("Resposta do servidor sem o campo reply.");
    addMessage(data.reply,"bot");history.push({role:"assistant",content:data.reply});save(STORE.history,history);speak(data.reply);
  }catch(err){const msg="Não consegui acessar o cérebro conectado: "+err.message+". Confira o endereço e a conexão.";addMessage(msg,"bot");}
}
$("sendBtn").onclick=send;
$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
function speak(text){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="pt-BR";u.rate=1.02;
  const voices=speechSynthesis.getVoices();const v=voices.find(x=>x.lang?.toLowerCase().startsWith("pt-br"));if(v)u.voice=v;speechSynthesis.speak(u);
}
$("micBtn").onclick=()=>{
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){$("voiceStatus").textContent="Seu navegador não disponibilizou reconhecimento de voz. Tente o Chrome atualizado no Android.";return;}
  const rec=new Recognition();rec.lang="pt-BR";rec.interimResults=false;rec.maxAlternatives=1;
  $("voiceStatus").textContent="Estou ouvindo...";rec.onresult=e=>{$("messageInput").value=e.results[0][0].transcript;$("voiceStatus").textContent="Mensagem reconhecida. Enviando...";send();};
  rec.onerror=e=>$("voiceStatus").textContent="Não consegui ouvir: "+e.error;
  rec.onend=()=>{if($("voiceStatus").textContent==="Estou ouvindo...")$("voiceStatus").textContent="Pode tentar novamente.";};
  rec.start();
};
renderMemory();
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
