/* =========================
   🔧 BASE
========================= */

let players = JSON.parse(localStorage.getItem("players") || "[]");
let matches = JSON.parse(localStorage.getItem("matches") || "[]");

function openModal(id){
  document.getElementById(id).style.display="block";
}

function closeModal(id){
  document.getElementById(id).style.display="none";
}


/* =========================
   👥 PLAYERS
========================= */

function validatePlayer(){
  let input = document.getElementById("playerInput");
  let error = document.getElementById("playerError");
  let name = input.value.trim();

  const regex = /^[a-zA-Z0-9 ]+$/;

  error.style.display = "none";

  if(name === "") return;

  if(!regex.test(name)){
    error.textContent = "Caractères non autorisés !";
    error.style.display = "block";
    return;
  }

  let exists = players.some(p => p.toLowerCase() === name.toLowerCase());

  if(exists){
    error.textContent = "Ce joueur existe déjà !";
    error.style.display = "block";
    return;
  }
}

function addPlayer(){
  let input = document.getElementById("playerInput");
  let name = input.value.trim();

  if(!name) return;

  if(players.includes(name)) return;

  players.push(name);
  saveData();
  renderPlayers();
  renderPlayersBottom();

  input.value="";
}

function renderPlayers(){
  let list = document.getElementById("playerList");
  list.innerHTML="";

  players.forEach(p=>{
    let li=document.createElement("li");
    li.textContent=p;

    li.style.cursor="pointer";
    li.onclick = () => openPlayerProfile(p);

    list.appendChild(li);
  });
}

function renderPlayersBottom(){
  let list = document.getElementById("playersBottomList");
  list.innerHTML = "";

  let ranking = getRanking();

  ranking.forEach((p, index)=>{
    let li = document.createElement("li");
    li.textContent = `${p.name} - ${p.points} pts - ${index+1}`;
    list.appendChild(li);
  });
}


/* =========================
   🏆 RANKING
========================= */

function getRanking(){

  let stats = {};

  players.forEach(p=>{
    stats[p] = {v:0, d:0};
  });

  matches.forEach(m=>{
    let blueWin = m.sb > m.sr;

    [m.b1,m.b2].forEach(p=>{
      if(stats[p]){
        if(blueWin) stats[p].v++;
        else stats[p].d++;
      }
    });

    [m.r1,m.r2].forEach(p=>{
      if(stats[p]){
        if(!blueWin) stats[p].v++;
        else stats[p].d++;
      }
    });
  });

  return Object.entries(stats)
    .map(([name,s])=>{

      let total = s.v + s.d;
      let ratio = total === 0 ? 0 : Math.round((s.v / total) * 100);

      return {
        name,
        v: s.v,
        d: s.d,
        points: s.v - s.d,
        ratio
      };
    })
    .sort((a,b)=> b.points - a.points);
}

function openRanking(){

  let tbody = document.getElementById("rankingList");
  tbody.innerHTML = "";

  let ranking = getRanking();

  let maxPoints = ranking.length ? ranking[0].points : 1;

  ranking.forEach((p, index)=>{

    let tr = document.createElement("tr");

    let progress = maxPoints > 0 
      ? Math.round((p.points / maxPoints) * 100)
      : 0;

    let bg = "";
    if(index === 0) bg = "#ffd70022";
    if(index === 1) bg = "#c0c0c022";
    if(index === 2) bg = "#cd7f3222";

    tr.style.background = bg;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${p.name}</td>
      <td>${p.v}</td>
      <td>${p.d}</td>
      <td><b>${p.points}</b></td>

      <td style="width:160px;">
        <div style="background:#ddd;height:8px;border-radius:5px;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:#4f46e5;"></div>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  openModal("ranking");
}

function openRankingUI(){
  openModal("ranking");
}


/* =========================
   ⚽ MATCHS
========================= */

function saveMatch(){

  let sb = parseInt(document.getElementById("sb").value);
  let sr = parseInt(document.getElementById("sr").value);

  if(isNaN(sb) || isNaN(sr)){
    showScoreMessage("⚠️ Score invalide", "red");
    return;
  }

  if(sb < -1 || sb > 10 || sr < -1 || sr > 10){
    showScoreMessage("❌ Score doit être entre -1 et 10", "red");
    return;
  }

  matches.push({
    b1: document.getElementById("b1").value,
    b2: document.getElementById("b2").value,
    r1: document.getElementById("r1").value,
    r2: document.getElementById("r2").value,
    sb,
    sr
  });

  saveData();

  showScoreMessage("✅ Score enregistré !", "green");

  setTimeout(()=>{
    closeModal("score");
    document.getElementById("scoreMessage").style.display = "none";
  }, 1000);
}

function showScoreMessage(text, color){

  let box = document.getElementById("scoreMessage");

  box.style.display = "block";
  box.style.background = color === "green" ? "#16a34a" : "#dc2626";
  box.style.color = "white";
  box.textContent = text;
}


/* =========================
   👤 PLAYER PROFILE
========================= */

function openPlayerProfile(name){

  let wins = 0;
  let losses = 0;
  let history = [];

  matches.forEach(m=>{

    let isBlue = [m.b1,m.b2].includes(name);
    let isRed = [m.r1,m.r2].includes(name);

    if(isBlue || isRed){

      let blueWin = m.sb > m.sr;

      if(isBlue && blueWin) wins++;
      else if(isBlue && !blueWin) losses++;

      if(isRed && !blueWin) wins++;
      else if(isRed && blueWin) losses++;

      history.push(`${m.b1} ${m.b2} (${m.sb}) vs ${m.r1} ${m.r2} (${m.sr})`);
    }
  });

  let ratio = wins + losses === 0 ? 0 : Math.round((wins/(wins+losses))*100);

  document.getElementById("profileName").innerText = "👤 " + name;

  document.getElementById("profileStats").innerHTML = `
    <p>🏆 Victoires : ${wins}</p>
    <p>❌ Défaites : ${losses}</p>
    <p>📊 Ratio : ${ratio}%</p>
  `;

  let list = document.getElementById("profileMatches");
  list.innerHTML = "";

  history.forEach(h=>{
    let li = document.createElement("li");
    li.textContent = h;
    list.appendChild(li);
  });

  openModal("playerProfile");
}


/* =========================
   📜 HISTORY + COMMENTS
========================= */

function openHistory(){

  let list = document.getElementById("matchHistory");
  list.innerHTML="";

  matches.forEach(m=>{
    let li = document.createElement("li");
    li.textContent =
      `${m.b1} ${m.b2} (${m.sb}) vs ${m.r1} ${m.r2} (${m.sr})`;
    list.appendChild(li);
  });

  openModal("history");
}

function addComment(){
  let input = document.getElementById("commentInput");
  let text = input.value.trim();

  if(text === "") return;

  let list = document.getElementById("commentList");

  let li = document.createElement("li");
  li.textContent = text;

  list.appendChild(li);

  input.value = "";
}


/* =========================
   🧰 UTILS
========================= */

function limitScore(input){

  let value = parseInt(input.value);

  if(isNaN(value)) return;

  if(value > 10) input.value = 10;
  if(value < -10) input.value = -10;
}

function saveData(){
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("matches", JSON.stringify(matches));
}


/* =========================
   🚀 INIT
========================= */

document.addEventListener("DOMContentLoaded", function () {
  renderPlayers();
  renderPlayersBottom();

  document.querySelectorAll(".accordion").forEach(btn=>{
    btn.addEventListener("click",function(){
      let panel=this.nextElementSibling;
      panel.style.display = panel.style.display==="none"?"block":"none";
    });
  });
});