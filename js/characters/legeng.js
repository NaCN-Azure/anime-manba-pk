// 乐梗 角色实现
DB["乐梗"] = {
    hp: 12000,
    mp: 10000,
    atk: 2000,
    def: 1400,
    spd: 175,
    cr: 25,
    cd: 180,
    happy: 380,
    skills: [
        { n: "笑颜脉冲", c: 2, mp: 260, d: 0, e: "群体增益", s: 0 },
        { n: "快乐链接", c: 3, mp: 300, d: 0, e: "单体增益", s: 0 },
        { n: "欢乐鼓舞", c: 2, mp: 280, d: 0, e: "输出强化", s: 0 },
        { n: "烦躁射线", c: 3, mp: 320, d: 0, e: "单体减益", s: 1 },
        { n: "混乱氛围", c: 4, mp: 350, d: 0.4, e: "范围减益", s: 1 },
        { n: "情绪干扰", c: 5, mp: 380, d: 0, e: "群体控制", s: 1 },
        { n: "快乐・全域狂欢", c: 8, mp: 900, d: 3 * 1.38, e: "终极增益", s: 0 }
    ],
    passive(c) {
        c.happyConcentration = 38; // 快乐浓度38%
        c.happyResonance = false;
        c.smileGuardTriggers = 4; // 笑颜守护触发次数
        c.smileGuardUsed = 0;
        c.happyPoints = 0; // 快乐点数
        c.lockHP = 1; // 免死机制
        c.deathOnce = 1;
        c.rebirthUsed = false; // 快乐重生使用次数
        c.maxHappyPoints = 100; // 最大快乐点数
        
        // 设置技能实现
        c.skillImpl = {
            "笑颜脉冲": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                const hpRegen = 8 + Math.floor(this.happyPoints / 20); // 基础8%，每20快乐点数+1%
                const mpRegen = 6 + Math.floor(this.happyPoints / 25); // 基础6%，每25快乐点数+1%
                
                allies.forEach(ally => {
                    ally.buffs["笑颜buff"] = { st: 2, val: hpRegen }; // HP每回合恢复
                    ally.buffs["快乐能量"] = { st: 2, val: mpRegen }; // MP每回合恢复
                });
                
                this.happyPoints = Math.min(this.happyPoints + 15, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用笑颜脉冲，全队获得持续恢复效果，快乐点数+15</div>`);
                return true;
            },
            
            "快乐链接": function(s, target, field) {
                const atkBonus = 20 + Math.floor(this.happyPoints / 10); // 基础20%，每10快乐点数+1%
                const spdBonus = 15 + Math.floor(this.happyPoints / 15); // 基础15%，每15快乐点数+1%
                
                target.buffs["快乐链接"] = { st: 3, val: atkBonus }; // 攻击加成
                target.buffs["快乐加速"] = { st: 3, val: spdBonus }; // 速度加成
                target.buffs["快乐庇护"] = { st: 2, val: 25 }; // 受到伤害-25%
                
                this.happyPoints = Math.min(this.happyPoints + 10, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用快乐链接，${target.getDisplayName()} 获得强力增益，快乐点数+10</div>`);
                return true;
            },
            
            "欢乐鼓舞": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                const outputBonus = 25 + Math.floor(this.happyPoints / 8); // 基础25%，每8快乐点数+1%
                
                allies.forEach(ally => {
                    ally.buffs["欢乐鼓舞"] = { st: 2, val: outputBonus }; // 输出强化
                    ally.buffs["快乐暴击"] = { st: 2, val: 15 }; // 暴击率+15%
                });
                
                this.happyPoints = Math.min(this.happyPoints + 12, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用欢乐鼓舞，全队输出提升${outputBonus}%，快乐点数+12</div>`);
                return true;
            },
            
            "烦躁射线": function(s, target, field) {
                target.debuffs["烦躁"] = { st: 3, val: 30 }; // 攻击-30%
                target.debuffs["失误"] = { st: 2, val: 20 }; // 命中-20%
                
                // 根据快乐点数增加效果
                if (this.happyPoints >= 50) {
                    target.debuffs["混乱"] = { st: 1, val: 0 }; // 混乱1回合
                    log(`<div class="happy">${this.getDisplayName()} 的烦躁射线使 ${target.getDisplayName()} 陷入混乱</div>`);
                }
                
                this.happyPoints = Math.min(this.happyPoints + 8, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用烦躁射线，削弱 ${target.getDisplayName()}，快乐点数+8</div>`);
                return true;
            },
            
            "混乱氛围": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                const damage = Math.floor(this.atk * s.d * this.crit());
                
                enemies.forEach(enemy => {
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`<div class="happy">${this.getDisplayName()} 使用混乱氛围对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害</div>`);
                    }
                    
                    enemy.debuffs["混乱氛围"] = { st: 2, val: 25 }; // 全属性-25%
                    if (roll(30 + Math.floor(this.happyPoints / 5))) { // 基础30%，每5快乐点数+1%概率
                        enemy.debuffs["自残"] = { st: 1, val: 0 }; // 自残1回合
                        log(`<div class="happy">${enemy.getDisplayName()} 陷入自残状态</div>`);
                    }
                });
                
                this.happyPoints = Math.min(this.happyPoints + 20, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用混乱氛围，扰乱所有敌人，快乐点数+20</div>`);
                return true;
            },
            
            "情绪干扰": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    enemy.debuffs["情绪干扰"] = { st: 2, val: 0 }; // 无法使用技能2回合
                    enemy.debuffs["沮丧"] = { st: 3, val: 40 }; // 伤害输出-40%
                    
                    // 高快乐点数时额外效果
                    if (this.happyPoints >= 75) {
                        enemy.debuffs["绝望"] = { st: 1, val: 0 }; // 绝望1回合（无法行动）
                        log(`<div class="happy">${enemy.getDisplayName()} 陷入绝望，无法行动</div>`);
                    }
                });
                
                this.happyPoints = Math.min(this.happyPoints + 25, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 使用情绪干扰，控制所有敌人，快乐点数+25</div>`);
                return true;
            },
            
            "快乐・全域狂欢": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * (1 + this.happyPoints / 100));
                const allies = field.filter(x => x.side === this.side);
                const enemies = field.filter(x => x.side !== this.side);
                
                // 治疗友军
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    ally.buffs["狂欢状态"] = { st: 3, val: 50 + Math.floor(this.happyPoints / 2) }; // 快乐增益效果
                    ally.buffs["快乐无敌"] = { st: 1, val: 0 }; // 免疫伤害1回合
                });
                
                // 削弱敌人
                enemies.forEach(enemy => {
                    enemy.debuffs["集体烦躁"] = { st: 2, val: 20 + Math.floor(this.happyPoints / 5) }; // 输出降低
                    enemy.debuffs["技能冷却"] = { st: 2, val: 0 }; // 技能冷却+1回合
                });
                
                // 自身恢复
                this.mp = clamp(this.mp + this.maxmp * 0.3, 0, this.maxmp);
                this.hp = clamp(this.hp + this.maxhp * 0.2, 0, this.maxhp);
                
                // 刷新非终极技能冷却
                Object.keys(this.cooldowns).forEach(skill => {
                    if (skill !== "快乐・全域狂欢") this.cooldowns[skill] = 0;
                });
                
                // 消耗快乐点数获得额外效果
                const extraEffect = Math.floor(this.happyPoints / 10);
                this.buffs["快乐巅峰"] = { st: 3, val: extraEffect * 5 }; // 每10点快乐点数提供5%全属性加成
                
                log(`<div class="happy">${this.getDisplayName()} 使用快乐・全域狂欢，全队恢复 ${heal} HP，进入狂欢状态，消耗 ${this.happyPoints} 快乐点数获得 ${extraEffect * 5}% 全属性加成</div>`);
                
                this.happyPoints = 0; // 消耗所有快乐点数
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 快乐共鸣
            const happySkillsUsed = this.currentTurnSkills.filter(s => s.e.includes("增益")).length;
            if (happySkillsUsed >= 2) {
                this.happyResonance = true;
                const allies = field.filter(x => x.side === this.side);
                const resonanceBonus = 15 + Math.floor(this.happyPoints / 10);
                allies.forEach(ally => {
                    ally.buffs["快乐光环"] = { st: 1, val: resonanceBonus }; // 输出属性+%，受到伤害-10%
                });
                this.mp = clamp(this.mp + this.maxmp * 0.2, 0, this.maxmp);
                this.happyPoints = Math.min(this.happyPoints + 10, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 触发快乐共鸣，全队获得快乐光环，快乐点数+10</div>`);
            }
            
            // 笑颜守护
            const lowHPAllies = field.filter(x => x.side === this.side && x.hp < x.maxhp * 0.2 && x.hp > 0);
            const controlledAllies = field.filter(x => x.side === this.side && Object.keys(x.debuffs).some(d => d.includes("控制")));
            
            if ((lowHPAllies.length > 0 || controlledAllies.length > 0) && this.smileGuardUsed < this.smileGuardTriggers) {
                const target = lowHPAllies[0] || controlledAllies[0];
                const healAmount = target.maxhp * (0.25 + this.happyPoints / 400); // 基础25%，每100快乐点数+2.5%
                target.hp = clamp(target.hp + healAmount, 0, target.maxhp);
                target.buffs["快乐免伤"] = { st: 2, val: 25 + Math.floor(this.happyPoints / 4) }; // 受到伤害降低
                
                // 清除控制debuff
                Object.keys(target.debuffs).forEach(key => {
                    if (key.includes("控制")) delete target.debuffs[key];
                });
                
                this.smileGuardUsed++;
                this.happyPoints = Math.min(this.happyPoints + 15, this.maxHappyPoints);
                log(`<div class="happy">${this.getDisplayName()} 触发笑颜守护，保护 ${target.getDisplayName()}，快乐点数+15</div>`);
            }
            
            // 快乐点数自然增长
            if (this.happyPoints < this.maxHappyPoints) {
                this.happyPoints = Math.min(this.happyPoints + 3, this.maxHappyPoints);
            }
            
            // 快乐重生
            if (this.hp <= 0 && this.lockHP && this.deathOnce && !this.rebirthUsed) {
                this.hp = Math.floor(this.maxhp * (0.4 + this.happyPoints / 250)); // 基础40%，每100快乐点数+4%
                this.mp = clamp(this.mp + this.maxmp * 0.3, 0, this.maxmp);
                this.deathOnce = 0;
                this.rebirthUsed = true;
                
                const allies = field.filter(x => x.side === this.side);
                const hopeBonus = 10 + Math.floor(this.happyPoints / 10);
                allies.forEach(ally => {
                    ally.buffs["希望光环"] = { st: 2, val: hopeBonus }; // 每回合恢复HP/MP，受到伤害降低
                });
                
                this.buffs["重生免疫"] = { st: 1, val: 0 }; // 免疫控制1回合
                log(`<div class="happy">${this.getDisplayName()} 触发快乐重生，恢复${Math.floor((0.4 + this.happyPoints / 250) * 100)}%HP和30%MP，消耗所有快乐点数</div>`);
                
                this.happyPoints = 0; // 消耗所有快乐点数
            }
        };
        
        log(`<div class="happy">${c.getDisplayName()} 快乐传播者激活，快乐浓度: ${c.happyConcentration}%</div>`);
    }
};