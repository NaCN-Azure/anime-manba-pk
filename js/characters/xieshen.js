// 小邪神 角色实现
DB["小邪神"] = {
    hp: 12000,
    mp: 10000,
    atk: 1500,
    def: 1800,
    spd: 165,
    cr: 35,
    cd: 190,
    mem: 460,
    skills: [
        { n: "溯洄探知", c: 2, mp: 280, d: 0, e: "解析", s: 0 },
        { n: "记忆碎片炮", c: 3, mp: 350, d: 1 * 1.46, e: "碎片", s: 0 },
        { n: "弱点放大", c: 3, mp: 320, d: 0, e: "放大", s: 0 },
        { n: "未知规避", c: 2, mp: 300, d: 0, e: "预判盾", s: 0 },
        { n: "记忆预警", c: 4, mp: 380, d: 0, e: "预警", s: 0 },
        { n: "真相屏障", c: 5, mp: 420, d: 0, e: "屏障", s: 0 },
        { n: "溯洄・全域真相术", c: 8, mp: 950, d: 0, e: "全域", s: 0 }
    ],
    passive(c) {
        c.parseRate = 81;
        c.shard = 0;
        c.immune.add("记忆");
        c.healParse = 1;
        c.healHP = 600;
        c.healMP = 800;
        c.shardFromAlly = 50;
        c.shardToHeal = 1;
        c.memoryResist = 70;
        c.darkParse = 20;
        
        // 设置技能实现
        c.skillImpl = {
            "溯洄探知": function(s, target, field) {
                // 解析敌人，降低其防御和抗性
                target.debuffs["解析弱点"] = { st: 3, val: 25 }; // 防御-25%
                target.debuffs["记忆暴露"] = { st: 2, val: 20 }; // 抗性-20%
                log(`${this.getDisplayName()} 使用溯洄探知，解析 ${target.getDisplayName()} 的弱点`);
                return true;
            },
            
            "记忆碎片炮": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用记忆碎片炮对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                
                // 附加记忆碎片
                if (roll(60)) {
                    target.debuffs["记忆碎片"] = { st: 3, val: (target.debuffs["记忆碎片"]?.val || 0) + 1 };
                }
                return true;
            },
            
            "弱点放大": function(s, target, field) {
                // 放大敌人已有的debuff效果
                Object.keys(target.debuffs).forEach(debuff => {
                    if (target.debuffs[debuff].val > 0) {
                        target.debuffs[debuff].val = Math.floor(target.debuffs[debuff].val * 1.5);
                    }
                });
                log(`${this.getDisplayName()} 使用弱点放大，增强 ${target.getDisplayName()} 的所有负面状态`);
                return true;
            },
            
            "未知规避": function(s, target, field) {
                const shield = Math.floor(this.atk * 2.5);
                this.buffs["预判护盾"] = { st: 2, val: shield };
                this.buffs["预知闪避"] = { st: 1, val: 40 }; // 闪避率+40%
                log(`${this.getDisplayName()} 使用未知规避，获得 ${shield} 点预判护盾`);
                return true;
            },
            
            "溯洄・全域真相术": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    // 暴露所有敌人的弱点
                    enemy.debuffs["真相暴露"] = { st: 3, val: 30 }; // 受到伤害+30%
                    
                    // 对有记忆碎片的敌人造成额外伤害
                    const memoryStacks = enemy.debuffs["记忆碎片"]?.val || 0;
                    if (memoryStacks > 0) {
                        const extraDamage = Math.floor(this.atk * 0.5 * memoryStacks);
                        enemy.hp = clamp(enemy.hp - extraDamage, 0, enemy.maxhp);
                        log(`${this.getDisplayName()} 引爆 ${enemy.getDisplayName()} 的 ${memoryStacks} 层记忆碎片，造成 ${extraDamage} 额外伤害`);
                    }
                });
                
                // 清除所有记忆碎片
                enemies.forEach(enemy => {
                    delete enemy.debuffs["记忆碎片"];
                });
                
                log(`${this.getDisplayName()} 使用溯洄・全域真相术，揭露所有敌人的弱点`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 记忆解析回复
            if (roll(this.parseRate)) {
                const mpRestore = Math.floor(this.maxmp * 0.08);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 记忆碎片治疗
            const totalShards = field.filter(x => x.side !== this.side)
                .reduce((sum, enemy) => sum + (enemy.debuffs["记忆碎片"]?.val || 0), 0);
            
            if (totalShards > 0 && this.healParse) {
                const healAmount = Math.floor(this.healHP * totalShards);
                this.hp = clamp(this.hp + healAmount, 0, this.maxhp);
                const mpRestore = Math.floor(this.healMP * totalShards);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
                
                if (healAmount > 0 || mpRestore > 0) {
                    log(`${this.getDisplayName()} 从记忆碎片中恢复 ${healAmount} HP 和 ${mpRestore} MP`);
                }
            }
            
            // 队友记忆碎片共享
            if (this.shardFromAlly > 0) {
                const alliesWithShards = field.filter(x => x.side === this.side && x.debuffs["记忆碎片"]);
                if (alliesWithShards.length > 0) {
                    const shardTransfer = Math.floor(this.shardFromAlly / 100 * alliesWithShards.length);
                    this.buffs["共享记忆"] = { st: 1, val: shardTransfer }; // 伤害加成
                }
            }
        };
        
        log(`<div class="memory">${c.getDisplayName()} 记忆掌控者激活，解析率: ${c.parseRate}%</div>`);
    }
};