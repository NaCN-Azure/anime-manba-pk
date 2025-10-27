// 棠皇 角色实现
DB["棠皇"] = {
    hp: 24000,
    mp: 6000,
    atk: 2000,
    def: 1900,
    spd: 75,
    cr: 25,
    cd: 200,
    element: 550,
    skills: [
        { n: "焚天龙息", c: 3, mp: 400, d: 2.2 * 1.55, e: "范围火伤", s: 1 },
        { n: "火爪撕裂", c: 2, mp: 280, d: 2.4 * 1.55, e: "单体混合", s: 1 },
        { n: "火域燎原", c: 5, mp: 500, d: 1.5 * 1.55, e: "领域火伤", s: 1 },
        { n: "雷暴龙息", c: 4, mp: 450, d: 2.1 * 1.55, e: "范围雷伤", s: 1 },
        { n: "雷霆撕咬", c: 3, mp: 320, d: 2.6 * 1.55, e: "单体混合", s: 1 },
        { n: "雷域禁锢", c: 6, mp: 550, d: 1.4 * 1.55, e: "领域雷伤", s: 1 },
        { n: "火雷灭世・巨龙降临", c: 8, mp: 1200, d: 3.2 * 1.55, e: "终极爆发", s: 1 }
    ],
    passive(c) {
        c.elementConcentration = 55; // 元素浓度55%
        c.form = "火核"; // 形态：火核/雷核/双核
        c.fireMarks = 0; // 火焰印记
        c.thunderMarks = 0; // 雷霆印记
        c.maxMarks = 3;
        c.dragonRage = false; // 巨龙狂怒
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        c.doubleCoreTurns = 0; // 双核形态剩余回合
        c.elementEnergy = 0; // 元素能量
        c.maxElementEnergy = 200; // 最大元素能量
        
        // 设置技能实现
        c.skillImpl = {
            "焚天龙息": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 5);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 附加火焰印记
                    if (!enemy.debuffs["火焰印记"]) {
                        enemy.debuffs["火焰印记"] = { st: 2, val: 0 };
                    }
                    enemy.debuffs["火焰印记"].val = Math.min(enemy.debuffs["火焰印记"].val + 1, this.maxMarks);
                    
                    // 火核形态额外效果
                    if (this.form === "火核" && roll(40)) {
                        enemy.debuffs["灼烧"] = { st: 3, val: Math.floor(this.atk * 0.5) };
                    }
                });
                
                if (totalDamage > 0) {
                    log(`<div class="dragon">${this.getDisplayName()} 使用焚天龙息对5名敌人造成总计 ${totalDamage} 伤害</div>`);
                }
                
                // 积累元素能量
                this.elementEnergy = Math.min(this.elementEnergy + 15, this.maxElementEnergy);
                return true;
            },
            
            "火爪撕裂": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="dragon">${this.getDisplayName()} 使用火爪撕裂对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 附加流血效果
                target.debuffs["撕裂"] = { st: 3, val: Math.floor(this.atk * 0.6) };
                
                // 根据火焰印记增加伤害
                const fireStacks = target.debuffs["火焰印记"]?.val || 0;
                if (fireStacks > 0) {
                    const extraDamage = Math.floor(this.atk * 0.4 * fireStacks);
                    target.hp = clamp(target.hp - extraDamage, 0, target.maxhp);
                    log(`<div class="dragon">火焰印记爆发，造成 ${extraDamage} 额外伤害</div>`);
                }
                
                // 积累元素能量
                this.elementEnergy = Math.min(this.elementEnergy + 10, this.maxElementEnergy);
                return true;
            },
            
            "火域燎原": function(s, target, field) {
                // 切换到火核形态
                this.form = "火核";
                this.buffs["火核形态"] = { st: 4, val: 25 }; // 火伤+25%
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 强制叠加火焰印记
                    if (!enemy.debuffs["火焰印记"]) {
                        enemy.debuffs["火焰印记"] = { st: 3, val: 0 };
                    }
                    enemy.debuffs["火焰印记"].val = this.maxMarks;
                    
                    // 高概率灼烧
                    if (roll(70)) {
                        enemy.debuffs["烈火灼烧"] = { st: 3, val: Math.floor(this.atk * 0.8) };
                    }
                });
                
                // 创造火域
                this.buffs["火域"] = { st: 3, val: 0 };
                
                log(`<div class="dragon">${this.getDisplayName()} 使用火域燎原，造成总计 ${totalDamage} 伤害，切换到火核形态并创造火域</div>`);
                return true;
            },
            
            "雷暴龙息": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 4);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 附加雷霆印记
                    if (!enemy.debuffs["雷霆印记"]) {
                        enemy.debuffs["雷霆印记"] = { st: 2, val: 0 };
                    }
                    enemy.debuffs["雷霆印记"].val = Math.min(enemy.debuffs["雷霆印记"].val + 1, this.maxMarks);
                    
                    // 雷核形态额外效果
                    if (this.form === "雷核" && roll(35)) {
                        enemy.debuffs["麻痹"] = { st: 2, val: 30 }; // 减速30%
                    }
                });
                
                if (totalDamage > 0) {
                    log(`<div class="dragon">${this.getDisplayName()} 使用雷暴龙息对4名敌人造成总计 ${totalDamage} 伤害</div>`);
                }
                
                // 积累元素能量
                this.elementEnergy = Math.min(this.elementEnergy + 15, this.maxElementEnergy);
                return true;
            },
            
            "雷霆撕咬": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="dragon">${this.getDisplayName()} 使用雷霆撕咬对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 根据雷霆印记增加效果
                const thunderStacks = target.debuffs["雷霆印记"]?.val || 0;
                if (thunderStacks > 0) {
                    // 破防效果
                    target.debuffs["雷击破防"] = { st: 2, val: thunderStacks * 15 }; // 每层降低15%防御
                    
                    // 高印记概率眩晕
                    if (thunderStacks >= 2 && roll(50)) {
                        target.debuffs["眩晕"] = { st: 1, val: 0 };
                        log(`<div class="dragon">${target.getDisplayName()} 被雷霆震晕！</div>`);
                    }
                }
                
                // 积累元素能量
                this.elementEnergy = Math.min(this.elementEnergy + 10, this.maxElementEnergy);
                return true;
            },
            
            "雷域禁锢": function(s, target, field) {
                // 切换到雷核形态
                this.form = "雷核";
                this.buffs["雷核形态"] = { st: 4, val: 20 }; // 速度+20%
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="dragon">${this.getDisplayName()} 使用雷域禁锢对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    
                    // 强制叠加雷霆印记和禁锢
                    if (!enemy.debuffs["雷霆印记"]) {
                        enemy.debuffs["雷霆印记"] = { st: 3, val: 0 };
                    }
                    enemy.debuffs["雷霆印记"].val = this.maxMarks;
                    enemy.debuffs["雷域禁锢"] = { st: 2, val: 0 }; // 无法行动2回合
                });
                
                // 创造雷域
                this.buffs["雷域"] = { st: 3, val: 0 };
                
                log(`<div class="dragon">${this.getDisplayName()} 使用雷域禁锢，切换到雷核形态并禁锢所有敌人</div>`);
                return true;
            },
            
            "火雷灭世・巨龙降临": function(s, target, field) {
                if (this.elementEnergy < this.maxElementEnergy) {
                    log(`<div class="dragon">元素能量不足，无法释放终极技能！当前能量: ${this.elementEnergy}/${this.maxElementEnergy}</div>`);
                    return false;
                }
                
                this.form = "双核";
                this.doubleCoreTurns = 5;
                const shield = Math.floor(this.atk * 4.5);
                this.buffs["火雷护盾"] = { st: 3, val: shield };
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 叠加双元素印记
                    if (!enemy.debuffs["火焰印记"]) {
                        enemy.debuffs["火焰印记"] = { st: 3, val: 0 };
                    }
                    if (!enemy.debuffs["雷霆印记"]) {
                        enemy.debuffs["雷霆印记"] = { st: 3, val: 0 };
                    }
                    enemy.debuffs["火焰印记"].val = this.maxMarks;
                    enemy.debuffs["雷霆印记"].val = this.maxMarks;
                    
                    // 双核特效
                    enemy.debuffs["元素混乱"] = { st: 3, val: 40 }; // 全属性-40%
                });
                
                // 双核形态下技能冷却缩短30%，火雷伤害额外+25%
                this.buffs["双核形态"] = { st: 5, val: 25 };
                
                // 消耗元素能量
                this.elementEnergy = 0;
                
                log(`<div class="dragon">${this.getDisplayName()} 使用火雷灭世・巨龙降临，造成总计 ${totalDamage} 伤害，进入双核形态，获得 ${shield} 点护盾</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 双核形态维持
            if (this.form === "双核") {
                this.doubleCoreTurns--;
                if (this.doubleCoreTurns <= 0) {
                    this.form = "火核";
                    log(`<div class="dragon">${this.getDisplayName()} 退出双核形态</div>`);
                } else {
                    // 双核形态持续效果
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    const dualDamage = Math.floor(this.atk * 0.5);
                    enemies.forEach(enemy => {
                        enemy.hp = clamp(enemy.hp - dualDamage, 0, enemy.maxhp);
                    });
                    log(`<div class="dragon">${this.getDisplayName()} 的双核能量造成 ${dualDamage} 伤害</div>`);
                }
            }
            
            // 巨龙狂怒
            if (this.hp < this.maxhp * 0.35 && !this.dragonRage) {
                this.dragonRage = true;
                this.buffs["巨龙狂怒"] = { st: 999, val: 30 }; // 火雷伤害+30%
                this.def = Math.floor(this.def * 1.2); // 防御+20%
                this.atk = Math.floor(this.atk * 1.15); // 攻击+15%
                log(`<div class="dragon">${this.getDisplayName()} 触发巨龙狂怒，伤害和防御大幅提升！</div>`);
            }
            
            // 元素印记效果
            const enemiesWithFire = field.filter(x => x.side !== this.side && x.debuffs["火焰印记"]);
            const enemiesWithThunder = field.filter(x => x.side !== this.side && x.debuffs["雷霆印记"]);
            
            // 火焰印记持续伤害
            enemiesWithFire.forEach(enemy => {
                const fireStacks = enemy.debuffs["火焰印记"].val;
                if (fireStacks > 0) {
                    const fireDamage = Math.floor(this.atk * 0.2 * fireStacks);
                    enemy.hp = clamp(enemy.hp - fireDamage, 0, enemy.maxhp);
                }
            });
            
            // 雷霆印记效果
            enemiesWithThunder.forEach(enemy => {
                const thunderStacks = enemy.debuffs["雷霆印记"].val;
                if (thunderStacks >= 2) {
                    // 降低速度
                    if (!enemy.debuffs["雷电阻滞"]) {
                        enemy.debuffs["雷电阻滞"] = { st: 1, val: thunderStacks * 10 }; // 每层降低10%速度
                    }
                }
            });
            
            // 元素能量自然增长
            if (this.elementEnergy < this.maxElementEnergy) {
                this.elementEnergy = Math.min(this.elementEnergy + 8, this.maxElementEnergy);
            }
            
            // 元素重生
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                
                // 引爆所有印记
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let explosionDamage = 0;
                
                enemies.forEach(enemy => {
                    const fireStacks = enemy.debuffs["火焰印记"]?.val || 0;
                    const thunderStacks = enemy.debuffs["雷霆印记"]?.val || 0;
                    const totalDamage = Math.floor(this.atk * 0.8 * 1.55 * (fireStacks + thunderStacks));
                    enemy.hp = clamp(enemy.hp - totalDamage, 0, enemy.maxhp);
                    explosionDamage += totalDamage;
                    
                    // 清除印记
                    delete enemy.debuffs["火焰印记"];
                    delete enemy.debuffs["雷霆印记"];
                });
                
                // 重置技能冷却
                Object.keys(this.cooldowns).forEach(skill => {
                    this.cooldowns[skill] = 0;
                });
                
                // 进入双核形态
                this.form = "双核";
                this.doubleCoreTurns = 3;
                
                log(`<div class="dragon">${this.getDisplayName()} 触发元素重生，锁血1点，引爆所有印记造成 ${explosionDamage} 伤害，进入双核形态</div>`);
            }
        };
        
        log(`<div class="dragon">${c.getDisplayName()} 炽雷灭世龙激活，元素浓度: ${c.elementConcentration}%</div>`);
    }
};