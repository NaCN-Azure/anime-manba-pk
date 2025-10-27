// 板凳 角色实现
DB["板凳"] = {
    hp: 12000,
    mp: 9500,
    atk: 1500,
    def: 1800,
    spd: 280,
    cr: 45,
    cd: 240,
    con: 650,
    skills: [
        { n: "喵影闪", c: 1, mp: 180, d: 0.8 * 1.8, e: "位移", s: 0 },
        { n: "神速绊腿", c: 2, mp: 220, d: 0, e: "减速", s: 1 },
        { n: "掠影分身", c: 3, mp: 280, d: 0, e: "分身", s: 0 },
        { n: "腰包劫", c: 2, mp: 200, d: 0, e: "偷MP", s: 0 },
        { n: "buff扒手", c: 3, mp: 250, d: 0, e: "偷BUFF", s: 0 },
        { n: "技能扒窃", c: 4, mp: 300, d: 0, e: "偷CD", s: 0 },
        { n: "喵盗・全域神速劫", c: 5, mp: 600, d: 0, e: "终极偷", s: 0 }
    ],
    passive(c) {
        c.spd += 40;
        c.steal = 1.8;
        c.mpBack = 60;
        c.dodge = 70;
        c.immune.add("控制");
        c.nightSpd = 40;
        c.nightSteal = 30;
        c.darkSteal = 40;
        c.defStack = 10;
        c.defStackMax = 8;
        c.defStacks = 0;
        c.lockHP = 1;
        
        // 设置技能实现
        c.skillImpl = {
            "喵影闪": function(s, target, field) {
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用喵影闪对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                this.buffs["灵巧"] = { st: 2, val: 30 }; // 闪避+30%
                return true;
            },
            
            "神速绊腿": function(s, target, field) {
                target.debuffs["减速"] = { st: 3, val: 60 }; // 减速60%
                target.debuffs["定身"] = { st: 1, val: 0 }; // 无法行动1回合
                log(`${this.getDisplayName()} 使用神速绊腿，${target.getDisplayName()} 被减速并定身`);
                return true;
            },
            
            "掠影分身": function(s, target, field) {
                this.buffs["分身"] = { st: 3, val: 0 };
                this.buffs["闪避提升"] = { st: 3, val: 40 }; // 闪避+40%
                log(`${this.getDisplayName()} 使用掠影分身，制造幻影并提升闪避`);
                return true;
            },
            
            "腰包劫": function(s, target, field) {
                const stolenMP = Math.floor(target.mp * 0.2 * this.steal);
                target.mp = clamp(target.mp - stolenMP, 0, target.maxmp);
                this.mp = clamp(this.mp + stolenMP, 0, this.maxmp);
                log(`${this.getDisplayName()} 使用腰包劫，从 ${target.getDisplayName()} 偷取 ${stolenMP} MP`);
                return true;
            },
            
            "buff扒手": function(s, target, field) {
                const buffKeys = Object.keys(target.buffs);
                if (buffKeys.length > 0) {
                    const stolenBuff = buffKeys[rand(buffKeys.length)];
                    this.buffs[stolenBuff] = target.buffs[stolenBuff];
                    delete target.buffs[stolenBuff];
                    log(`${this.getDisplayName()} 使用buff扒手，从 ${target.getDisplayName()} 偷取 ${stolenBuff} 效果`);
                } else {
                    log(`${this.getDisplayName()} 使用buff扒手，但 ${target.getDisplayName()} 没有可偷取的buff`);
                }
                return true;
            },
            
            "技能扒窃": function(s, target, field) {
                const skillKeys = Object.keys(target.cooldowns).filter(k => target.cooldowns[k] > 0);
                if (skillKeys.length > 0) {
                    const stolenSkill = skillKeys[rand(skillKeys.length)];
                    target.cooldowns[stolenSkill] += 2; // 增加2回合冷却
                    log(`${this.getDisplayName()} 使用技能扒窃，延长 ${target.getDisplayName()} 的 ${stolenSkill} 冷却2回合`);
                } else {
                    log(`${this.getDisplayName()} 使用技能扒窃，但 ${target.getDisplayName()} 没有在冷却的技能`);
                }
                return true;
            },
            
            "喵盗・全域神速劫": function(s, target, field) {
                const enemies = field.filter(x => x.side !== this.side && x.hp > 0);
                
                enemies.forEach(enemy => {
                    // 偷MP
                    const stolenMP = Math.floor(enemy.mp * 0.15 * this.steal);
                    enemy.mp = clamp(enemy.mp - stolenMP, 0, enemy.maxmp);
                    this.mp = clamp(this.mp + stolenMP, 0, this.maxmp);
                    
                    // 偷buff
                    const buffKeys = Object.keys(enemy.buffs);
                    if (buffKeys.length > 0) {
                        const stolenBuff = buffKeys[rand(buffKeys.length)];
                        this.buffs[stolenBuff] = enemy.buffs[stolenBuff];
                        delete enemy.buffs[stolenBuff];
                    }
                    
                    // 增加技能冷却
                    const skillKeys = Object.keys(enemy.cooldowns).filter(k => enemy.cooldowns[k] > 0);
                    if (skillKeys.length > 0) {
                        const stolenSkill = skillKeys[rand(skillKeys.length)];
                        enemy.cooldowns[stolenSkill] += 1;
                    }
                });
                
                this.buffs["神速"] = { st: 3, val: 50 }; // 速度+50%
                log(`${this.getDisplayName()} 使用喵盗・全域神速劫，偷取所有敌人资源`);
                return true;
            }
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 高闪避几率
            if (roll(this.dodge)) {
                this.buffs["闪避"] = { st: 1, val: 0 };
            }
            
            // MP回复
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.08);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 防御叠加
            if (this.defStacks < this.defStackMax) {
                this.defStacks++;
                this.def += this.defStack;
            }
            
            // 夜晚/黑暗环境加成
            const darkEnemies = field.filter(x => x.side !== this.side && x.dark > 0);
            if (darkEnemies.length > 0) {
                this.spd += this.nightSpd;
                this.steal += this.nightSteal / 100;
            }
            
            // 锁血保命
            if (this.hp <= 0 && this.lockHP) {
                this.hp = 1;
                this.lockHP = 0;
                this.buffs["猫有九命"] = { st: 2, val: 0 };
                log(`${this.getDisplayName()} 触发猫有九命，锁血1点`);
            }
        };
    }
};