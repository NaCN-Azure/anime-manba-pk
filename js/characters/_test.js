// 测试人偶 角色实现
DB["测试人偶"] = {
    hp: 1000000000,
    mp: 0,
    atk: 0,
    def: 0,
    spd: 50,
    cr: 0,
    cd: 0,
    skills: [
        { n: "人偶存在", c: 0, mp: 0, d: 0, e: "纯粹存在", s: 0 }
    ],
    passive(c) {
        // 被动属性设置
        c.lockHP = 1;
        c.deathOnce = 1;
        c.testDollTurns = 0; // 回合计数器
        c.maxTestTurns = 20; // 最大存活回合
            
        // 设置技能实现
        c.skillImpl = {
            "人偶存在": function(s, target, field) {
                log(`<div class="test-doll">${this.getDisplayName()} 静静地存在着，没有任何动作</div>`);
                return true;
            },        
        };
        
        // 设置回合逻辑
        c.turnImpl = function(field) {
            // 每回合增加计数
            this.testDollTurns++;
            
            log(`<div class="test-doll">${this.getDisplayName()} 已存在 ${this.testDollTurns}/${this.maxTestTurns} 回合</div>`);
            
            // 二十回合后自动死亡
            if (this.testDollTurns >= this.maxTestTurns) {
                this.hp = 0;
                log(`<div class="test-doll" style="color: #ff6b6b; font-weight: bold;">${this.getDisplayName()} 达到存在时限，自动销毁</div>`);
                return;
            }
        
        };
        
        log(`<div class="test-doll" style="background: rgba(128, 128, 128, 0.3); border-left: 3px solid #666; padding: 5px; margin: 5px 0;">${c.getDisplayName()} 测试人偶激活，将在 ${c.maxTestTurns} 回合后自动销毁</div>`);
    }
};