// 月 角色实现
DB["月"] = {
    hp: 13500,
    mp: 10200,
    atk: 2000,
    def: 1300,
    spd: 155,
    cr: 32,
    cd: 185,
    sea: 430,
    skills: [
        { n: "莹白唤灵", c: 2, mp: 320, d: 0, e: "治疗水母", s: 0 },
        { n: "淡紫唤灵", c: 3, mp: 350, d: 0, e: "控场水母", s: 0 },
        { n: "墨蓝唤灵", c: 3, mp: 380, d: 0, e: "护盾水母", s: 0 },
        { n: "灵海领域", c: 5, mp: 450, d: 0, e: "领域", s: 0 },
        { n: "灵海涌动", c: 3, mp: 360, d: 0, e: "涌动", s: 0 },
        { n: "深海囚笼", c: 4, mp: 420, d: 0.6 * 1.43, e: "禁锢", s: 1 },
        { n: "秘海万灵守护阵", c: 8, mp: 980, d: 3 * 1.43, e: "终极", s: 0 }
    ],
    passive(c) {
        c.jelly = 1;
        c.mpBack = 40;
        c.resistSea = 40;
        c.jellyDef = 8;
        c.jellyAtk = 10;
        c.jellyCompensate = 50;
        c.jellyMP = 4;
        c.healMP = 8;
        c.seaDmgReduce = 40;
        c.seaMarkDmg = 25;
        
        // 水母计数
        c.jellyfishCount = 0;
        c.maxJellyfish = 5;
        c.jellyfishTypes = {}; // 存储不同类型水母
        
        // 设置技能实现
        c.skillImpl = {
            "莹白唤灵": function(s, target, field) {
                if (this.jellyfishCount < this.maxJellyfish) {
                    this.jellyfishCount++;
                    this.jellyfishTypes["治疗水母"] = (this.jellyfishTypes["治疗水母"] || 0) + 1;
                    
                    const allies = field.filter(x => x.side === this.side);
                    const healAmount = Math.floor(this.atk * 1.2);
                    
                    allies.forEach(ally => {
                        ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                        ally.buffs["莹白治愈"] = { st: 2, val: 15 }; // 受到治疗量+15%
                    });
                    
                    log(`<div class="jellyfish">${this.getDisplayName()} 召唤莹白治疗水母，全体恢复 ${healAmount} HP，当前水母: ${this.jellyfishCount}/${this.maxJellyfish}</div>`);
                } else {
                    log(`${this.getDisplayName()} 水母数量已达上限`);
                }
                return true;
            },
            
            "淡紫唤灵": function(s, target, field) {
                if (this.jellyfishCount < this.maxJellyfish) {
                    this.jellyfishCount++;
                    this.jellyfishTypes["控场水母"] = (this.jellyfishTypes["控场水母"] || 0) + 1;
                    
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    enemies.forEach(enemy => {
                        enemy.debuffs["淡紫迟缓"] = { st: 2, val: 35 }; // 速度-35%
                        enemy.debuffs["灵海标记"] = { st: 3, val: (enemy.debuffs["灵海标记"]?.val || 0) + 1 };
                    });
                    
                    log(`<div class="jellyfish">${this.getDisplayName()} 召唤淡紫控场水母，减速所有敌人，当前水母: ${this.jellyfishCount}/${this.maxJellyfish}</div>`);
                } else {
                    log(`${this.getDisplayName()} 水母数量已达上限`);
                }
                return true;
            },
            
            "墨蓝唤灵": function(s, target, field) {
                if (this.jellyfishCount < this.maxJellyfish) {
                    this.jellyfishCount++;
                    this.jellyfishTypes["护盾水母"] = (this.jellyfishTypes["护盾水母"] || 0) + 1;
                    
                    const shieldAmount = Math.floor(this.atk * 2.5);
                    const allies = field.filter(x => x.side === this.side);
                    
                    allies.forEach(ally => {
                        ally.buffs["墨蓝护盾"] = { st: 3, val: shieldAmount };
                        ally.buffs["深海庇护"] = { st: 2, val: 20 }; // 防御+20%
                    });
                    
                    log(`<div class="jellyfish">${this.getDisplayName()} 召唤墨蓝护盾水母，全队获得 ${shieldAmount} 点护盾，当前水母: ${this.jellyfishCount}/${this.maxJellyfish}</div>`);
                } else {
                    log(`${this.getDisplayName()} 水母数量已达上限`);
                }
                return true;
            },
            
            "灵海领域": function(s, target, field) {
                this.buffs["灵海领域"] = { st: 4, val: 25 }; // 全队属性+25%
                
                // 领域内水母效果增强
                const jellyBonus = 1 + (this.jellyfishCount * 0.1); // 每只水母+10%效果
                
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["领域庇护"] = { st: 4, val: Math.floor(25 * jellyBonus) };
                });
                
                log(`<div class="jellyfish">${this.getDisplayName()} 展开灵海领域，全队属性提升，水母效果增强 ${Math.round((jellyBonus - 1) * 100)}%</div>`);
                return true;
            },
            
            "深海囚笼": function(s, target, field) {
                const markStacks = target.debuffs["灵海标记"]?.val || 0;
                const baseDamage = this.atk * s.d * this.crit();
                const markBonus = 1 + (markStacks * 0.15); // 每层标记+15%伤害
                const damage = Math.floor(baseDamage * markBonus);
                const actualDamage = target.processDamage(damage, this, s.n);
                
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用深海囚笼对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害（灵海标记加成）`);
                }
                
                // 禁锢效果
                target.debuffs["深海禁锢"] = { st: 2, val: 60 }; // 速度-60%，无法行动
                log(`${this.getDisplayName()} 将 ${target.getDisplayName()} 禁锢在深海囚笼中`);
                return true;
            },
            
            "秘海万灵守护阵": function(s, target, field) {
                const totalJellyfish = this.jellyfishCount;
                const ultimateBonus = 1 + (totalJellyfish * 0.2); // 每只水母+20%效果
                
                const allies = field.filter(x => x.side === this.side);
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                // 终极治疗和护盾
                const ultimateHeal = Math.floor(this.atk * 3 * 1.43 * ultimateBonus);
                const ultimateShield = Math.floor(this.atk * 4 * ultimateBonus);
                
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + ultimateHeal, 0, ally.maxhp);
                    ally.buffs["万灵守护"] = { st: 3, val: ultimateShield };
                    ally.buffs["秘海祝福"] = { st: 3, val: 40 }; // 全属性+40%
                });
                
                // 对敌人造成伤害
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * 3 * 1.43 * this.crit() * ultimateBonus);
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 的秘海万灵守护阵对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                });
                
                // 消耗所有水母
                this.jellyfishCount = 0;
                this.jellyfishTypes = {};
                
                log(`<div class="jellyfish">${this.getDisplayName()} 使用秘海万灵守护阵，消耗所有水母，全队获得终极治疗和护盾</div>`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 水母被动效果
            if (this.jellyfishCount > 0) {
                // 治疗水母效果
                const healJellies = this.jellyfishTypes["治疗水母"] || 0;
                if (healJellies > 0) {
                    const healAmount = Math.floor(this.atk * 0.3 * healJellies);
                    const allies = field.filter(x => x.side === this.side);
                    allies.forEach(ally => {
                        ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                    });
                }
                
                // 控场水母效果
                const controlJellies = this.jellyfishTypes["控场水母"] || 0;
                if (controlJellies > 0) {
                    const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                    enemies.forEach(enemy => {
                        if (roll(20 * controlJellies)) {
                            enemy.debuffs["水母干扰"] = { st: 1, val: 25 }; // 命中率-25%
                        }
                    });
                }
                
                // 护盾水母效果
                const shieldJellies = this.jellyfishTypes["护盾水母"] || 0;
                if (shieldJellies > 0) {
                    const shieldRefresh = Math.floor(this.atk * 0.2 * shieldJellies);
                    const allies = field.filter(x => x.side === this.side);
                    allies.forEach(ally => {
                        if (ally.buffs["墨蓝护盾"]) {
                            ally.buffs["墨蓝护盾"].val += shieldRefresh;
                        }
                    });
                }
                
                // 水母MP回复
                if (roll(this.jellyMP * this.jellyfishCount)) {
                    const mpRestore = Math.floor(this.maxmp * 0.05);
                    this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
                }
            }
            
            // 灵海标记伤害
            const markedEnemies = field.filter(x => x.side !== this.side && x.debuffs["灵海标记"]);
            if (markedEnemies.length > 0) {
                this.buffs["标记追伤"] = { st: 1, val: this.seaMarkDmg * markedEnemies.length };
            }
            
            // 深海减伤
            if (this.buffs["灵海领域"]) {
                this.buffs["深海减伤"] = { st: 1, val: this.seaDmgReduce };
            }
            
            // 水母补偿机制
            if (this.jellyfishCount === 0 && roll(this.jellyCompensate)) {
                this.jellyfishCount = 1;
                this.jellyfishTypes["补偿水母"] = 1;
                log(`<div class="jellyfish">${this.getDisplayName()} 触发水母补偿，自动召唤1只水母</div>`);
            }
        };
        
        log(`<div class="jellyfish-master">${c.getDisplayName()} 水母掌控者激活，最大水母数量: ${c.maxJellyfish}</div>`);
    }
};