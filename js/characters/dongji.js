// 冬季风暴 角色实现
DB["冬季风暴"] = {
    hp: 18500,
    mp: 7200,
    atk: 1700,
    def: 1400,
    spd: 145,
    cr: 45,
    cd: 200,
    frost: 400,
    skills: [
        { n: "霜之哀伤・轻斩", c: 1, mp: 150, d: 2.4 * 1.4, e: "单体冰伤", s: 1 },
        { n: "冰封斩击", c: 2, mp: 240, d: 1.8 * 1.4, e: "范围冰伤", s: 1 },
        { n: "极冰护盾", c: 2, mp: 220, d: 0, e: "自保反伤", s: 0 },
        { n: "霜之哀伤・领域斩", c: 3, mp: 360, d: 2.8 * 1.4, e: "范围爆发", s: 1 },
        { n: "冰封领域・禁锢", c: 3, mp: 320, d: 1.2 * 1.4, e: "范围控制", s: 1 },
        { n: "霜域裁决・万物冰封", c: 7, mp: 850, d: 4 * 1.4, e: "终极爆发", s: 1 }
    ],
    passive(c) {
        c.frostAffinity = 40; // 冰霜亲和40%
        c.frostDomainActive = false;
        c.frostDomainTurns = 0;
        c.frostMarks = 0; // 冰霜印记
        c.maxFrostMarks = 3;
        c.lockHP = 1; // 锁血保命
        c.deathOnce = 1;
        c.frostShieldValue = 0;
        
        // 设置技能实现
        c.skillImpl = {
            "霜之哀伤・轻斩": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="frost-domain">${this.getDisplayName()} 使用霜之哀伤・轻斩对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                // 附加冰霜印记
                if (!target.debuffs["冰霜印记"]) {
                    target.debuffs["冰霜印记"] = { st: 3, val: 0 };
                }
                target.debuffs["冰霜印记"].val = Math.min(target.debuffs["冰霜印记"].val + 1, this.maxFrostMarks);
                log(`<div class="frost-domain">${target.getDisplayName()} 获得 ${target.debuffs["冰霜印记"].val} 层冰霜印记</div>`);
                return true;
            },
            
            "冰封斩击": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 4);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="frost-domain">${this.getDisplayName()} 使用冰封斩击对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    // 附加冰霜印记和减速
                    if (!enemy.debuffs["冰霜印记"]) {
                        enemy.debuffs["冰霜印记"] = { st: 3, val: 0 };
                    }
                    enemy.debuffs["冰霜印记"].val = Math.min(enemy.debuffs["冰霜印记"].val + 1, this.maxFrostMarks);
                    enemy.debuffs["减速"] = { st: 2, val: 50 }; // 减速50%
                });
                return true;
            },
            
            "极冰护盾": function(s, target, field) {
                const shield = Math.floor(this.atk * 2 * 1.4);
                this.buffs["极冰护盾"] = { st: 2, val: shield };
                this.hasReflect = true;
                this.reflectDamage = Math.floor(this.atk * 0.7 * 1.4);
                this.buffs["霜甲"] = { st: 1, val: 20 }; // 防御+20%
                log(`<div class="frost-domain">${this.getDisplayName()} 使用极冰护盾，获得 ${shield} 点护盾和反伤效果</div>`);
                return true;
            },
            
            "霜之哀伤・领域斩": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    // 根据冰霜印记层数增加伤害
                    const frostStacks = enemy.debuffs["冰霜印记"]?.val || 0;
                    const damageBonus = 1 + (frostStacks * 0.15);
                    const damage = Math.floor(this.atk * s.d * this.crit() * damageBonus);
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 冻结高印记目标
                    if (frostStacks >= 2 && roll(40)) {
                        enemy.debuffs["冻结"] = { st: 1, val: 0 };
                        log(`<div class="frost-domain">${enemy.getDisplayName()} 被冻结了！</div>`);
                    }
                });
                
                log(`<div class="frost-domain">${this.getDisplayName()} 使用霜之哀伤・领域斩，造成总计 ${totalDamage} 伤害</div>`);
                return true;
            },
            
            "冰封领域・禁锢": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="frost-domain">${this.getDisplayName()} 使用冰封领域・禁锢对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    enemy.debuffs["禁锢"] = { st: 2, val: 0 }; // 无法行动2回合
                    enemy.debuffs["冰霜印记"] = { st: 3, val: this.maxFrostMarks }; // 叠满印记
                });
                
                this.buffs["冰封领域"] = { st: 3, val: 25 }; // 冰霜伤害+25%
                log(`<div class="frost-domain">${this.getDisplayName()} 使用冰封领域・禁锢，禁锢所有敌人并叠满冰霜印记</div>`);
                return true;
            },
            
            "霜域裁决・万物冰封": function(s, target, field) {
                this.frostDomainActive = true;
                this.frostDomainTurns = 5;
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="frost-domain">${this.getDisplayName()} 使用霜域裁决・万物冰封对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    enemy.debuffs["冰霜印记"] = { st: 3, val: 3 }; // 直接叠满3层
                    if (roll(70)) {
                        enemy.debuffs["冻结"] = { st: 2, val: 0 }; // 高概率冻结
                        log(`<div class="frost-domain">${enemy.getDisplayName()} 被完全冻结！</div>`);
                    }
                });
                
                this.buffs["霜之无敌"] = { st: 1, val: 0 }; // 免疫伤害+控制1回合
                this.isInvincible = true;
                
                const allies = field.filter(x => x.side === this.side);
                const teamShield = Math.floor(this.atk * 3 * 1.4);
                allies.forEach(ally => {
                    ally.buffs["极冰庇护盾"] = { st: 2, val: teamShield };
                });
                
                log(`<div class="frost-domain">${this.getDisplayName()} 使用霜域裁决・万物冰封，刷新冰霜领域，全队获得 ${teamShield} 点护盾</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 冰霜领域效果
            if (this.frostDomainActive) {
                this.frostDomainTurns--;
                this.mp -= 280;
                
                if (this.mp < 280 || this.frostDomainTurns <= 0) {
                    this.frostDomainActive = false;
                    log(`<div class="frost-domain">${this.getDisplayName()} 的冰霜领域消散了</div>`);
                } else {
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    const domainDamage = Math.floor(this.atk * 0.6 * 1.4);
                    enemies.forEach(enemy => {
                        enemy.hp = clamp(enemy.hp - domainDamage, 0, enemy.maxhp);
                    });
                    log(`<div class="frost-domain">${this.getDisplayName()} 冰霜领域造成 ${domainDamage} 伤害</div>`);
                }
            }
            
            // 冰霜印记额外效果
            const enemiesWithFrost = field.filter(x => x.side !== this.side && x.debuffs["冰霜印记"]);
            enemiesWithFrost.forEach(enemy => {
                const stacks = enemy.debuffs["冰霜印记"].val;
                if (stacks >= 2) {
                    // 减速效果
                    if (!enemy.debuffs["冰霜减速"]) {
                        enemy.debuffs["冰霜减速"] = { st: 1, val: stacks * 15 }; // 每层减速15%
                    }
                    
                    // 持续伤害
                    if (stacks >= 3) {
                        const frostDamage = Math.floor(this.atk * 0.3 * stacks);
                        enemy.hp = clamp(enemy.hp - frostDamage, 0, enemy.maxhp);
                        log(`<div class="frost-domain">${enemy.getDisplayName()} 的冰霜印记造成 ${frostDamage} 持续伤害</div>`);
                    }
                }
            });
            
            // 锁血保命
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.frostShieldValue = Math.floor(this.atk * 2.5 * 1.4);
                this.buffs["极冰护盾"] = { st: 2, val: this.frostShieldValue };
                this.buffs["冰霜复苏"] = { st: 2, val: 30 }; // 冰霜伤害+30%
                log(`<div class="frost-domain">${this.getDisplayName()} 触发锁血保命，获得 ${this.frostShieldValue} 点护盾</div>`);
            }
        };
        
        log(`<div class="frost-domain">${c.getDisplayName()} 霜域裁决者激活，冰霜亲和: ${c.frostAffinity}%</div>`);
    }
};