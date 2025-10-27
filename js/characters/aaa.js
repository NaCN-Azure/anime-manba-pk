// AAA 角色实现
DB["AAA"] = {
    hp: 14000,
    mp: 9500,
    atk: 2000,
    def: 1500,
    spd: 160,
    cr: 35,
    cd: 210,
    energy: 550,
    skills: [
        { n: "微光点疗", c: 1, mp: 126, d: -2.79, e: "单体治疗", s: 0 },
        { n: "泛光群疗", c: 2, mp: 157.5, d: -1.86, e: "群体治疗", s: 0 },
        { n: "急救瞬疗", c: 3, mp: 180, d: -3.875, e: "单体急救", s: 0 },
        { n: "节能祝福", c: 2, mp: 135, d: 0, e: "群体减耗", s: 0 },
        { n: "微光护盾", c: 2, mp: 144, d: 0, e: "群体护盾", s: 0 },
        { n: "余波回收", c: 1, mp: 0, d: 0, e: "自身回蓝", s: 0 },
        { n: "节能・全域祈光", c: 6, mp: 360, d: -5.425, e: "终极治疗", s: 0 }
    ],
    passive(c) {
        c.energyEfficiency = 55; // 节能效率55%
        c.mpRecovery = 90; // 回收90%MP消耗
        c.energyLayers = 0; // 节能层数
        c.maxEnergyLayers = 4; // 最大节能层数
        c.energyLayerBonus = 12; // 每层降低MP消耗12%
        c.healBonusPerLayer = 8; // 每层治疗量提升8%
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        
        // 微光守护触发条件
        c.microLightGuardTriggers = 4;
        c.microLightGuardUsed = 0;
        
        // 设置技能实现
        c.skillImpl = {
            "微光点疗": function(s, target, field) {
                const heal = Math.floor(this.atk * 1.8 * 1.55);
                target.hp = clamp(target.hp + heal, 0, target.maxhp);
                // 回收MP
                const mpBack = Math.floor(s.mp * 0.9);
                this.mp = clamp(this.mp + mpBack, 0, this.maxmp);
                log(`<div class="energy-saving">${this.getDisplayName()} 使用微光点疗治疗 ${target.getDisplayName()} ${heal} HP，回收 ${mpBack} MP</div>`);
                
                // 节能层叠加
                this.energyLayers = Math.min(this.energyLayers + 1, this.maxEnergyLayers);
                return true;
            },
            
            "泛光群疗": function(s, target, field) {
                const heal = Math.floor(this.atk * 1.2 * 1.55);
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                });
                const mpBack = Math.floor(s.mp * 0.9);
                this.mp = clamp(this.mp + mpBack, 0, this.maxmp);
                log(`<div class="energy-saving">${this.getDisplayName()} 使用泛光群疗治疗全体友军 ${heal} HP，回收 ${mpBack} MP</div>`);
                
                this.energyLayers = Math.min(this.energyLayers + 1, this.maxEnergyLayers);
                return true;
            },
            
            "节能祝福": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["节能祝福"] = { st: 3, val: 30 }; // MP消耗-30%
                });
                const mpBack = Math.floor(s.mp * 0.9);
                this.mp = clamp(this.mp + mpBack, 0, this.maxmp);
                log(`<div class="energy-saving">${this.getDisplayName()} 使用节能祝福，全队MP消耗-30%，回收 ${mpBack} MP</div>`);
                
                this.energyLayers = Math.min(this.energyLayers + 1, this.maxEnergyLayers);
                return true;
            },
            
            "微光护盾": function(s, target, field) {
                const shield = Math.floor(this.atk * 1.6 * 1.55);
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["微光护盾"] = { st: 2, val: shield };
                });
                const mpBack = Math.floor(s.mp * 0.9);
                this.mp = clamp(this.mp + mpBack, 0, this.maxmp);
                log(`<div class="energy-saving">${this.getDisplayName()} 使用微光护盾，全队获得 ${shield} 点护盾，回收 ${mpBack} MP</div>`);
                
                this.energyLayers = Math.min(this.energyLayers + 1, this.maxEnergyLayers);
                return true;
            },
            
            "余波回收": function(s, target, field) {
                const mpBack = Math.floor(this.maxmp * 0.05);
                this.mp = clamp(this.mp + mpBack, 0, this.maxmp);
                if (this.energyLayers >= 4) {
                    const hpBack = Math.floor(this.maxhp * 0.08);
                    this.hp = clamp(this.hp + hpBack, 0, this.maxhp);
                    log(`<div class="energy-saving">${this.getDisplayName()} 使用余波回收，恢复 ${mpBack} MP 和 ${hpBack} HP</div>`);
                } else {
                    log(`<div class="energy-saving">${this.getDisplayName()} 使用余波回收，恢复 ${mpBack} MP</div>`);
                }
                return true;
            },
            
            "节能・全域祈光": function(s, target, field) {
                const heal = Math.floor(this.atk * 3.5 * 1.55);
                const mpRestore = 0.2; // 20%最大MP
                const allies = field.filter(x => x.side === this.side);
                
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    ally.mp = clamp(ally.mp + ally.maxmp * mpRestore, 0, ally.maxmp);
                    ally.buffs["全域节能"] = { st: 3, val: 45 }; // MP消耗-45%
                });
                
                this.buffs["节能巅峰"] = { st: 5, val: 40 }; // 治疗量+40%
                this.energyLayers = 4;
                
                log(`<div class="energy-saving">${this.getDisplayName()} 使用节能・全域祈光，全队恢复 ${heal} HP 和 20% MP，进入节能巅峰状态</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 节能层效果
            if (this.energyLayers > 0) {
                const mpReduce = this.energyLayers * this.energyLayerBonus;
                const healBonus = this.energyLayers * this.healBonusPerLayer;
                this.buffs["节能层"] = { st: 1, val: mpReduce };
                this.buffs["治疗加成"] = { st: 1, val: healBonus };
            }
            
            // 微光守护触发
            const lowHPAllies = field.filter(x => x.side === this.side && x.hp < x.maxhp * 0.25 && x.hp > 0);
            const lowMPAllies = field.filter(x => x.side === this.side && x.mp < x.maxmp * 0.15 && x.mp > 0);
            
            if ((lowHPAllies.length > 0 || lowMPAllies.length > 0) && this.microLightGuardUsed < this.microLightGuardTriggers) {
                const target = lowHPAllies[0] || lowMPAllies[0];
                target.hp = clamp(target.hp + target.maxhp * 0.3, 0, target.maxhp);
                target.buffs["节能庇护"] = { st: 3, val: 35 }; // MP消耗-35%
                
                if (target.mp < target.maxmp * 0.15) {
                    target.mp = clamp(target.mp + target.maxmp * 0.2, 0, target.maxmp);
                }
                
                this.microLightGuardUsed++;
                log(`<div class="energy-saving">${this.getDisplayName()} 触发微光守护，保护 ${target.getDisplayName()}</div>`);
            }
        };
        
        log(`<div class="energy-saving">${c.getDisplayName()} 节能圣职者激活，节能效率: ${c.energyEfficiency}%</div>`);
    }
};