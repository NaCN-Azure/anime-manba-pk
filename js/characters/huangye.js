// 黄叶 角色实现
DB["黄叶"] = {
    hp: 16000,
    mp: 6500,
    atk: 2000,
    def: 1800,
    spd: 150,
    cr: 30,
    cd: 210,
    pure: 500,
    skills: [
        { n: "暗影突袭", c: 2, mp: 350, d: 1.51, e: "暗隐", s: 1 },
        { n: "暗域蔓延", c: 3, mp: 450, d: 0.78, e: "暗蚀", s: 1 },
        { n: "影刃斩", c: 4, mp: 500, d: 1.475, e: "多段", s: 1 },
        { n: "圣辉普照", c: 2, mp: 300, d: -1.3, e: "圣辉", s: 0 },
        { n: "圣罚之盾", c: 3, mp: 400, d: 0, e: "护盾", s: 0 },
        { n: "圣魂救赎", c: 6, mp: 800, d: 0, e: "复活", s: 0 },
        { n: "明暗裁决", c: 10, mp: 1500, d: 3, e: "混合", s: 2 }
    ],
    passive(c) {
        c.dark = 40;
        c.light = 40;
        c.deathOnce = 1;
        c.immune.add("控制");
        c.darkPen = 50;
        c.lightHeal = 50;
        c.mpBackDark = 25;
        c.mpBackLight = 35;
        c.immune.add("黑暗禁锢");
        c.immune.add("光明封印");
        
        // 设置技能实现
        c.skillImpl = {
            "暗影突袭": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用暗影突袭对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                this.buffs["暗影形态"] = { st: 2, val: 25 }; // 暗影伤害+25%
                return true;
            },
            
            "暗域蔓延": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 3);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用暗域蔓延对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    enemy.debuffs["暗蚀"] = { st: 3, val: 20 }; // 受到暗影伤害+20%
                });
                return true;
            },
            
            "影刃斩": function(s, target, field) {
                // 三段攻击
                let totalDamage = 0;
                for (let i = 0; i < 3; i++) {
                    const damage = Math.floor(this.atk * (s.d / 3) * this.crit());
                    const actualDamage = target.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                }
                if (totalDamage > 0) {
                    log(`${this.getDisplayName()} 使用影刃斩对 ${target.getDisplayName()} 造成 ${totalDamage} 伤害（三段）`);
                }
                return true;
            },
            
            "圣辉普照": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.lightHeal / 100));
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                });
                log(`${this.getDisplayName()} 使用圣辉普照，治疗全体友军 ${heal} HP`);
                
                // 光明MP回复
                if (roll(this.mpBackLight)) {
                    const mpRestore = Math.floor(s.mp * 0.5);
                    this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
                }
                return true;
            },
            
            "圣罚之盾": function(s, target, field) {
                const shield = Math.floor(this.atk * 2.5);
                target.buffs["圣罚之盾"] = { st: 3, val: shield };
                log(`${this.getDisplayName()} 为 ${target.getDisplayName()} 施加圣罚之盾，提供 ${shield} 点护盾`);
                return true;
            },
            
            "圣魂救赎": function(s, target, field) {
                const deadAllies = field.filter(x => x.side === this.side && x.hp <= 0);
                if (deadAllies.length > 0) {
                    const ally = deadAllies[0];
                    ally.hp = Math.floor(ally.maxhp * 0.5);
                    ally.mp = Math.floor(ally.maxmp * 0.3);
                    ally.buffs["圣魂庇护"] = { st: 2, val: 0 };
                    log(`${this.getDisplayName()} 使用圣魂救赎复活 ${ally.getDisplayName()}`);
                } else {
                    // 如果没有死亡的队友，则治疗全体
                    const heal = Math.floor(this.atk * 1.5);
                    const allies = field.filter(x => x.side === this.side && x.hp > 0);
                    allies.forEach(ally => {
                        ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    });
                    log(`${this.getDisplayName()} 使用圣魂救赎治疗全体友军 ${heal} HP`);
                }
                return true;
            },
            
            "明暗裁决": function(s, target, field) {
                const darkDamage = Math.floor(this.atk * 1.5 * this.crit() * (1 + this.dark / 100));
                const lightDamage = Math.floor(this.atk * 1.5 * this.crit() * (1 + this.light / 100));
                const totalDamage = darkDamage + lightDamage;
                
                const actualDamage = target.processDamage(totalDamage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用明暗裁决对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                
                // 附加效果
                target.debuffs["黑暗印记"] = { st: 3, val: 30 }; // 受到暗影伤害+30%
                target.debuffs["光明印记"] = { st: 3, val: 30 }; // 受到光明伤害+30%
                
                this.buffs["明暗平衡"] = { st: 3, val: 40 }; // 全伤害+40%
                
                log(`${this.getDisplayName()} 使用明暗裁决，平衡光暗之力`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 黑暗MP回复
            const darkSkillsUsed = this.currentTurnSkills.filter(s => s.e.includes("暗")).length;
            if (darkSkillsUsed > 0 && roll(this.mpBackDark)) {
                const mpRestore = Math.floor(this.maxmp * 0.04);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 光明MP回复
            const lightSkillsUsed = this.currentTurnSkills.filter(s => s.e.includes("圣") || s.e.includes("光")).length;
            if (lightSkillsUsed > 0 && roll(this.mpBackLight)) {
                const mpRestore = Math.floor(this.maxmp * 0.06);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 光暗平衡加成
            const darkEnemies = field.filter(x => x.side !== this.side && x.dark > 0);
            const lightEnemies = field.filter(x => x.side !== this.side && x.light > 0);
            
            if (darkEnemies.length > 0) {
                this.buffs["光明克制"] = { st: 1, val: this.light };
            }
            if (lightEnemies.length > 0) {
                this.buffs["黑暗克制"] = { st: 1, val: this.dark };
            }
            
            // 免死机制
            if (this.hp <= 0 && this.deathOnce) {
                this.hp = Math.floor(this.maxhp * 0.3);
                this.deathOnce = 0;
                this.buffs["光暗重生"] = { st: 2, val: 0 };
                log(`${this.getDisplayName()} 触发光暗重生，恢复30%HP`);
            }
        };
    }
};