// Setsuna 角色实现
DB["Setsuna"] = {
    hp: 10000,
    mp: 8000,
    atk: 2500,
    def: 1200,
    spd: 200,
    cr: 75,
    cd: 200,
    dual: 400,
    skills: [
        { n: "精准瞬狙", c: 2, mp: 320, d: 1.5 * 1.4, e: "远程破防", s: 1 },
        { n: "破甲狙击", c: 3, mp: 380, d: 1.2 * 1.4, e: "单体破防", s: 1 },
        { n: "散射狙击", c: 4, mp: 450, d: 0.8 * 1.4, e: "群体伤害", s: 1 },
        { n: "残月突刺", c: 2, mp: 280, d: 1.4 * 1.4, e: "近战收割", s: 1 },
        { n: "影刃连斩", c: 3, mp: 350, d: 0.7 * 1.4 * 3, e: "多段伤害", s: 1 },
        { n: "瞬步斩", c: 2, mp: 300, d: 1.1 * 1.4, e: "位移伤害", s: 1 },
        { n: "双武・无影瞬杀", c: 8, mp: 1000, d: 3 * 1.4, e: "终极瞬杀", s: 1 }
    ],
    passive(c) {
        c.weaponForm = "狙击"; // 形态：狙击/剑术
        c.hidden = false; // 隐匿状态
        c.hiddenTurns = 0;
        c.dualWeaponMastery = 40; // 双武精通40%
        c.bleedDamage = 1250; // 流血伤害
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        c.sniperCritBonus = 15; // 狙击形态暴击加成
        c.swordAtkBonus = 20; // 剑术形态攻击加成
        
        // 设置技能实现
        c.skillImpl = {
            "精准瞬狙": function(s, target, field) {
                let damageMultiplier = 1;
                if (this.hidden) {
                    damageMultiplier = 1.5;
                    this.hidden = false; // 隐匿状态解除
                }
                
                const damage = Math.floor(this.atk * s.d * this.crit() * damageMultiplier);
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="assassin">${this.getDisplayName()} 使用精准瞬狙对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 爆头真实伤害
                if (roll(this.cr)) {
                    const trueDamage = Math.floor(target.maxhp * 0.15);
                    target.hp = clamp(target.hp - trueDamage, 0, target.maxhp);
                    log(`<div class="assassin">${this.getDisplayName()} 触发爆头，造成 ${trueDamage} 真实伤害</div>`);
                }
                
                // 破甲效果
                target.debuffs["破甲"] = { st: 2, val: 20 }; // 防御-20%
                return true;
            },
            
            "破甲狙击": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="assassin">${this.getDisplayName()} 使用破甲狙击对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 强力破甲
                target.debuffs["强力破甲"] = { st: 3, val: 40 }; // 防御-40%
                target.debuffs["流血"] = { st: 3, val: this.bleedDamage }; // 附加流血
                
                log(`<div class="assassin">${target.getDisplayName()} 防御力大幅降低并开始流血</div>`);
                return true;
            },
            
            "散射狙击": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0).slice(0, 4);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit());
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="assassin">${this.getDisplayName()} 使用散射狙击对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                });
                return true;
            },
            
            "残月突刺": function(s, target, field) {
                // 切换到剑术形态
                this.weaponForm = "剑术";
                this.buffs["剑术形态"] = { st: 3, val: this.swordAtkBonus };
                
                const damage = Math.floor(this.atk * s.d * this.crit() * (1 + this.swordAtkBonus / 100));
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="assassin">${this.getDisplayName()} 使用残月突刺对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 低血量斩杀效果
                if (target.hp < target.maxhp * 0.3) {
                    const executeDamage = Math.floor(target.hp * 0.5);
                    target.hp = clamp(target.hp - executeDamage, 0, target.maxhp);
                    log(`<div class="assassin">${this.getDisplayName()} 触发残月斩杀，额外造成 ${executeDamage} 伤害</div>`);
                }
                
                return true;
            },
            
            "影刃连斩": function(s, target, field) {
                // 三段攻击
                let totalDamage = 0;
                for (let i = 0; i < 3; i++) {
                    const damage = Math.floor(this.atk * (s.d / 3) * this.crit() * (1 + this.swordAtkBonus / 100));
                    const actualDamage = target.processDamage(damage, this, s.n);
                    totalDamage += actualDamage;
                    
                    // 每次攻击有概率附加流血
                    if (roll(30)) {
                        target.debuffs["流血"] = { st: 2, val: Math.floor(this.bleedDamage * 0.7) };
                    }
                }
                
                if (totalDamage > 0) {
                    log(`<div class="assassin">${this.getDisplayName()} 使用影刃连斩对 ${target.getDisplayName()} 造成 ${totalDamage} 伤害（三段）</div>`);
                }
                
                // 连击后进入隐匿
                this.hidden = true;
                this.hiddenTurns = 1;
                log(`<div class="assassin">${this.getDisplayName()} 完成连击后进入隐匿状态</div>`);
                return true;
            },
            
            "瞬步斩": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit() * (1 + this.swordAtkBonus / 100));
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`<div class="assassin">${this.getDisplayName()} 使用瞬步斩对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                }
                
                // 位移效果 - 清除自身debuff
                Object.keys(this.debuffs).forEach(key => {
                    if (key !== "瞬步斩") {
                        delete this.debuffs[key];
                    }
                });
                
                this.buffs["瞬步"] = { st: 1, val: 50 }; // 速度+50%
                log(`<div class="assassin">${this.getDisplayName()} 使用瞬步斩，清除负面状态并提升速度</div>`);
                return true;
            },
            
            "双武・无影瞬杀": function(s, target, field) {
                let totalDamage = 0;
                
                // 狙击阶段
                this.weaponForm = "狙击";
                const sniperDamage = Math.floor(this.atk * 3 * 1.4 * this.crit());
                const actualSniperDamage = target.processDamage(sniperDamage, this, s.n);
                totalDamage += actualSniperDamage;
                target.debuffs["爆头标记"] = { st: 2, val: 40 }; // 防御-40%
                
                // 剑术阶段
                this.weaponForm = "剑术";
                let swordDamage = Math.floor(this.atk * 2.5 * 1.4 * this.crit() * (1 + this.swordAtkBonus / 100));
                if (target.hp < target.maxhp * 0.3) swordDamage *= 2;
                const actualSwordDamage = target.processDamage(swordDamage, this, s.n);
                totalDamage += actualSwordDamage;
                
                // 恢复和隐匿
                this.hidden = true;
                this.hiddenTurns = 2;
                this.hp = clamp(this.hp + this.maxhp * 0.3, 0, this.maxhp);
                this.mp = clamp(this.mp + this.maxmp * 0.3, 0, this.maxmp);
                
                // 刷新非终极技能冷却
                Object.keys(this.cooldowns).forEach(skill => {
                    if (skill !== "双武・无影瞬杀") this.cooldowns[skill] = 0;
                });
                
                log(`<div class="assassin">${this.getDisplayName()} 使用双武・无影瞬杀，造成 ${totalDamage} 伤害，重新进入隐匿状态</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 隐匿状态
            if (this.hidden) {
                this.hiddenTurns--;
                if (this.hiddenTurns <= 0) {
                    this.hidden = false;
                    log(`<div class="assassin">${this.getDisplayName()} 脱离隐匿状态</div>`);
                } else {
                    // 隐匿状态下获得闪避
                    this.buffs["隐匿"] = { st: 1, val: 60 }; // 60%闪避
                }
            }
            
            // 双武切换增益
            if (this.weaponForm === "狙击") {
                this.cr = Math.min(this.cr + this.sniperCritBonus, 90);
                this.buffs["狙击专注"] = { st: 1, val: 25 }; // 远程伤害+25%
            } else {
                this.atk = Math.floor(this.atk * (1 + this.swordAtkBonus / 100));
                this.buffs["剑术精通"] = { st: 1, val: 20 }; // 近战伤害+20%
            }
            
            // 双武精通效果
            this.buffs["双武精通"] = { st: 1, val: this.dualWeaponMastery };
            
            // 免死机制
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.hidden = true;
                this.hiddenTurns = 2;
                log(`<div class="assassin">${this.getDisplayName()} 触发免死机制，锁血1点并进入隐匿</div>`);
            }
        };
        
        log(`<div class="assassin">${c.getDisplayName()} 双武杀手激活，双武精通: ${c.dualWeaponMastery}%</div>`);
    }
};