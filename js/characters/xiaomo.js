// 小莫 角色实现
DB["小莫"] = {
    hp: 15000,
    mp: 9800,
    atk: 2000,
    def: 1200,
    spd: 160,
    cr: 40,
    cd: 230,
    ele: 350,
    skills: [
        // 通用技能
        { n: "元素契约・唤灵", c: 3, mp: 220, d: 0, e: "召唤", s: 0 },
        // 火形态技能
        { n: "焚天炎爆", c: 3, mp: 380, d: 2.8 * 1.35, e: "灼烧", s: 1, form: "火" },
        { n: "炎狱囚笼", c: 2, mp: 280, d: 2.2 * 1.35, e: "炎狱", s: 1, form: "火" },
        { n: "炎核过载", c: 4, mp: 300, d: 2 * 1.35, e: "过载", s: 1, form: "火" },
        // 冰形态技能
        { n: "极霜暴雪", c: 3, mp: 350, d: 2.5 * 1.35, e: "冻结", s: 1, form: "冰" },
        { n: "冰棱护盾", c: 2, mp: 250, d: 0, e: "冰棱盾", s: 0, form: "冰" },
        { n: "冰域禁锢", c: 3, mp: 280, d: 2.2 * 1.35, e: "冰域", s: 1, form: "冰" },
        // 雷形态技能
        { n: "雷霆万钧", c: 4, mp: 400, d: 1.5 * 1.35 * 3, e: "麻痹", s: 1, form: "雷" },
        { n: "雷暴突袭", c: 2, mp: 260, d: 2.4 * 1.35, e: "破防", s: 1, form: "雷" },
        { n: "雷云破防", c: 4, mp: 350, d: 0.8 * 1.35, e: "雷云", s: 1, form: "雷" },
        // 水形态技能
        { n: "百川怒涛", c: 3, mp: 320, d: 2.8 * 1.35, e: "割裂", s: 1, form: "水" },
        { n: "水幕绞杀", c: 3, mp: 280, d: 1 * 1.35, e: "水幕", s: 1, form: "水" },
        { n: "深海冲击", c: 4, mp: 350, d: 5 * 1.35, e: "深海", s: 1, form: "水" },
        // 终极技能
        { n: "元素寂灭", c: 6, mp: 850, d: 0, e: "终", s: 0 }
    ],
    passive(c) {
        c.dmg *= 1.35;
        c.mpBack = 30;
        c.lockHP = 1;
        c.pen = 30; // 无视30%防御
        c.waterCD = 280;
        c.otherCD = 260; // 形态暴伤加成
        c.mpBackWater = 30;
        c.mpBackOther = 25;
        c.healLow = 30;
        c.healAmount = 2400; // HP<30%时回血
        c.waterReduce = 25; // 水形态减伤
        c.randomSkills = 3; // 每回合随机释放3个技能
        c.ultimateLimit = 1; // 终极技能每回合最多1次
        c.currentForm = "无"; // 当前形态
        
        // 设置技能实现
        c.skillImpl = {
            "元素契约・唤灵": function(s, target, field) {
                const forms = ["火", "冰", "雷", "水"];
                const newForm = forms[rand(forms.length)];
                this.currentForm = newForm;
                
                // 根据形态获得不同加成
                switch (newForm) {
                    case "火":
                        this.buffs["火焰形态"] = { st: 4, val: 25 }; // 火伤+25%
                        break;
                    case "冰":
                        this.buffs["寒冰形态"] = { st: 4, val: 20 }; // 防御+20%
                        break;
                    case "雷":
                        this.buffs["雷霆形态"] = { st: 4, val: 15 }; // 速度+15%
                        break;
                    case "水":
                        this.buffs["流水形态"] = { st: 4, val: 30 }; // 治疗+30%
                        break;
                }
                
                log(`${this.getDisplayName()} 使用元素契约・唤灵，切换至 ${newForm} 形态`);
                return true;
            },
            
            "焚天炎爆": function(s, target, field) {
                if (this.currentForm !== "火") return false;
                
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用焚天炎爆对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["灼烧"] = { st: 3, val: Math.floor(this.atk * 0.4) };
                return true;
            },
            
            "炎狱囚笼": function(s, target, field) {
                if (this.currentForm !== "火") return false;
                
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用炎狱囚笼对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["炎狱"] = { st: 2, val: 0 }; // 无法行动1回合
                log(`${this.getDisplayName()} 的炎狱囚笼困住了 ${target.getDisplayName()}`);
                return true;
            },
            
            "冰棱护盾": function(s, target, field) {
                if (this.currentForm !== "冰") return false;
                
                const shield = Math.floor(this.atk * 2.5);
                this.buffs["冰棱护盾"] = { st: 3, val: shield };
                this.hasReflect = true;
                this.reflectDamage = Math.floor(this.atk * 0.6);
                log(`${this.getDisplayName()} 使用冰棱护盾，获得 ${shield} 点护盾和反伤效果`);
                return true;
            },
            
            "极霜暴雪": function(s, target, field) {
                if (this.currentForm !== "冰") return false;
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 3);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用极霜暴雪对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    if (roll(30)) {
                        enemy.debuffs["冻结"] = { st: 1, val: 0 }; // 冻结1回合
                        log(`${enemy.getDisplayName()} 被冻结了`);
                    }
                });
                return true;
            },
            
            "雷霆万钧": function(s, target, field) {
                if (this.currentForm !== "雷") return false;
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 3);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用雷霆万钧对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    enemy.debuffs["麻痹"] = { st: 2, val: 30 }; // 速度-30%
                });
                return true;
            },
            
            "雷暴突袭": function(s, target, field) {
                if (this.currentForm !== "雷") return false;
                
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用雷暴突袭对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["破防"] = { st: 2, val: 25 }; // 防御-25%
                return true;
            },
            
            "百川怒涛": function(s, target, field) {
                if (this.currentForm !== "水") return false;
                
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用百川怒涛对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["割裂"] = { st: 3, val: Math.floor(this.atk * 0.35) };
                
                // 水形态治疗
                const allies = field.filter(x => x.side === this.side && x.hp > 0);
                const heal = Math.floor(this.atk * 0.8);
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                });
                log(`${this.getDisplayName()} 的水形态同时治疗全体友军 ${heal} HP`);
                return true;
            },
            
            "水幕绞杀": function(s, target, field) {
                if (this.currentForm !== "水") return false;
                
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 2);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 使用水幕绞杀对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    enemy.debuffs["水幕"] = { st: 2, val: 20 }; // 命中-20%
                });
                return true;
            },
            
            "元素寂灭": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                let totalDamage = 0;
                
                enemies.forEach(enemy => {
                    // 根据当前形态造成不同伤害
                    let damageMultiplier = 1;
                    switch (this.currentForm) {
                        case "火": damageMultiplier = 1.4; break;
                        case "冰": damageMultiplier = 1.3; break;
                        case "雷": damageMultiplier = 1.5; break;
                        case "水": damageMultiplier = 1.2; break;
                    }
                    
                    const damage = Math.floor(this.atk * 3.5 * damageMultiplier * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                });
                
                // 重置形态
                this.currentForm = "无";
                
                log(`${this.getDisplayName()} 使用元素寂灭，造成总计 ${totalDamage} 伤害，元素形态重置`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 形态特定效果
            switch (this.currentForm) {
                case "火":
                    // 火形态持续伤害
                    const burningEnemies = field.filter(x => x.side !== this.side && x.debuffs["灼烧"]);
                    burningEnemies.forEach(enemy => {
                        const burnDamage = Math.floor(this.atk * 0.2);
                        enemy.hp = clamp(enemy.hp - burnDamage, 0, enemy.maxhp);
                        if (burnDamage > 0) {
                            log(`${this.getDisplayName()} 的火形态持续灼烧 ${enemy.getDisplayName()} ${burnDamage} 伤害`);
                        }
                    });
                    break;
                case "水":
                    // 水形态减伤
                    this.buffs["水流护体"] = { st: 1, val: this.waterReduce };
                    // 水形态MP回复
                    if (roll(this.mpBackWater)) {
                        const mpRestore = Math.floor(this.maxmp * 0.04);
                        this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
                    }
                    break;
                default:
                    // 其他形态MP回复
                    if (roll(this.mpBackOther)) {
                        const mpRestore = Math.floor(this.maxmp * 0.03);
                        this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
                    }
            }
            
            // 低血量治疗
            if (this.hp < this.maxhp * this.healLow / 100) {
                this.hp = clamp(this.hp + this.healAmount, 0, this.maxhp);
                log(`${this.getDisplayName()} 触发元素治愈，恢复 ${this.healAmount} HP`);
            }
            
            // 锁血保命
            if (this.hp <= 0 && this.lockHP) {
                this.hp = 1;
                this.lockHP = 0;
                this.buffs["元素护体"] = { st: 2, val: 0 };
                log(`${this.getDisplayName()} 触发元素护体，锁血1点`);
            }
            
            // 随机技能释放（特殊AI）
            if (this.randomSkills > 0) {
                const availableSkills = this.skills.filter(skill => 
                    this.canUse(skill) && 
                    (!skill.form || skill.form === this.currentForm) &&
                    skill.n !== "元素寂灭"
                );
                
                const skillsToUse = [];
                for (let i = 0; i < Math.min(this.randomSkills, availableSkills.length); i++) {
                    const randomSkill = availableSkills[rand(availableSkills.length)];
                    if (!skillsToUse.includes(randomSkill)) {
                        skillsToUse.push(randomSkill);
                    }
                }
                
                if (skillsToUse.length > 0) {
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    if (enemies.length > 0) {
                        const target = enemies[rand(enemies.length)];
                        log(`<div class="special-turn">${this.getDisplayName()} 元素涌动，一回合释放多个技能: ${skillsToUse.map(s => s.n).join(", ")}</div>`);
                        
                        skillsToUse.forEach(skill => {
                            this.useSkill(skill, target, field);
                        });
                    }
                }
            }
        };
    }
};