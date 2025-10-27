// 棠棠 角色实现
DB["棠棠"] = {
    hp: 18000,
    mp: 5200,
    atk: 1800,
    def: 1400,
    spd: 140,
    cr: 35,
    cd: 220,
    light: 400,
    skills: [
        { n: "圣剑・轻斩", c: 1, mp: 80, d: 2.8 * 1.6, e: "单体光伤", s: 1 },
        { n: "圣剑・十字斩", c: 2, mp: 150, d: 1.6 * 1.6, e: "范围光伤", s: 1 },
        { n: "圣剑・辉光刺", c: 3, mp: 220, d: 3 * 1.6, e: "单体爆发", s: 1 },
        { n: "光明领域・庇护", c: 4, mp: 300, d: 0, e: "团队增益", s: 0 },
        { n: "圣剑・领域斩", c: 5, mp: 380, d: 2.2 * 1.8, e: "范围爆发", s: 1 },
        { n: "圣剑觉醒・辉光领域", c: 6, mp: 600, d: 0, e: "形态切换", s: 0 }
    ],
    passive(c) {
        c.lightAffinity = 40; // 光明亲和40%
        c.form = "常态"; // 形态：常态/领域
        c.swordMarks = 0; // 圣剑印记
        c.maxSwordMarks = 3;
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        c.domainTurns = 0; // 领域形态剩余回合
        c.swordEnergy = 0; // 圣剑能量
        c.maxSwordEnergy = 100; // 最大圣剑能量
        
        // 设置技能实现
        c.skillImpl = {
            "圣剑・轻斩": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="light-sword">${this.getDisplayName()} 使用圣剑・轻斩对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 附加圣剑印记
                if (roll(35)) {
                    if (!target.debuffs["圣剑印记"]) {
                        target.debuffs["圣剑印记"] = { st: 2, val: 0 };
                    }
                    target.debuffs["圣剑印记"].val = Math.min(target.debuffs["圣剑印记"].val + 1, this.maxSwordMarks);
                    log(`<div class="light-sword">${target.getDisplayName()} 获得 ${target.debuffs["圣剑印记"].val} 层圣剑印记</div>`);
                }
                
                // 普攻追加
                if (roll(40)) {
                    const extraDamage = Math.floor(this.atk * 1.2 * 1.6 * this.crit());
                    const actualExtraDamage = target.processDamage(extraDamage, this, s.n);
                    if (actualExtraDamage > 0) {
                        log(`<div class="light-sword">${this.getDisplayName()} 触发圣剑刺击，追加 ${actualExtraDamage} 伤害</div>`);
                    }
                }
                
                // 积累圣剑能量
                this.swordEnergy = Math.min(this.swordEnergy + 10, this.maxSwordEnergy);
                return true;
            },
            
            "圣剑・十字斩": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 3);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 附加圣剑印记
                    if (roll(25)) {
                        if (!enemy.debuffs["圣剑印记"]) {
                            enemy.debuffs["圣剑印记"] = { st: 2, val: 0 };
                        }
                        enemy.debuffs["圣剑印记"].val = Math.min(enemy.debuffs["圣剑印记"].val + 1, this.maxSwordMarks);
                    }
                });
                
                if (totalDamage > 0) {
                    log(`<div class="light-sword">${this.getDisplayName()} 使用圣剑・十字斩对3名敌人造成总计 ${totalDamage} 伤害</div>`);
                }
                
                // 积累圣剑能量
                this.swordEnergy = Math.min(this.swordEnergy + 15, this.maxSwordEnergy);
                return true;
            },
            
            "圣剑・辉光刺": function(s, target, field) {
                // 根据圣剑印记增加伤害
                const swordStacks = target.debuffs["圣剑印记"]?.val || 0;
                const swordBonus = 1 + (swordStacks * 0.2);
                const damage = Math.floor(this.atk * s.d * this.crit() * swordBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                
                if (actualDamage > 0) {
                    log(`<div class="light-sword">${this.getDisplayName()} 使用圣剑・辉光刺对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害 (圣剑印记加成: ${Math.floor((swordBonus - 1) * 100)}%)</div>`);
                }
                
                // 消耗圣剑印记造成额外效果
                if (swordStacks > 0) {
                    const extraEffect = Math.floor(this.atk * 0.8 * swordStacks);
                    target.hp = clamp(target.hp - extraEffect, 0, target.maxhp);
                    log(`<div class="light-sword">消耗 ${swordStacks} 层圣剑印记，造成 ${extraEffect} 额外伤害`);
                    delete target.debuffs["圣剑印记"];
                }
                
                // 积累圣剑能量
                this.swordEnergy = Math.min(this.swordEnergy + 25, this.maxSwordEnergy);
                return true;
            },
            
            "光明领域・庇护": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                const defBonus = 20 + Math.floor(this.swordEnergy / 10); // 基础20%，每10能量+1%
                const healAmount = Math.floor(this.atk * 1.2);
                
                allies.forEach(ally => {
                    ally.buffs["光明庇护"] = { st: 3, val: defBonus }; // 防御加成
                    ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                    ally.buffs["圣光治愈"] = { st: 2, val: Math.floor(healAmount * 0.5) }; // 持续治疗
                });
                
                log(`<div class="light-sword">${this.getDisplayName()} 使用光明领域・庇护，全队防御提升${defBonus}%，恢复 ${healAmount} HP</div>`);
                return true;
            },
            
            "圣剑・领域斩": function(s, target, field) {
                // 领域形态下效果增强
                const isDomainForm = this.form === "领域";
                const damageMultiplier = isDomainForm ? 1.3 : 1;
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit() * damageMultiplier);
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 领域形态下附加效果
                    if (isDomainForm) {
                        enemy.debuffs["光耀灼烧"] = { st: 2, val: Math.floor(this.atk * 0.4) };
                        if (roll(30)) {
                            enemy.debuffs["致盲"] = { st: 1, val: 0 }; // 致盲1回合
                        }
                    }
                });
                
                if (totalDamage > 0) {
                    log(`<div class="light-sword">${this.getDisplayName()} 使用圣剑・领域斩对全体敌人造成 ${totalDamage} 伤害${isDomainForm ? '并附加光耀灼烧' : ''}</div>`);
                }
                
                // 消耗圣剑能量
                if (this.swordEnergy >= 30) {
                    this.swordEnergy -= 30;
                    const energyBonus = Math.floor(totalDamage * 0.2);
                    enemies.forEach(enemy => {
                        enemy.hp = clamp(enemy.hp - energyBonus, 0, enemy.maxhp);
                    });
                    log(`<div class="light-sword">消耗30点圣剑能量，造成 ${energyBonus} 额外伤害</div>`);
                }
                
                return true;
            },
            
            "圣剑觉醒・辉光领域": function(s, target, field) {
                if (this.swordEnergy < this.maxSwordEnergy) {
                    log(`<div class="light-sword">圣剑能量不足，无法觉醒！当前能量: ${this.swordEnergy}/${this.maxSwordEnergy}</div>`);
                    return false;
                }
                
                this.form = "领域";
                this.domainTurns = 4;
                this.atk = Math.floor(this.atk * 1.3); // 攻击力+30%
                this.cd = 260; // 暴击伤害提升至260%
                this.swordEnergy = 0; // 消耗所有能量
                
                // 领域激活效果
                const allies = field.filter(x => x.side === this.side);
                const domainShield = Math.floor(this.atk * 2.5);
                allies.forEach(ally => {
                    ally.buffs["辉光领域"] = { st: 4, val: 25 }; // 全属性+25%
                    ally.buffs["领域护盾"] = { st: 4, val: domainShield };
                });
                
                log(`<div class="light-sword">${this.getDisplayName()} 使用圣剑觉醒・辉光领域，进入领域形态，攻击力+30%，全队获得增益</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 领域形态维持
            if (this.form === "领域") {
                this.domainTurns--;
                this.mp -= 300;
                
                if (this.mp < 300 || this.domainTurns <= 0) {
                    this.form = "常态";
                    this.atk = 1800; // 恢复基础攻击力
                    this.cd = 220; // 恢复基础暴击伤害
                    log(`<div class="light-sword">${this.getDisplayName()} 退出领域形态</div>`);
                } else {
                    // 领域形态持续效果
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    const domainDamage = Math.floor(this.atk * 0.3);
                    enemies.forEach(enemy => {
                        enemy.hp = clamp(enemy.hp - domainDamage, 0, enemy.maxhp);
                    });
                    log(`<div class="light-sword">${this.getDisplayName()} 的辉光领域造成 ${domainDamage} 伤害</div>`);
                }
            }
            
            // 圣剑能量自然增长
            if (this.swordEnergy < this.maxSwordEnergy) {
                this.swordEnergy = Math.min(this.swordEnergy + 5, this.maxSwordEnergy);
            }
            
            // 圣剑印记效果
            const enemiesWithMarks = field.filter(x => x.side !== this.side && x.debuffs["圣剑印记"]);
            enemiesWithMarks.forEach(enemy => {
                const stacks = enemy.debuffs["圣剑印记"].val;
                if (stacks >= 2) {
                    // 降低防御
                    if (!enemy.debuffs["圣剑威压"]) {
                        enemy.debuffs["圣剑威压"] = { st: 1, val: stacks * 10 }; // 每层降低10%防御
                    }
                }
            });
            
            // 免死机制
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.buffs["圣剑屏障"] = { st: 1, val: 0 };
                this.hp = clamp(this.hp + this.maxhp * 0.3, 0, this.maxhp);
                this.swordEnergy = this.maxSwordEnergy; // 圣剑能量充满
                
                // 刷新冷却最短的技能
                let minCD = 999;
                let minSkill = null;
                Object.keys(this.cooldowns).forEach(skill => {
                    if (this.cooldowns[skill] < minCD && this.cooldowns[skill] > 0) {
                        minCD = this.cooldowns[skill];
                        minSkill = skill;
                    }
                });
                if (minSkill) this.cooldowns[minSkill] = 0;
                
                log(`<div class="light-sword">${this.getDisplayName()} 触发免死机制，锁血1点并恢复30%HP，圣剑能量充满</div>`);
            }
        };
        
        log(`<div class="light-sword">${c.getDisplayName()} 光明圣剑使激活，光明亲和: ${c.lightAffinity}%</div>`);
    }
};