// 奶棠 角色实现
DB["奶棠"] = {
    hp: 14000,
    mp: 11000,
    atk: 1800,
    def: 1400,
    spd: 170,
    cr: 30,
    cd: 200,
    holy: 400,
    skills: [
        { n: "圣光脉冲", c: 2, mp: 280, d: -1.26, e: "群体治疗", s: 0 },
        { n: "生命绑定", c: 3, mp: 320, d: -2.52, e: "单体治疗", s: 0 },
        { n: "圣光净化", c: 2, mp: 300, d: -1.89, e: "驱散治疗", s: 0 },
        { n: "守护屏障", c: 3, mp: 350, d: 0, e: "群体护盾", s: 0 },
        { n: "圣光壁障", c: 4, mp: 380, d: 0, e: "单体护盾", s: 0 },
        { n: "群体结界", c: 5, mp: 400, d: 0, e: "范围护盾", s: 0 },
        { n: "圣光・万物复苏", c: 7, mp: 1000, d: -6.3, e: "终极治疗", s: 0 }
    ],
    passive(c) {
        c.holyAffinity = 40; // 圣光亲和40%
        c.holyResonance = false;
        c.lifeGuardTriggers = 1; // 生命守护触发次数
        c.lifeGuardUsed = 0;
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        c.resurrectionUsed = false; // 复活被动使用次数
        c.holyStacks = 0; // 圣光层数
        c.maxHolyStacks = 5; // 最大圣光层数
        
        // 设置技能实现
        c.skillImpl = {
            "圣光脉冲": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.holyAffinity / 100));
                const allies = field.filter(x => x.side === this.side);
                let criticalHealCount = 0;
                
                allies.forEach(ally => {
                    const finalHeal = roll(this.cr) ? Math.floor(heal * 1.5) : heal;
                    ally.hp = clamp(ally.hp + finalHeal, 0, ally.maxhp);
                    
                    if (roll(this.cr)) {
                        const shield = Math.floor(heal * 0.5);
                        if (!ally.buffs["小额护盾"]) {
                            ally.buffs["小额护盾"] = { st: 1, val: 0 };
                        }
                        ally.buffs["小额护盾"].val += shield;
                        criticalHealCount++;
                    }
                });
                
                this.holyStacks = Math.min(this.holyStacks + 1, this.maxHolyStacks);
                log(`<div class="healer">${this.getDisplayName()} 使用圣光脉冲，治疗全体友军 ${heal} HP，触发 ${criticalHealCount} 次暴击治疗，圣光层数: ${this.holyStacks}</div>`);
                return true;
            },
            
            "生命绑定": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.holyAffinity / 100));
                target.hp = clamp(target.hp + heal, 0, target.maxhp);
                
                // 生命绑定效果
                this.buffs["生命绑定"] = { st: 3, val: target };
                target.buffs["生命链接"] = { st: 3, val: this };
                
                // 根据圣光层数增加效果
                const extraHeal = Math.floor(heal * this.holyStacks * 0.1);
                if (extraHeal > 0) {
                    target.hp = clamp(target.hp + extraHeal, 0, target.maxhp);
                    log(`<div class="healer">圣光层数额外治疗 ${target.getDisplayName()} ${extraHeal} HP</div>`);
                }
                
                log(`<div class="healer">${this.getDisplayName()} 使用生命绑定，治疗 ${target.getDisplayName()} ${heal} HP，建立生命链接</div>`);
                return true;
            },
            
            "圣光净化": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.holyAffinity / 100));
                const allies = field.filter(x => x.side === this.side);
                let cleansedCount = 0;
                
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    
                    // 驱散负面效果
                    const debuffKeys = Object.keys(ally.debuffs);
                    debuffKeys.forEach(debuff => {
                        if (!debuff.includes("圣光")) {
                            delete ally.debuffs[debuff];
                            cleansedCount++;
                        }
                    });
                });
                
                this.holyStacks = Math.min(this.holyStacks + 1, this.maxHolyStacks);
                log(`<div class="healer">${this.getDisplayName()} 使用圣光净化，治疗全体 ${heal} HP，清除 ${cleansedCount} 个负面状态，圣光层数: ${this.holyStacks}</div>`);
                return true;
            },
            
            "守护屏障": function(s, target, field) {
                const shield = Math.floor(this.atk * 2.5 * (1 + this.holyStacks * 0.1));
                const allies = field.filter(x => x.side === this.side);
                
                allies.forEach(ally => {
                    ally.buffs["守护屏障"] = { st: 3, val: shield };
                    // 圣光层数额外效果
                    if (this.holyStacks >= 3) {
                        ally.buffs["屏障净化"] = { st: 2, val: 0 }; // 免疫控制
                    }
                });
                
                log(`<div class="healer">${this.getDisplayName()} 使用守护屏障，全队获得 ${shield} 点护盾${this.holyStacks >= 3 ? '和控制免疫' : ''}</div>`);
                return true;
            },
            
            "圣光壁障": function(s, target, field) {
                const shield = Math.floor(this.atk * 3.5 * (1 + this.holyStacks * 0.15));
                target.buffs["圣光壁障"] = { st: 4, val: shield };
                target.buffs["壁障庇护"] = { st: 3, val: 40 }; // 受到伤害-40%
                
                // 高圣光层数额外效果
                if (this.holyStacks >= 4) {
                    target.buffs["圣光复苏"] = { st: 3, val: Math.floor(target.maxhp * 0.1) }; // 每回合恢复10%HP
                }
                
                log(`<div class="healer">${this.getDisplayName()} 为 ${target.getDisplayName()} 施加圣光壁障，提供 ${shield} 点护盾和40%减伤</div>`);
                return true;
            },
            
            "群体结界": function(s, target, field) {
                const shield = Math.floor(this.atk * 2 * (1 + this.holyStacks * 0.12));
                const damageReduction = 25 + this.holyStacks * 3; // 基础25%，每层圣光+3%
                const allies = field.filter(x => x.side === this.side);
                
                allies.forEach(ally => {
                    ally.buffs["群体结界"] = { st: 4, val: shield };
                    ally.buffs["结界减伤"] = { st: 4, val: damageReduction };
                });
                
                // 激活圣光共鸣
                if (this.holyStacks >= this.maxHolyStacks) {
                    this.holyResonance = true;
                    allies.forEach(ally => {
                        ally.buffs["圣光共鸣"] = { st: 3, val: 20 }; // 全属性+20%
                    });
                    log(`<div class="healer">圣光层数已满，激活圣光共鸣！</div>`);
                }
                
                log(`<div class="healer">${this.getDisplayName()} 使用群体结界，全队获得 ${shield} 点护盾和${damageReduction}%减伤</div>`);
                return true;
            },
            
            "圣光・万物复苏": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.holyAffinity / 100));
                const shield = Math.floor(this.atk * 3.333 * 1.4 * (1 + this.holyStacks * 0.2));
                const allies = field.filter(x => x.side === this.side);
                
                // 复活死亡的队友
                const deadAllies = field.filter(x => x.side === this.side && x.hp <= 0);
                deadAllies.forEach(ally => {
                    ally.hp = Math.floor(ally.maxhp * 0.5);
                    ally.mp = Math.floor(ally.maxmp * 0.3);
                    ally.buffs["圣光复活"] = { st: 2, val: 0 };
                    log(`<div class="healer">${ally.getDisplayName()} 被圣光复活！</div>`);
                });
                
                // 治疗和护盾
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    ally.buffs["永恒护盾"] = { st: 3, val: shield };
                    // 清除所有负面状态
                    Object.keys(ally.debuffs).forEach(debuff => {
                        if (!debuff.includes("圣光")) {
                            delete ally.debuffs[debuff];
                        }
                    });
                });
                
                this.buffs["圣徒形态"] = { st: 2, val: 50 + this.holyStacks * 5 }; // 治疗量加成
                this.holyStacks = this.maxHolyStacks; // 圣光层数叠满
                
                log(`<div class="healer">${this.getDisplayName()} 使用圣光・万物复苏，治疗全体 ${heal} HP，附加 ${shield} 点护盾，复活 ${deadAllies.length} 名队友</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 圣光共鸣效果
            if (this.holyResonance) {
                const allies = field.filter(x => x.side === this.side);
                const healAmount = Math.floor(this.atk * 0.4 * (1 + this.holyStacks * 0.1));
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                });
                log(`<div class="healer">${this.getDisplayName()} 的圣光共鸣治疗全体 ${healAmount} HP</div>`);
            }
            
            // 生命守护
            const dyingAllies = field.filter(x => x.side === this.side && x.hp <= 0 && x.hp > -1000); // 刚刚死亡的队友
            if (dyingAllies.length > 0 && this.lifeGuardUsed < this.lifeGuardTriggers) {
                const target = dyingAllies[0];
                const savedHP = Math.floor(target.maxhp * (0.3 + this.holyStacks * 0.02)); // 基础30%，每层圣光+2%
                target.hp = clamp(target.hp + savedHP, 0, target.maxhp);
                target.buffs["生命屏障"] = { st: 2, val: Math.floor(this.atk * 4 * 1.4) };
                this.lifeGuardUsed++;
                this.holyStacks = Math.min(this.holyStacks + 2, this.maxHolyStacks);
                log(`<div class="healer">${this.getDisplayName()} 触发生命守护，拯救 ${target.getDisplayName()}，恢复${Math.floor((0.3 + this.holyStacks * 0.02) * 100)}%HP，圣光层数+2</div>`);
            }
            
            // 生命绑定效果
            if (this.buffs["生命绑定"]) {
                const linkedTarget = this.buffs["生命绑定"].val;
                if (linkedTarget && linkedTarget.hp > 0) {
                    // 分担伤害
                    const damageShare = 0.3; // 分担30%伤害
                    if (this.damageTakenThisTurn > 0) {
                        const sharedDamage = Math.floor(this.damageTakenThisTurn * damageShare);
                        linkedTarget.hp = clamp(linkedTarget.hp - sharedDamage, 0, linkedTarget.maxhp);
                        log(`<div class="healer">${this.getDisplayName()} 通过生命链接将 ${sharedDamage} 伤害转移给 ${linkedTarget.getDisplayName()}</div>`);
                    }
                }
            }
            
            // 免死机制
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                this.buffs["圣光守护"] = { st: 2, val: 0 };
                this.holyStacks = Math.min(this.holyStacks + 3, this.maxHolyStacks);
                log(`<div class="healer">${this.getDisplayName()} 触发免死机制，锁血1点，圣光层数+3</div>`);
            }
            
            // 重置伤害记录
            this.damageTakenThisTurn = 0;
        };
        
        log(`<div class="healer">${c.getDisplayName()} 圣光法师激活，圣光亲和: ${c.holyAffinity}%</div>`);
    }
};