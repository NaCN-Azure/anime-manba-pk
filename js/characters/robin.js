// 知更鸟 角色实现
DB["知更鸟"] = {
    hp: 13000,
    mp: 10500,
    atk: 2000,
    def: 1600,
    spd: 180,
    cr: 30,
    cd: 190,
    song: 420,
    skills: [
        { n: "激昂战歌", c: 2, mp: 290, d: 0, e: "攻歌", s: 0 },
        { n: "舒缓谣曲", c: 2, mp: 320, d: -1.2 * 1.42, e: "治疗", s: 0 },
        { n: "守护圣歌", c: 3, mp: 300, d: 0, e: "护盾", s: 0 },
        { n: "净化小调", c: 2, mp: 270, d: 0, e: "驱散", s: 0 },
        { n: "迅捷咏叹", c: 3, mp: 280, d: 0, e: "速度", s: 0 },
        { n: "反击音波", c: 3, mp: 310, d: 1.5 * 1.42, e: "迟缓", s: 1 },
        { n: "圣歌万物共鸣", c: 7, mp: 950, d: 2 * 1.42, e: "全域", s: 0 }
    ],
    passive(c) {
        c.dmg *= 1.42;
        c.mpBack = 38;
        c.deathOnce = 1;
        c.songMP = 6;
        c.domainMP = 10;
        c.mainSongExtra = 50;
        c.subSongExtra = 50;
        c.currentSong = null; // 当前演唱的歌曲
        c.songStacks = 0; // 歌曲叠加层数
        c.maxSongStacks = 3; // 最大歌曲层数
        
        // 设置技能实现
        c.skillImpl = {
            "激昂战歌": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                const atkBonus = 25 + (this.songStacks * 5); // 基础25%，每层歌曲+5%
                allies.forEach(ally => {
                    ally.buffs["激昂战歌"] = { st: 3, val: atkBonus }; // 攻击加成
                });
                this.currentSong = "激昂战歌";
                this.songStacks = Math.min(this.songStacks + 1, this.maxSongStacks);
                log(`${this.getDisplayName()} 演唱激昂战歌，全队攻击力提升${atkBonus}% (歌曲层数: ${this.songStacks})`);
                return true;
            },
            
            "舒缓谣曲": function(s, target, field) {
                const heal = Math.floor(this.atk * -s.d * this.crit() * (1 + this.songStacks * 0.1));
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.hp = clamp(ally.hp + heal, 0, ally.maxhp);
                    // 附加持续治疗
                    ally.buffs["舒缓治愈"] = { st: 2, val: Math.floor(heal * 0.3) };
                });
                this.currentSong = "舒缓谣曲";
                this.songStacks = Math.min(this.songStacks + 1, this.maxSongStacks);
                log(`${this.getDisplayName()} 演唱舒缓谣曲，治疗全体友军 ${heal} HP (歌曲层数: ${this.songStacks})`);
                return true;
            },
            
            "守护圣歌": function(s, target, field) {
                const shield = Math.floor(this.atk * (2.2 + this.songStacks * 0.3));
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["守护圣歌"] = { st: 3, val: shield };
                });
                this.currentSong = "守护圣歌";
                this.songStacks = Math.min(this.songStacks + 1, this.maxSongStacks);
                log(`${this.getDisplayName()} 演唱守护圣歌，全队获得 ${shield} 点护盾 (歌曲层数: ${this.songStacks})`);
                return true;
            },
            
            "净化小调": function(s, target, field) {
                const allies = field.filter(x => x.side === this.side);
                let cleansedCount = 0;
                allies.forEach(ally => {
                    // 清除debuff
                    const debuffCount = Object.keys(ally.debuffs).length;
                    Object.keys(ally.debuffs).forEach(debuff => {
                        if (!debuff.includes("净化")) { // 避免清除自身效果
                            delete ally.debuffs[debuff];
                            cleansedCount++;
                        }
                    });
                    // 免疫控制
                    ally.buffs["净化庇护"] = { st: 2, val: 0 };
                });
                log(`${this.getDisplayName()} 演唱净化小调，清除 ${cleansedCount} 个负面状态，全队获得控制免疫`);
                return true;
            },
            
            "迅捷咏叹": function(s, target, field) {
                const speedBonus = 30 + (this.songStacks * 8); // 基础30%，每层歌曲+8%
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["迅捷咏叹"] = { st: 3, val: speedBonus }; // 速度加成
                    ally.buffs["行动优先"] = { st: 1, val: 0 }; // 下回合优先行动
                });
                this.currentSong = "迅捷咏叹";
                this.songStacks = Math.min(this.songStacks + 1, this.maxSongStacks);
                log(`${this.getDisplayName()} 演唱迅捷咏叹，全队速度提升${speedBonus}% (歌曲层数: ${this.songStacks})`);
                return true;
            },
            
            "反击音波": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用反击音波对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                target.debuffs["迟缓"] = { st: 2, val: 40 }; // 减速40%
                target.debuffs["音波震荡"] = { st: 2, val: 15 }; // 全属性-15%
                
                // 根据当前歌曲获得额外效果
                if (this.currentSong) {
                    const extraEffect = this.getSongExtraEffect(this.currentSong, target, field);
                    if (extraEffect) log(extraEffect);
                }
                return true;
            },
            
            "圣歌万物共鸣": function(s, target, field) {
                // 强化所有当前生效的歌曲效果
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    Object.keys(ally.buffs).forEach(buffKey => {
                        if (buffKey.includes("战歌") || buffKey.includes("谣曲") || buffKey.includes("圣歌") || buffKey.includes("咏叹")) {
                            ally.buffs[buffKey].val += this.mainSongExtra; // 效果增强50%
                            ally.buffs[buffKey].st += 2; // 持续时间+2回合
                        }
                    });
                });
                
                // 对敌人造成伤害
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                enemies.forEach(enemy => {
                    const damage = Math.floor(this.atk * s.d * this.crit() * (1 + this.songStacks * 0.2));
                    const actualDamage = enemy.processDamage(damage, this, s.n);
                    if (actualDamage > 0) {
                        log(`${this.getDisplayName()} 的圣歌万物共鸣对 ${enemy.getDisplayName()} 造成 ${actualDamage} 伤害`);
                    }
                    enemy.debuffs["音波震荡"] = { st: 3, val: 20 + this.songStacks * 5 }; // 全属性降低
                });
                
                this.buffs["万物共鸣"] = { st: 4, val: 40 + this.songStacks * 10 }; // 全队效果增强
                this.songStacks = this.maxSongStacks; // 叠满歌曲层数
                
                log(`${this.getDisplayName()} 演唱圣歌万物共鸣，强化所有歌曲效果，歌曲层数叠满`);
                return true;
            }
        };
        
        // 辅助方法：获取歌曲额外效果
        c.getSongExtraEffect = function(songName, target, field) {
            switch (songName) {
                case "激昂战歌":
                    const extraDamage = Math.floor(this.atk * 0.8 * this.crit() * (1 + this.songStacks * 0.1));
                    const actualExtraDamage = target.processDamage(extraDamage, this, "激昂战歌额外效果");
                    return `${this.getDisplayName()} 的激昂战歌产生共鸣，额外造成 ${actualExtraDamage} 伤害`;
                
                case "舒缓谣曲":
                    const extraHeal = Math.floor(this.atk * 0.6 * (1 + this.songStacks * 0.1));
                    const allies = field.filter(x => x.side === this.side);
                    allies.forEach(ally => {
                        ally.hp = clamp(ally.hp + extraHeal, 0, ally.maxhp);
                    });
                    return `${this.getDisplayName()} 的舒缓谣曲产生共鸣，额外治疗全体 ${extraHeal} HP`;
                
                case "守护圣歌":
                    const extraShield = Math.floor(this.atk * 0.8 * (1 + this.songStacks * 0.1));
                    const shieldAllies = field.filter(x => x.side === this.side);
                    shieldAllies.forEach(ally => {
                        if (ally.buffs["守护圣歌"]) {
                            ally.buffs["守护圣歌"].val += extraShield;
                        }
                    });
                    return `${this.getDisplayName()} 的守护圣歌产生共鸣，护盾值增加 ${extraShield}`;
                
                case "迅捷咏叹":
                    const speedAllies = field.filter(x => x.side === this.side);
                    speedAllies.forEach(ally => {
                        if (ally.buffs["迅捷咏叹"]) {
                            ally.buffs["迅捷咏叹"].val += 15 + this.songStacks * 3; // 额外加速
                        }
                    });
                    return `${this.getDisplayName()} 的迅捷咏叹产生共鸣，速度进一步提升`;
                
                default:
                    return "";
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 歌曲持续效果
            if (this.currentSong) {
                // 主歌额外MP消耗
                this.mp -= this.songMP;
                
                // 检查MP是否足够维持歌曲
                if (this.mp < this.songMP) {
                    log(`${this.getDisplayName()} 因MP不足停止演唱 ${this.currentSong}`);
                    this.currentSong = null;
                    this.songStacks = 0;
                } else {
                    // 歌曲持续效果
                    switch (this.currentSong) {
                        case "激昂战歌":
                            // 每回合额外攻击加成
                            const attackAllies = field.filter(x => x.side === this.side);
                            attackAllies.forEach(ally => {
                                ally.buffs["战意"] = { st: 1, val: 10 + this.songStacks * 2 }; // 每回合攻击+10%+层数加成
                            });
                            break;
                            
                        case "舒缓谣曲":
                            // 每回合持续治疗
                            const healAllies = field.filter(x => x.side === this.side);
                            const healAmount = Math.floor(this.atk * (0.4 + this.songStacks * 0.1));
                            healAllies.forEach(ally => {
                                ally.hp = clamp(ally.hp + healAmount, 0, ally.maxhp);
                            });
                            log(`${this.getDisplayName()} 的舒缓谣曲持续治疗全体 ${healAmount} HP`);
                            break;
                            
                        case "守护圣歌":
                            // 每回合护盾刷新
                            const shieldAllies = field.filter(x => x.side === this.side);
                            const shieldRefresh = Math.floor(this.atk * (0.3 + this.songStacks * 0.05));
                            shieldAllies.forEach(ally => {
                                if (ally.buffs["守护圣歌"]) {
                                    ally.buffs["守护圣歌"].val += shieldRefresh;
                                }
                            });
                            break;
                    }
                }
            }
            
            // MP回复
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.05);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 免死机制
            if (this.hp <= 0 && this.deathOnce) {
                this.hp = Math.floor(this.maxhp * 0.4);
                this.deathOnce = 0;
                this.buffs["终焉咏叹"] = { st: 2, val: 0 };
                
                // 复活时演唱终焉咏叹
                const allies = field.filter(x => x.side === this.side);
                allies.forEach(ally => {
                    ally.buffs["终焉咏叹"] = { st: 3, val: 30 }; // 全属性+30%
                });
                
                // 重置歌曲层数
                this.songStacks = this.maxSongStacks;
                
                log(`${this.getDisplayName()} 触发终焉咏叹，恢复40%HP并强化全队，歌曲层数重置为满层`);
            }
        };
    }
};