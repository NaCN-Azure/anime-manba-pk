// 云璃 角色实现
DB["云璃"] = {
    hp: 13500,
    mp: 7100,
    atk: 1600,
    def: 1200,
    spd: 155,
    cr: 42,
    cd: 200,
    sacred: 480,
    skills: [
        { n: "光脚・共鸣积累", c: 1, mp: 140, d: 0, e: "能量提升", s: 0 },
        { n: "冈格尼尔・精准投", c: 2, mp: 310, d: 1.9 * 1.48, e: "单体爆发", s: 1 },
        { n: "冈格尼尔・群体穿", c: 3, mp: 370, d: 1.6 * 1.48, e: "范围穿透", s: 1 },
        { n: "光脚・地面控场", c: 2, mp: 250, d: 0, e: "群体控制", s: 1 },
        { n: "馆主・神圣领域", c: 3, mp: 330, d: 0, e: "范围增益", s: 0 },
        { n: "冈格尼尔・护盾", c: 2, mp: 230, d: 0, e: "自保反伤", s: 0 },
        { n: "神圣・冈格尼尔终", c: 0, mp: 780, d: 7.5 * 1.48, e: "终极穿透", s: 1 }
    ],
    passive(c) {
        c.sacredResonance = 0; // 神圣共鸣度
        c.maxSacredResonance = 300;
        c.resonanceForm = "触地"; // 形态：触地/共鸣/圣化
        c.penetrationStacks = 0; // 穿透印记层数
        c.maxPenetrationStacks = 3;
        c.lockHP = 1; // 馆主保命
        c.deathOnce = 1;
        c.chargeTurns = 0; // 蓄力回合
        
        // 设置技能实现
        c.skillImpl = {
            "光脚・共鸣积累": function(s, target, field) {
                this.sacredResonance = Math.min(this.sacredResonance + 100, this.maxSacredResonance);
                this.buffs["共鸣增益"] = { st: 1, val: 48 }; // 下次投掷伤害+48%
                log(`<div class="sacred-throw">${this.getDisplayName()} 使用光脚・共鸣积累，共鸣度增加100，下次投掷伤害+48%</div>`);
                return true;
            },
            
            "冈格尼尔・精准投": function(s, target, field) {
                // 检查共鸣增益
                const resonanceBonus = this.buffs["共鸣增益"] ? this.buffs["共鸣增益"].val / 100 : 1;
                const damage = Math.floor(this.atk * s.d * this.crit() * resonanceBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="sacred-throw">${this.getDisplayName()} 使用冈格尼尔・精准投对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 移除共鸣增益
                delete this.buffs["共鸣增益"];
                
                // 增加穿透印记
                if (!target.debuffs["神圣穿透印记"]) {
                    target.debuffs["神圣穿透印记"] = { st: 2, val: 0 };
                }
                target.debuffs["神圣穿透印记"].val = Math.min(target.debuffs["神圣穿透印记"].val + 2, this.maxPenetrationStacks);
                log(`<div class="sacred-throw">${target.getDisplayName()} 获得 ${target.debuffs["神圣穿透印记"].val} 层神圣穿透印记</div>`);
                
                return true;
            },
            
            "冈格尼尔・群体穿": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 3);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="sacred-throw">${this.getDisplayName()} 使用冈格尼尔・群体穿对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    
                    // 增加穿透印记
                    if (!enemy.debuffs["神圣穿透印记"]) {
                        enemy.debuffs["神圣穿透印记"] = { st: 2, val: 0 };
                    }
                    enemy.debuffs["神圣穿透印记"].val = Math.min(enemy.debuffs["神圣穿透印记"].val + 1, this.maxPenetrationStacks);
                });
                return true;
            },
            
            "光脚・地面控场": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                enemies.forEach(enemy => {
                    enemy.debuffs["地面束缚"] = { st: 2, val: 30 }; // 速度-30%
                    if (roll(40)) {
                        enemy.debuffs["定身"] = { st: 1, val: 0 }; // 40%概率定身
                    }
                });
                
                this.buffs["地面掌控"] = { st: 2, val: 20 }; // 自身速度+20%
                log(`<div class="sacred-throw">${this.getDisplayName()} 使用光脚・地面控场，束缚所有敌人</div>`);
                return true;
            },
            
            "馆主・神圣领域": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["神圣领域"] = { st: 3, val: 15 }; // 全属性+15%
                    ally.buffs["神圣庇护"] = { st: 3, val: Math.floor(this.atk * 1.5) }; // 护盾
                });
                
                this.sacredResonance = Math.min(this.sacredResonance + 50, this.maxSacredResonance);
                log(`<div class="sacred-throw">${this.getDisplayName()} 展开馆主・神圣领域，全队获得增益，共鸣度增加50</div>`);
                return true;
            },
            
            "冈格尼尔・护盾": function(s, target, field) {
                const shield = Math.floor(this.atk * 2.2);
                this.buffs["冈格尼尔护盾"] = { st: 3, val: shield };
                this.hasReflect = true;
                this.reflectDamage = Math.floor(this.atk * 0.5);
                log(`<div class="sacred-throw">${this.getDisplayName()} 使用冈格尼尔・护盾，获得 ${shield} 点护盾和反伤效果</div>`);
                return true;
            },
            
            "神圣・冈格尼尔终": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                // 前6次穿透轰击
                for (let i = 0; i < 6; i++) {
                    enemies.forEach(enemy => {
                        // 根据穿透印记增加伤害
                        const penetrationStacks = enemy.debuffs["神圣穿透印记"]?.val || 0;
                        const penetrationBonus = 1 + (penetrationStacks * 0.25);
                        const damage = Math.floor(this.atk * 1.5 * 1.48 * 1.75 * this.crit() * penetrationBonus);
                        const actualDamage = enemy.processDamage(damage, this, s.n);
                        totalDamage += actualDamage;
                    });
                }
                
                // 第7次裁决一击
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * 2.5 + this.sacred * 13);
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 即死判定
                    if (enemy.debuffs["神圣贯穿"] && roll(38)) {
                        const oldHP = enemy.hp;
                        enemy.hp = 0;
                        log(`<div class="sacred-throw">${this.getDisplayName()} 触发即死判定，${enemy.getDisplayName()} 被秒杀（${oldHP} HP）</div>`);
                    }
                });
                
                this.sacredResonance += 150;
                // 清除所有穿透印记
                enemies.forEach(enemy => {
                    delete enemy.debuffs["神圣穿透印记"];
                });
                
                log(`<div class="sacred-throw">${this.getDisplayName()} 使用神圣・冈格尼尔终，造成总计 ${totalDamage} 伤害，共鸣度增加150</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 形态切换
            if (this.sacredResonance >= 301 && this.resonanceForm !== "圣化") {
                this.resonanceForm = "圣化";
                this.buffs["圣化形态"] = { st: 3, val: 75 }; // 伤害+75%，暴击率75%
                this.cr = 75;
                log(`<div class="sacred-throw">${this.getDisplayName()} 进入圣化形态</div>`);
            } else if (this.sacredResonance >= 131 && this.sacredResonance <= 300 && this.resonanceForm !== "共鸣") {
                this.resonanceForm = "共鸣";
                this.buffs["共鸣形态"] = { st: 4, val: 38 }; // 伤害+38%，暴击率+20%
                this.cr = Math.min(this.cr + 20, 100);
                log(`<div class="sacred-throw">${this.getDisplayName()} 进入共鸣形态</div>`);
            }
            
            // 每回合生成共鸣值
            if (this.resonanceForm === "触地") {
                this.sacredResonance = Math.min(this.sacredResonance + 70, 300);
            } else if (this.resonanceForm === "共鸣") {
                this.sacredResonance = Math.min(this.sacredResonance + 40, 300);
            }
            
            // 神圣共鸣效果
            if (this.sacredResonance > 0) {
                const resonanceEffect = Math.floor(this.sacredResonance / 100);
                this.buffs["神圣共鸣"] = { st: 1, val: resonanceEffect * 10 }; // 每100共鸣度提供10%全属性加成
            }
            
            // 馆主保命
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 2430;
                this.deathOnce = 0;
                this.sacredResonance = Math.min(this.sacredResonance + 85, 300);
                this.buffs["圣矛守护"] = { st: 2, val: 0 };
                this.buffs["冈格尼尔护盾"] = { st: 2, val: Math.floor(this.atk * 3.5) };
                log(`<div class="sacred-throw">${this.getDisplayName()} 触发馆主保命，锁血2430点</div>`);
            }
        };
        
        log(`<div class="sacred-throw">${c.getDisplayName()} 神圣投掷者激活，神圣共鸣度: ${c.sacredResonance}</div>`);
    }
};