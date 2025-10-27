// 阿克曼 角色实现
DB["阿克曼"] = {
    hp: 18000,
    mp: 9500,
    atk: 2000,
    def: 1200,
    spd: 170,
    cr: 35,
    cd: 280,
    con: 400,
    skills: [
        { n: "迟缓诅咒", c: 2, mp: 220, d: 0.8 * 1.4, e: "迟缓", s: 1 },
        { n: "流血诅咒", c: 3, mp: 280, d: 1 * 1.4, e: "流血", s: 1 },
        { n: "腐蚀诅咒", c: 4, mp: 350, d: 0.9 * 1.4, e: "腐蚀", s: 1 },
        { n: "暗黑冲击", c: 3, mp: 320, d: 1.5 * 1.4, e: "引爆", s: 1 },
        { n: "暗影洪流", c: 5, mp: 400, d: 1.2 * 1.4, e: "暗影", s: 1 },
        { n: "怨灵召唤", c: 6, mp: 450, d: 0, e: "召唤", s: 0 },
        { n: "深渊诅咒领域", c: 8, mp: 800, d: 2 * 1.4, e: "领域", s: 2 }
    ],
    passive(c) {
        c.dmg *= 1.4;
        c.mpBack = 35;
        c.immune.add("控制");
        c.dark = 60;
        c.curseStackDmg = 8; // 每层诅咒伤害+8%
        c.lightEnemyDmg = 60; // 对光明敌人伤害+60%
        c.critPen = 30; // 暴击无视30%防御
        c.immune.add("迟缓");
        c.immune.add("沉默");
        c.immune.add("封印");
        
        // 设置技能实现
        c.skillImpl = {
            "迟缓诅咒": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用迟缓诅咒对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["迟缓"] = { st: 3, val: 40 }; // 减速40%
                target.debuffs["诅咒"] = { st: 4, val: (target.debuffs["诅咒"]?.val || 0) + 1 };
                return true;
            },
            
            "流血诅咒": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用流血诅咒对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["流血"] = { st: 3, val: Math.floor(this.atk * 0.3) };
                target.debuffs["诅咒"] = { st: 4, val: (target.debuffs["诅咒"]?.val || 0) + 1 };
                return true;
            },
            
            "腐蚀诅咒": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用腐蚀诅咒对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["腐蚀"] = { st: 3, val: 25 }; // 防御-25%
                target.debuffs["诅咒"] = { st: 4, val: (target.debuffs["诅咒"]?.val || 0) + 1 };
                return true;
            },
            
            "暗黑冲击": function(s, target, field) {
                const curseStacks = target.debuffs["诅咒"]?.val || 0;
                const baseDamage = this.atk * s.d * this.crit();
                const curseBonus = 1 + (curseStacks * this.curseStackDmg / 100);
                const damage = Math.floor(baseDamage * curseBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用暗黑冲击对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害，引爆 ${curseStacks} 层诅咒`);
                }
                delete target.debuffs["诅咒"];
                return true;
            },
            
            "深渊诅咒领域": function(s, target, field) {
                this.buffs["深渊领域"] = { st: 5, val: 30 }; // 全诅咒效果+30%
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用深渊诅咒领域对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    enemy.debuffs["诅咒"] = { st: 5, val: (enemy.debuffs["诅咒"]?.val || 0) + 2 };
                });
                
                log(`${this.getDisplayName()} 展开深渊诅咒领域，强化所有诅咒效果`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 黑暗能量回复
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.05);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 对光明敌人额外伤害
            const lightEnemies = field.filter(x => x.side !== this.side && (x.light > 0 || x.holy > 0));
            if (lightEnemies.length > 0) {
                this.buffs["光明克星"] = { st: 1, val: this.lightEnemyDmg };
            }
            
            // 诅咒层数伤害加成
            const totalCurses = field.filter(x => x.side !== this.side)
                .reduce((sum, enemy) => sum + (enemy.debuffs["诅咒"]?.val || 0), 0);
            if (totalCurses > 0) {
                this.buffs["诅咒之力"] = { st: 1, val: totalCurses * this.curseStackDmg };
            }
        };
    }
};