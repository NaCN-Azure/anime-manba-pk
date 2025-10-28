// 樱 角色实现
DB["樱"] = {
    hp: 12000,
    mp: 6800,
    atk: 2000,
    def: 1200,
    spd: 210,
    cr: 55,
    cd: 170,
    aby: 500,
    skills: [
        { n: "暗影突袭", c: 2, mp: 320, d: 1.8 * 1.5, e: "印记", s: 1 },
        { n: "深渊刃舞", c: 3, mp: 450, d: 1.2 * 1.5 * 3, e: "多段", s: 1 },
        { n: "暗影斗篷", c: 4, mp: 280, d: 0, e: "隐匿", s: 0 },
        { n: "深渊爆发", c: 5, mp: 600, d: 1.5 * 1.5, e: "深渊形态", s: 1 },
        { n: "暗影追魂", c: 3, mp: 380, d: 2.2 * 1.5, e: "锁定", s: 1 },
        { n: "深渊具象", c: 6, mp: 500, d: 0, e: "召唤", s: 0 },
        { n: "深渊寂灭", c: 8, mp: 1000, d: 2.5 * 1.8, e: "终结", s: 0 }
    ],
    passive(c) {
        c.dmg *= 1.5;
        c.hide = 1;
        c.deathOnce = 1;
        c.immune.add("减速");
        c.hideCrit = 45;
        c.mpBackHide = 40;
        c.mpBackAby = 50;
        c.lowDefDmg = 20;
        c.critPen = 30;
        c.immune.add("减速");
        c.immune.add("禁锢");
        c.startHide = 2;
        c.startMark = 3;
        c.killAtk = 3;
        c.killAtkMax = 10;
        
        // 设置技能实现
        c.skillImpl = {
            "暗影突袭": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用暗影突袭对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                
                // 附加暗影印记
                target.debuffs["暗影印记"] = { st: 3, val: (target.debuffs["暗影印记"]?.val || 0) + 1 };
                
                // 隐匿状态加成
                if (this.hidden) {
                    this.hidden = false;
                    log(`${this.getDisplayName()} 从隐匿状态现身`);
                }
                return true;
            },
            
            "深渊刃舞": function(s, target, field) {
                let totalDamage = 0;
                for (let i = 0; i < 3; i++) {
                    const damage = Math.floor(this.atk * 1.2 * 1.5 * this.crit());
                    const actualDamage = target.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 每次攻击都有几率附加印记
                    if (roll(40)) {
                        target.debuffs["暗影印记"] = { st: 3, val: (target.debuffs["暗影印记"]?.val || 0) + 1 };
                    }
                }
                
                if (totalDamage > 0) {
                    log(`${this.getDisplayName()} 使用深渊刃舞对 ${target.getDisplayName()} 造成总计 ${totalDamage} 伤害`);
                }
                return true;
            },
            
            "暗影斗篷": function(s, target, field) {
                this.hidden = true;
                this.buffs["隐匿"] = { st: 2, val: 50 }; // 闪避率+50%
                this.buffs["暗影强化"] = { st: 2, val: 30 }; // 下次攻击伤害+30%
                log(`${this.getDisplayName()} 使用暗影斗篷，进入隐匿状态`);
                return true;
            },
            
            "深渊爆发": function(s, target, field) {
                this.buffs["深渊形态"] = { st: 3, val: 40 }; // 全属性提升40%
                this.hidden = false;
                
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用深渊爆发对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害，进入深渊形态`);
                }
                return true;
            },
            
            "深渊寂灭": function(s, target, field) {
                const markStacks = target.debuffs["暗影印记"]?.val || 0;
                const baseDamage = this.atk * s.d * this.crit();
                const markBonus = 1 + (markStacks * 0.2); // 每层印记+20%伤害
                const damage = Math.floor(baseDamage * markBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用深渊寂灭对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害，引爆 ${markStacks} 层暗影印记`);
                }
                
                // 即死判定
                if (target.hp < target.maxhp * 0.3 && roll(25 + markStacks * 5)) {
                    target.hp = 0;
                    log(`${this.getDisplayName()} 触发即死判定，${target.getDisplayName()} 被终结`);
                }
                
                delete target.debuffs["暗影印记"];
                this.hidden = true;
                this.buffs["终极隐匿"] = { st: 2, val: 0 };
                
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 隐匿状态MP回复
            if (this.hidden && roll(this.mpBackHide)) {
                const mpRestore = Math.floor(this.maxmp * 0.1);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 深渊形态MP回复
            if (this.buffs["深渊形态"] && roll(this.mpBackAby)) {
                const mpRestore = Math.floor(this.maxmp * 0.15);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 隐匿状态暴击加成
            if (this.hidden) {
                this.cr = Math.min(this.cr + this.hideCrit, 95);
            }
            
            // 对低防御目标伤害加成
            const lowDefEnemies = field.filter(x => x.side !== this.side && x.def < 1000);
            if (lowDefEnemies.length > 0) {
                this.buffs["弱点打击"] = { st: 1, val: this.lowDefDmg };
            }
            
            // 初始隐匿
            if (this.startHide > 0) {
                this.hidden = true;
                this.startHide--;
                if (this.startHide === 0) {
                    log(`${this.getDisplayName()} 初始隐匿状态结束`);
                }
            }
            
            // 免死机制
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.hidden = true;
                this.buffs["暗影重生"] = { st: 2, val: 0 };
                log(`${this.getDisplayName()} 触发暗影重生，锁血1点并进入隐匿`);
            }
        };
        
        log(`<div class="assassin">${c.getDisplayName()} 深渊刺客激活，隐匿暴击: +${c.hideCrit}%</div>`);
    }
};