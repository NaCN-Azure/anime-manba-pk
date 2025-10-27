// 全局变量
let currentBattleField = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateTeamSelectors();
    
    // 事件监听
    document.getElementById('mode').addEventListener('change', updateTeamSelectors);
    document.getElementById('startBattle').addEventListener('click', startBattle);
    document.getElementById('addCustomChar').addEventListener('click', addCustomChar);
});

/* ---------- 队伍创建 ---------- */
function makeTeam(names, side) {
    return names.map(n => {
        const base = DB[n] || DB[Object.keys(DB)[0]];
        const c = new Character(n, base);
        c.side = side;
        c.gender = rand(2) ? "男" : "女";
        c.tag = "";
        return c;
    });
}

/* ---------- 新建角色 ---------- */
function addCustomChar() {
    const name = prompt("角色名:");
    if (!name) return;
    const hp = +prompt("HP", 12000);
    const mp = +prompt("MP", 8000);
    const atk = +prompt("ATK", 2000);
    const def = +prompt("DEF", 1200);
    const spd = +prompt("SPD", 160);
    const cr = +prompt("暴击率%", 30);
    const cd = +prompt("暴击伤害%", 200);
    
    DB[name] = {
        hp, mp, atk, def, spd, cr, cd,
        skills: [{ n: "普攻", c: 1, mp: 0, d: 1, e: "", s: 0 }],
        passive() { }
    };
    
    log(`已新建角色 ${name}`);
    updateTeamSelectors();
}

/* ---------- 队伍选择器 ---------- */
function updateTeamSelectors() {
    const mode = +document.getElementById("mode").value;
    const teamA = document.getElementById("teamA-selectors");
    const teamB = document.getElementById("teamB-selectors");
    
    teamA.innerHTML = "";
    teamB.innerHTML = "";
    
    const names = Object.keys(DB);
    
    for (let i = 0; i < mode; i++) {
        const selectorA = document.createElement("div");
        selectorA.className = "char-selector";
        selectorA.innerHTML = `
            <label>角色 ${i + 1}:
                <select id="teamA-char${i}">
                    ${names.map(n => `<option value="${n}">${n}</option>`).join("")}
                </select>
            </label>
        `;
        teamA.appendChild(selectorA);
        
        const selectorB = document.createElement("div");
        selectorB.className = "char-selector";
        selectorB.innerHTML = `
            <label>角色 ${i + 1}:
                <select id="teamB-char${i}">
                    ${names.map(n => `<option value="${n}">${n}</option>`).join("")}
                </select>
            </label>
        `;
        teamB.appendChild(selectorB);
    }
}

/* ---------- 开始战斗 ---------- */
async function startBattle() {
    const mode = +document.getElementById("mode").value;
    
    // 获取队伍A的选择
    const teamANames = [];
    for (let i = 0; i < mode; i++) {
        const select = document.getElementById(`teamA-char${i}`);
        teamANames.push(select.value);
    }
    
    // 获取队伍B的选择
    const teamBNames = [];
    for (let i = 0; i < mode; i++) {
        const select = document.getElementById(`teamB-char${i}`);
        teamBNames.push(select.value);
    }
    
    const t1 = makeTeam(teamANames, "A");
    const t2 = makeTeam(teamBNames, "B");
    
    document.getElementById("teams").innerHTML = "";
    renderTeam(t1, "teamA");
    renderTeam(t2, "teamB");
    log(`=== ${mode}v${mode} 战斗开始 ===`);
    log(`队伍A: ${teamANames.join(", ")}`);
    log(`队伍B: ${teamBNames.join(", ")}`);
    await runBattle(t1, t2);
}

function renderTeam(team, id) {
    const div = document.createElement("div");
    div.className = "team";
    div.id = id;
    team.forEach(c => {
        const d = document.createElement("div");
        d.className = "char";
        d.innerHTML = `
            <div class="name">${c.getDisplayName()}</div>
            <div>HP: <span class="hp">${c.hp}</span>/${c.maxhp}</div>
            <div>MP: <span class="mp">${c.mp}</span>/${c.maxmp}</div>
            <div>ATK: ${c.atk} DEF: ${c.def} SPD: ${c.spd}</div>
            <div>暴击: ${c.cr}% 暴伤: ${c.cd}%</div>
        `;
        div.appendChild(d);
    });
    document.getElementById("teams").appendChild(div);
}

async function runBattle(t1, t2) {
    const all = [...t1, ...t2];
    all.forEach(c => c.resetCD());
    let round = 0;
    const maxRounds = 50;
    
    while (round < maxRounds) {
        round++;
        log(`--- 第${round}回合 ---`);
        all.sort((a, b) => b.spd - a.spd);
        
        for (const c of all) {
            if (c.hp <= 0) continue;
            c.turn(all);
            const foes = all.filter(x => x.side !== c.side && x.hp > 0);
            if (foes.length === 0) { log(`侧${c.side}胜利`); return; }
            const act = c.chooseAction(foes);
            
            if (act.act === "skill") {
                c.useSkill(act.skill, act.target, all);
            } else if (act.act === "multi_skill") {
                log(`<div class="special-turn">${c.getDisplayName()}一回合释放多个技能: ${act.skills.map(s => s.n).join(", ")}</div>`);
                for (const skill of act.skills) {
                    c.useSkill(skill, act.target, all);
                    await sleep(300);
                }
            }
            await sleep(300);
        }
        
        all.forEach(c => log(c.report()));
        const aAlive = t1.some(c => c.hp > 0);
        const bAlive = t2.some(c => c.hp > 0);
        if (!aAlive && !bAlive) { log("平局"); return; }
        if (!aAlive) { log("B队胜利"); return; }
        if (!bAlive) { log("A队胜利"); return; }
        await sleep(500);
    }
    
    log(`战斗超时（${maxRounds}回合），平局`);
}