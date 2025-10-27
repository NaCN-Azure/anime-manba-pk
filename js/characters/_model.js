// [角色名] 角色实现
DB["角色名"] = {
    hp: 数值,
    mp: 数值,
    atk: 数值,
    def: 数值,
    spd: 数值,
    cr: 数值,    // 暴击率
    cd: 数值,    // 暴击伤害
    专属属性: 数值, // 如 energy, frost, sacred 等
    skills: [
        { n: "技能名1", c: 冷却回合, mp: 耗蓝, d: 伤害系数, e: "效果描述", s: 技能类型 },
        { n: "技能名2", c: 冷却回合, mp: 耗蓝, d: 伤害系数, e: "效果描述", s: 技能类型 },
        // ... 更多技能
    ],
    passive(c) {
        // 被动属性设置
        c.属性名 = 数值;
        c.免疫.add("状态名");
        
        // 专属加成计算
        if (this.专属属性) c.dmg *= 加成系数;
        
        // 设置技能实现
        c.skillImpl = {
            "技能名1": function(s, target, field) {
                // 技能具体实现
                const damage = Math.floor(this.atk * s.d * this.crit());
                const actualDamage = target.processDamage(damage, this, s.n);
                if (actualDamage > 0) {
                    log(`${this.getDisplayName()} 使用 ${s.n} 对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
                }
                // 附加效果
                target.debuffs["状态名"] = { st: 持续回合, val: 效果数值 };
                return true;
            },
            
            "技能名2": function(s, target, field) {
                // 另一个技能实现
                const heal = Math.floor(this.atk * -s.d * this.crit());
                target.hp = clamp(target.hp + heal, 0, target.maxhp);
                log(`${this.getDisplayName()} 治疗 ${target.getDisplayName()} ${heal} HP`);
                return true;
            }
            // ... 更多技能实现
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 每回合执行的逻辑
            if (roll(this.mpBack)) {
                const mpRestore = Math.floor(this.maxmp * 0.05);
                this.mp = clamp(this.mp + mpRestore, 0, this.maxmp);
            }
            
            // 特殊状态检查
            if (this.hp <= 0 && this.lockHP && this.deathOnce) {
                this.hp = 1;
                this.deathOnce = 0;
                log(`${this.getDisplayName()} 触发锁血保命`);
            }
        };
        
        log(`<div class="样式类">${c.getDisplayName()} 被动技能激活</div>`);
    }
};