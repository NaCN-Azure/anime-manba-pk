// Johnson 角色实现
DB["Johnson"] = {
    hp: 25000,
    mp: 4200,
    atk: 1200,
    def: 2200,
    spd: 110,
    cr: 10,
    cd: 150,
    holy: 500,
    skills: [
        { n: "光辉圣壁・全域", c: 6, mp: 500, d: 0, e: "圣壁领域", s: 0 },
        { n: "圣壁・定向屏障", c: 3, mp: 300, d: 0, e: "定向庇护", s: 0 },
        { n: "圣壁・群体免伤", c: 4, mp: 350, d: 0, e: "团队免伤", s: 0 },
        { n: "圣壁・伤害转移", c: 2, mp: 200, d: 0, e: "伤害转移", s: 0 },
        { n: "圣壁・反伤脉冲", c: 0, mp: 0, d: 0, e: "被动反伤", s: 0 },
        { n: "圣壁・终极防护", c: 0, mp: 0, d: 0, e: "终极防御", s: 0 }
    ],
    passive(c) {
        c.holyShieldStrength = 500; // 圣壁强度
        c.mpBack = 40; // 光明系回蓝比例提升
        c.immune.add("减速");
        c.immune.add("禁锢");
        c.lockHP = 1; // 锁血机制
        c.deathOnce = 1; // 圣壁不朽被动
        
        // 圣壁领域相关属性
        c.sanctuaryActive = false;
        c.sanctuaryTurns = 0;
        c.sanctuaryTarget = null;
        c.damageTakenThisTurn = 0;
        c.damageConverted = 0;
        
        // 反伤机制
        c.reflectDamage = 0;
        c.reflectMax = 2400;
        
        // 庇护光环
        c.allyDefBonus = 5;
        c.maxAllyDefBonus = 25;
        c.allyDefStacks = 0;
        
        // 设置技能实现
        c.skillImpl = {
            "光辉圣壁・全域": function(s, target, field) {
                this.sanctuaryActive = true;
                this.sanctuaryTurns = 4;
                
                const allies = field.filter(x => x.side === this.side);
                const sanctuaryShield = Math.floor(this.holyShieldStrength * 3);
                
                allies.forEach(ally => {
                    ally.buffs["光辉圣壁"] = { st: 4, val: sanctuaryShield };
                    ally.buffs["圣壁庇护"] = { st: 4, val: 30 }; // 受到伤害-30%
                });
                
                this.buffs["圣壁核心"] = { st: 4, val: 0 };
                log(`<div class="holy-wall">${this.getDisplayName()} 展开光辉圣壁・全域，全队获得 ${sanctuaryShield} 点护盾和30%减伤</div>`);
                return true;
            },
            
            "圣壁・定向屏障": function(s, target, field) {
                const barrierShield = Math.floor(this.holyShieldStrength * 4);
                target.buffs["定向屏障"] = { st: 3, val: barrierShield };
                target.buffs["绝对防御"] = { st: 2, val: 50 }; // 防御+50%
                target.buffs["屏障免疫"] = { st: 1, val: 0 }; // 免疫控制1回合
                
                this.sanctuaryTarget = target;
                log(`<div class="holy-wall">${this.getDisplayName()} 为 ${target.getDisplayName()} 施加定向屏障，提供 ${barrierShield} 点护盾</div>`);
                return true;
            },
            
            "圣壁・群体免伤": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                const damageReduction = 40 + Math.floor(this.allyDefStacks * 2); // 基础40%，每层防御叠加+2%
                
                allies.forEach(ally => {
                    ally.buffs["群体免伤"] = { st: 2, val: damageReduction }; // 受到伤害降低
                    ally.buffs["圣壁守护"] = { st: 2, val: Math.floor(this.holyShieldStrength * 1.5) }; // 额外护盾
                });
                
                log(`<div class="holy-wall">${this.getDisplayName()} 使用圣壁・群体免伤，全队受到伤害降低${damageReduction}%</div>`);
                return true;
            },
            
            "圣壁・伤害转移": function(s, target, field) {
                this.buffs["伤害转移"] = { st: 3, val: 60 }; // 转移60%受到的伤害
                this.buffs["转移护盾"] = { st: 3, val: Math.floor(this.holyShieldStrength * 2) }; // 转移伤害形成的护盾
                
                log(`<div class="holy-wall">${this.getDisplayName()} 激活圣壁・伤害转移，将60%伤害转移并形成护盾</div>`);
                return true;
            },
            
            "圣壁・反伤脉冲": function(s, target, field) {
                // 被动技能，无需主动使用
                log(`<div class="holy-wall">${this.getDisplayName()} 的圣壁・反伤脉冲已激活</div>`);
                return true;
            },
            
            "圣壁・终极防护": function(s, target, field) {
                this.buffs["终极防护"] = { st: 2, val: 0 };
                this.isInvincible = true; // 无敌2回合
                
                const allies = field.filter(x => x.side === this.side);
                const ultimateShield = Math.floor(this.holyShieldStrength * 5);
                
                allies.forEach(ally => {
                    ally.buffs["终极护盾"] = { st: 2, val: ultimateShield };
                    ally.buffs["防护领域"] = { st: 2, val: 80 }; // 受到伤害-80%
                });
                
                // 重置所有技能冷却
                Object.keys(this.cooldowns).forEach(skill => {
                    this.cooldowns[skill] = 0;
                });
                
                log(`<div class="holy-wall">${this.getDisplayName()} 使用圣壁・终极防护，全队无敌2回合并获得 ${ultimateShield} 点护盾</div>`);
                return true;
            }
        };
        
        // 重写processDamage方法处理伤害转移
        const originalProcessDamage = c.processDamage;
        c.processDamage = function(damage, attacker, skillName) {
            // 伤害转移处理
            if (this.buffs["伤害转移"]) {
                const transferRate = this.buffs["伤害转移"].val / 100;
                const transferredDamage = Math.floor(damage * transferRate);
                const remainingDamage = damage - transferredDamage;
                
                // 将转移的伤害转化为护盾
                if (this.buffs["转移护盾"]) {
                    this.buffs["转移护盾"].val += transferredDamage;
                }
                
                this.damageConverted += transferredDamage;
                log(`<div class="holy-wall">${this.getDisplayName()} 的伤害转移将 ${transferredDamage} 伤害转化为护盾</div>`);
                
                // 只处理剩余伤害
                if (remainingDamage <= 0) return 0;
                damage = remainingDamage;
            }
            
            // 记录本回合受到的伤害
            this.damageTakenThisTurn += damage;
            
            // 调用原始处理方法
            return originalProcessDamage.call(this, damage, attacker, skillName);
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 圣壁领域效果
            if (this.sanctuaryActive) {
                this.sanctuaryTurns--;
                
                if (this.sanctuaryTurns <= 0) {
                    this.sanctuaryActive = false;
                    log(`<div class="holy-wall">${this.getDisplayName()} 的光辉圣壁领域消散了</div>`);
                } else {
                    // 圣壁领域持续效果
                    const allies = field.filter(x => x.side === this.side);
                    const healAmount = Math.floor(this.holyShieldStrength * 0.1);
                    
                    allies.forEach(ally => {
                        ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                        // 刷新护盾
                        if (ally.buffs["光辉圣壁"]) {
                            ally.buffs["光辉圣壁"].val = Math.floor(this.holyShieldStrength * 3);
                        }
                    });
                    
                    log(`<div class="holy-wall">${this.getDisplayName()} 的圣壁领域治疗全体 ${healAmount} HP</div>`);
                }
            }
            
            // 定向屏障保护
            if (this.sanctuaryTarget && this.sanctuaryTarget.hp > 0) {
                const barrierRefresh = Math.floor(this.holyShieldStrength * 0.5);
                if (this.sanctuaryTarget.buffs["定向屏障"]) {
                    this.sanctuaryTarget.buffs["定向屏障"].val += barrierRefresh;
                }
            }
            
            // 反伤脉冲
            if (this.damageTakenThisTurn > 0) {
                this.reflectDamage = Math.min(this.damageTakenThisTurn * 0.4, this.reflectMax);
                this.hasReflect = true;
                log(`<div class="holy-wall">${this.getDisplayName()} 本回合受到 ${this.damageTakenThisTurn} 伤害，反伤值: ${this.reflectDamage}</div>`);
            }
            
            // 庇护光环
            const allies = field.filter(x => x.side === this.side && x !== this);
            if (allies.length > 0) {
                this.allyDefStacks = Math.min(allies.length, 5); // 最多5层
                const totalDefBonus = this.allyDefBonus * this.allyDefStacks;
                
                allies.forEach(ally => {
                    ally.buffs["庇护光环"] = { st: 1, val: totalDefBonus }; // 防御加成
                });
            }
            
            // MP回复
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.06);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 圣壁不朽
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.buffs["圣壁不朽"] = { st: 3, val: 0 };
                
                // 复活时激活所有防御技能
                this.sanctuaryActive = true;
                this.sanctuaryTurns = 3;
                this.buffs["伤害转移"] = { st: 3, val: 80 }; // 提高转移比例
                
                const allies = field.filter(x => x.side === this.side);
                const resurrectionShield = Math.floor(this.holyShieldStrength * 4);
                allies.forEach(ally => {
                    ally.buffs["圣壁复苏"] = { st: 2, val: resurrectionShield };
                });
                
                log(`<div class="holy-wall">${this.getDisplayName()} 触发圣壁不朽，锁血1点并强化所有防御技能</div>`);
            }
            
            // 重置伤害记录
            this.damageTakenThisTurn = 0;
        };
        
        log(`<div class="holy-wall">${c.getDisplayName()} 光辉圣壁已激活，圣壁强度: ${c.holyShieldStrength}</div>`);
    }
};