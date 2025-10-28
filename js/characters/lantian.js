// 羽田蓝天 角色实现
DB["羽田蓝天"] = {
    hp: 22000,
    mp: 0,
    atk: 2000,
    def: 1800,
    spd: 190,
    cr: 45,
    cd: 280,
    alcohol: 600,
    skills: [
        { n: "醉饮酒坛祭", c: 1, mp: 0, d: 0, e: "叠酒", s: 0 },
        { n: "酒火烈拳", c: 2, mp: 0, d: 1.8, e: "酒火", s: 1 },
        { n: "酒气领域爆", c: 3, mp: 0, d: 1.5, e: "领域", s: 1 },
        { n: "仇火女煞斩", c: 4, mp: 0, d: 3, e: "仇火", s: 1 },
        { n: "醉步迷踪", c: 1, mp: 0, d: 1, e: "位移", s: 0 },
        { n: "醉拳百裂", c: 4, mp: 0, d: 0.5 * 10, e: "百裂", s: 1 },
        { n: "酒影分身", c: 5, mp: 0, d: 0, e: "分身", s: 0 }
    ],
    passive(c) {
        c.regen += c.atk * 0.2;
        c.dodge = 20;
        c.femaleDmg = 1.5;
        c.maleBuff = 1.3;
        c.lockHP = 1;
        c.dmgToMP = 30;
        c.femaleHit = 100;
        c.femaleControlImmune = 80;
        c.femaleKillAtk = 10;
        c.femaleKillMax = 5;
        c.maleAllyAtk = 20;
        c.maleAllyDef = 15;
        c.maleAllyHeal = c.atk * 0.1;
        c.maleSave = 1;
        c.femaleSkip = 50;
        c.femaleCD = 50;
        c.femaleAllReduce = 20;
        
        // 酒意层数
        c.alcoholStacks = 0;
        c.maxAlcoholStacks = 10;
        
        // 设置技能实现
        c.skillImpl = {
            "醉饮酒坛祭": function(s, target, field) {
                this.alcoholStacks = Math.min(this.alcoholStacks + 2, this.maxAlcoholStacks);
                this.buffs["酒意"] = { st: 3, val: this.alcoholStacks * 8 }; // 每层酒意+8%伤害
                log(`${this.getDisplayName()} 使用醉饮酒坛祭，酒意层数: ${this.alcoholStacks}`);
                return true;
            },
            
            "酒火烈拳": function(s, target, field) {
                const alcoholBonus = 1 + (this.alcoholStacks * 0.1); // 每层酒意+10%伤害
                const damage = Math.floor(this.atk * s.d * this.crit() * alcoholBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用酒火烈拳对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害（酒意加成: ${Math.round((alcoholBonus - 1) * 100)}%）`);
                }
                
                // 对女性角色额外效果
                if (target.gender === "女") {
                    target.debuffs["酒火灼烧"] = { st: 2, val: Math.floor(this.atk * 0.3) };
                    log(`${this.getDisplayName()} 的酒火对女性目标 ${target.getDisplayName()} 附加灼烧效果`);
                }
                return true;
            },
            
            "酒气领域爆": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                const alcoholBonus = 1 + (this.alcoholStacks * 0.08);
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit() * alcoholBonus);
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 的酒气领域对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    
                    // 减速效果
                    enemy.debuffs["酒气迟缓"] = { st: 2, val: 30 };
                });
                
                // 消耗酒意
                this.alcoholStacks = Math.max(0, this.alcoholStacks - 3);
                log(`${this.getDisplayName()} 使用酒气领域爆，消耗3层酒意`);
                return true;
            },
            
            "仇火女煞斩": function(s, target, field) {
                let damageMultiplier = 1;
                
                // 对女性目标伤害加成
                if (target.gender === "女") {
                    damageMultiplier *= this.femaleDmg;
                }
                
                // 酒意加成
                const alcoholBonus = 1 + (this.alcoholStacks * 0.15);
                
                const damage = Math.floor(this.atk * s.d * this.crit() * damageMultiplier * alcoholBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                
                if (actualDamage > 0) {
                    let logMsg = `${this.getDisplayName()} 使用仇火女煞斩对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`;
                    if (target.gender === "女") {
                        logMsg += "（对女性目标额外伤害）";
                    }
                    log(logMsg);
                }
                
                // 即死判定对女性
                if (target.gender === "女" && target.hp < target.maxhp * 0.4 && roll(this.femaleHit)) {
                    target.hp = 0;
                    log(`${this.getDisplayName()} 触发女性即死判定，${target.getDisplayName()} 被秒杀`);
                }
                
                // 消耗所有酒意
                this.alcoholStacks = 0;
                return true;
            },
            
            "酒影分身": function(s, target, field) {
                this.buffs["酒影分身"] = { st: 3, val: 40 }; // 闪避率+40%
                this.buffs["醉拳连击"] = { st: 2, val: 25 }; // 攻击次数+25%
                
                // 立即回复
                const healAmount = Math.floor(this.maxhp * 0.2);
                this.hp = clamp(this.hp + healAmount, 0, this.maxhp);
                
                // 清除控制效果
                Object.keys(this.debuffs).forEach(key => {
                    if (key.includes("控制") || key.includes("减速") || key.includes("禁锢")) {
                        delete this.debuffs[key];
                    }
                });
                
                log(`${this.getDisplayName()} 使用酒影分身，恢复 ${healAmount} HP并清除控制效果`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 被动回血（基于攻击力）
            if (this.regen > 0) {
                const healAmount = Math.floor(this.regen);
                this.hp = clamp(this.hp + healAmount, 0, this.maxhp);
                log(`${this.getDisplayName()} 酒意回血 ${healAmount} HP`);
            }
            
            // 男性队友增益
            const maleAllies = field.filter(x => x.side === this.side && x.gender === "男" && x !== this);
            if (maleAllies.length > 0) {
                maleAllies.forEach(ally => {
                    ally.buffs["酒友鼓舞"] = { st: 1, val: this.maleAllyAtk }; // 攻击力提升
                    ally.buffs["醉拳防御"] = { st: 1, val: this.maleAllyDef }; // 防御力提升
                });
            }
            
            // 女性控制免疫
            const femaleEnemies = field.filter(x => x.side !== this.side && x.gender === "女");
            if (femaleEnemies.length > 0 && roll(this.femaleControlImmune)) {
                this.buffs["女性克星"] = { st: 1, val: 0 };
                Object.keys(this.debuffs).forEach(key => {
                    if (key.includes("控制")) delete this.debuffs[key];
                });
            }
            
            // 酒意自然衰减
            if (this.alcoholStacks > 0 && roll(30)) {
                this.alcoholStacks--;
            }
            
            // 免死机制
            if (this.hp <= 0 && this.lockHP && this.maleSave) {
                this.hp = Math.floor(this.maxhp * 0.3);
                this.maleSave = 0;
                this.alcoholStacks = this.maxAlcoholStacks;
                this.buffs["醉生梦死"] = { st: 2, val: 50 }; // 全属性+50%
                log(`${this.getDisplayName()} 触发醉生梦死，恢复30%HP并获得满层酒意`);
            }
        };
        
        log(`<div class="drunken-master">${c.getDisplayName()} 醉拳大师激活，酒意上限: ${c.maxAlcoholStacks}层</div>`);
    }
};