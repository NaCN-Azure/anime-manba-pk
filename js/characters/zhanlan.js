// 湛蓝 角色实现
DB["湛蓝"] = {
    hp: 14000,
    mp: 8500,
    atk: 2000,
    def: 1600,
    spd: 150,
    cr: 20,
    cd: 180,
    sand: 450,
    skills: [
        { n: "尘沙之海全域", c: 5, mp: 600, d: 1.2, e: "沙蚀", s: 1 },
        { n: "沙暴突袭", c: 3, mp: 450, d: 2.2, e: "禁锢", s: 1 },
        { n: "沙墙筑垒", c: 2, mp: 300, d: 1, e: "沙墙", s: 0 },
        { n: "沙尘穿刺", c: 4, mp: 380, d: 2.8, e: "沙爆", s: 1 },
        { n: "沙遁瞬移", c: 2, mp: 250, d: 0, e: "位移", s: 0 },
        { n: "尘沙具象", c: 6, mp: 500, d: 1.5, e: "召唤", s: 0 },
        { n: "尘沙寂灭", c: 8, mp: 1200, d: 3.8, e: "终", s: 0 }
    ],
    passive(c) {
        c.dmg *= 1.3;
        c.mpBack = 35;
        c.lockHP = 1;
        c.sandMax = 7; // 沙蚀最大层数
        c.terrainDef = 8;
        c.terrainMax = 40;
        c.allySandDmg = 15;
        c.reviveHP = 20;
        c.reviveReset = 1;
        c.sandTerrain = false; // 沙尘地形是否激活
        c.sandTerrainTurns = 0; // 沙尘地形剩余回合
        
        // 设置技能实现
        c.skillImpl = {
            "尘沙之海全域": function(s, target, field) {
                this.sandTerrain = true;
                this.sandTerrainTurns = 5;
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用尘沙之海全域对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    
                    // 附加沙蚀效果
                    if (!enemy.debuffs["沙蚀"]) {
                        enemy.debuffs["沙蚀"] = { st: 4, val: 0 };
                    }
                    enemy.debuffs["沙蚀"].val = Math.min(enemy.debuffs["沙蚀"].val + 3, this.sandMax);
                    enemy.debuffs["沙尘视野"] = { st: 3, val: 30 }; // 命中-30%
                });
                
                log(`${this.getDisplayName()} 展开尘沙之海全域，沙尘地形持续5回合`);
                return true;
            },
            
            "沙暴突袭": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用沙暴突袭对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                
                target.debuffs["沙暴禁锢"] = { st: 2, val: 0 }; // 无法行动2回合
                target.debuffs["沙蚀"] = { st: 4, val: (target.debuffs["沙蚀"]?.val || 0) + 2 };
                
                log(`${target.getDisplayName()} 被沙暴禁锢并叠加沙蚀`);
                return true;
            },
            
            "沙墙筑垒": function(s, target, field) {
                const shield = Math.floor(this.atk * 2.5 * (1 + (this.sandTerrain ? 0.3 : 0)));
                const allies = field.filter(x => x.side === this.side);
                
                allies.forEach(ally => {
                    ally.buffs["沙墙护盾"] = { st: 3, val: shield };
                    // 沙尘地形下额外效果
                    if (this.sandTerrain) {
                        ally.buffs["沙尘庇护"] = { st: 2, val: 20 }; // 防御+20%
                    }
                });
                
                log(`${this.getDisplayName()} 使用沙墙筑垒，全队获得 ${shield} 点护盾${this.sandTerrain ? '和沙尘庇护' : ''}`);
                return true;
            },
            
            "沙尘穿刺": function(s, target, field) {
                // 根据沙蚀层数增加伤害
                const sandStacks = target.debuffs["沙蚀"]?.val || 0;
                const sandBonus = 1 + (sandStacks * 0.15);
                const damage = Math.floor(this.atk * s.d * this.crit() * sandBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用沙尘穿刺对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害 (沙蚀加成: ${Math.floor((sandBonus - 1) * 100)}%)`);
                }
                
                // 沙爆效果 - 消耗沙蚀层数造成额外伤害
                if (sandStacks > 0) {
                    const explosionDamage = Math.floor(this.atk * 0.5 * sandStacks);
                    target.hp = clamp(target.hp - explosionDamage, 0, target.maxhp);
                    log(`${target.getDisplayName()} 的沙蚀层数爆炸，造成 ${explosionDamage} 额外伤害`);
                    delete target.debuffs["沙蚀"];
                }
                
                return true;
            },
            
            "沙遁瞬移": function(s, target, field) {
                // 清除自身debuff
                Object.keys(this.debuffs).forEach(key => {
                    if (!key.includes("沙遁")) {
                        delete this.debuffs[key];
                    }
                });
                
                this.buffs["沙遁"] = { st: 2, val: 40 }; // 闪避+40%
                this.buffs["沙尘加速"] = { st: 2, val: 25 }; // 速度+25%
                
                // 沙尘地形下额外效果
                if (this.sandTerrain) {
                    this.mp = clamp(this.mp + this.maxmp * 0.15, 0, this.maxmp);
                    log(`${this.getDisplayName()} 使用沙遁瞬移，清除负面状态，在沙尘地形中恢复15%MP`);
                } else {
                    log(`${this.getDisplayName()} 使用沙遁瞬移，清除负面状态`);
                }
                
                return true;
            },
            
            "尘沙具象": function(s, target, field) {
                // 召唤沙尘造物
                this.buffs["尘沙具象"] = { st: 4, val: 0 };
                
                // 根据沙尘地形决定召唤数量
                const summonCount = this.sandTerrain ? 3 : 2;
                
                for (let i = 0; i < summonCount; i++) {
                    // 沙尘造物提供增益
                    const allies = field.filter(x => x.side === this.side);
                    allies.forEach(ally => {
                        ally.buffs["沙尘造物"] = { st: 3, val: 15 }; // 全属性+15%
                    });
                }
                
                log(`${this.getDisplayName()} 使用尘沙具象，召唤 ${summonCount} 个沙尘造物强化全队`);
                return true;
            },
            
            "尘沙寂灭": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    // 基础伤害
                    const baseDamage = Math.floor(this.atk * s.d * this.crit());
                    const actualBaseDamage = enemy.processDamage(baseDamage, this, s.n);
                    totalDamage += actualBaseDamage;
                    
                    // 沙蚀额外伤害
                    const sandStacks = enemy.debuffs["沙蚀"]?.val || 0;
                    if (sandStacks > 0) {
                        const sandDamage = Math.floor(this.atk * 0.8 * sandStacks);
                        enemy.hp = clamp(enemy.hp - sandDamage, 0, enemy.maxhp);
                        totalDamage += sandDamage;
                        log(`${enemy.getDisplayName()} 的 ${sandStacks} 层沙蚀造成 ${sandDamage} 额外伤害`);
                    }
                    
                    // 清除沙蚀
                    delete enemy.debuffs["沙蚀"];
                    
                    // 高概率禁锢
                    if (roll(80)) {
                        enemy.debuffs["尘沙禁锢"] = { st: 3, val: 0 };
                        log(`${enemy.getDisplayName()} 被尘沙禁锢`);
                    }
                });
                
                // 强化沙尘地形
                if (this.sandTerrain) {
                    this.sandTerrainTurns += 3;
                    log(`尘沙寂灭强化了沙尘地形，延长3回合`);
                }
                
                log(`${this.getDisplayName()} 使用尘沙寂灭，造成总计 ${totalDamage} 伤害，清除所有沙蚀`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 沙尘地形效果
            if (this.sandTerrain) {
                this.sandTerrainTurns--;
                
                if (this.sandTerrainTurns <= 0) {
                    this.sandTerrain = false;
                    log(`${this.getDisplayName()} 的沙尘地形消散了`);
                } else {
                    // 沙尘地形持续效果
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    enemies.forEach(enemy => {
                        // 每回合叠加沙蚀
                        if (!enemy.debuffs["沙蚀"]) {
                            enemy.debuffs["沙蚀"] = { st: 2, val: 0 };
                        }
                        enemy.debuffs["沙蚀"].val = Math.min(enemy.debuffs["沙蚀"].val + 1, this.sandMax);
                        
                        // 沙尘伤害
                        const terrainDamage = Math.floor(this.atk * 0.3);
                        enemy.hp = clamp(enemy.hp - terrainDamage, 0, enemy.maxhp);
                    });
                    
                    // 友军在沙尘地形中获得防御加成
                    const allies = field.filter(x => x.side === this.side);
                    allies.forEach(ally => {
                        if (!ally.buffs["地形防御"]) {
                            ally.buffs["地形防御"] = { st: 1, val: this.terrainDef };
                        } else {
                            ally.buffs["地形防御"].val = Math.min(ally.buffs["地形防御"].val + this.terrainDef, this.terrainMax);
                        }
                    });
                }
            }
            
            // 沙蚀持续伤害
            const enemiesWithSand = field.filter(x => x.side !== this.side && x.debuffs["沙蚀"]);
            enemiesWithSand.forEach(enemy => {
                const stacks = enemy.debuffs["沙蚀"].val;
                if (stacks >= 3) {
                    const sandDamage = Math.floor(this.atk * 0.2 * stacks);
                    enemy.hp = clamp(enemy.hp - sandDamage, 0, enemy.maxhp);
                    log(`${enemy.getDisplayName()} 的沙蚀造成 ${sandDamage} 持续伤害`);
                }
            });
            
            // MP回复
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.04);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 锁血保命
            if (this.hp <= 0 && this.lockHP && this.reviveReset) {
                this.hp = Math.floor(this.maxhp * this.reviveHP / 100);
                this.reviveReset = 0;
                this.buffs["沙尘重生"] = { st: 2, val: 0 };
                
                // 复活时激活沙尘地形
                this.sandTerrain = true;
                this.sandTerrainTurns = 3;
                
                log(`${this.getDisplayName()} 触发沙尘重生，恢复${this.reviveHP}%HP并激活沙尘地形`);
            }
        };
    }
};