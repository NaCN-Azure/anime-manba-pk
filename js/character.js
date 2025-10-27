/* ---------- 角色基类 ---------- */
class Character {
  constructor(name, base) {
    this.name = name;
    this.side = "";
    
    // 初始化所有可能用到的属性
    Object.assign(this, {
      dmg: 1, mpBack: 0, dark: 0, light: 0, pen: 0, regen: 0, hit: 0, hide: 0, dodge: 0,
      steal: 1, parseRate: 0, lockHP: 0, femaleDmg: 1, maleBuff: 1, jelly: 0, alcohol: 0,
      form: 0, shard: 0, deathOnce: 0, curseStackDmg: 0, lightEnemyDmg: 0, critPen: 0,
      nightSpd: 0, nightSteal: 0, darkSteal: 0, defStack: 0, defStackMax: 0, defStacks: 0,
      darkPen: 0, lightHeal: 0, mpBackDark: 0, mpBackLight: 0, waterCD: 0, otherCD: 0,
      mpBackWater: 0, mpBackOther: 0, healLow: 0, healAmount: 0, waterReduce: 0,
      healParse: 0, healHP: 0, healMP: 0, shardFromAlly: 0, shardToHeal: 0,
      memoryResist: 0, darkParse: 0, hideCrit: 0, mpBackHide: 0, mpBackAby: 0,
      lowDefDmg: 0, startHide: 0, startMark: 0, killAtk: 0, killAtkMax: 0,
      dmgToMP: 0, femaleHit: 0, femaleControlImmune: 0, femaleKillAtk: 0, femaleKillMax: 0,
      maleAllyAtk: 0, maleAllyDef: 0, maleAllyHeal: 0, maleSave: 0, femaleSkip: 0,
      femaleCD: 0, femaleAllReduce: 0, jellyDef: 0, jellyAtk: 0, jellyCompensate: 0,
      jellyMP: 0, healMP: 0, seaDmgReduce: 0, seaMarkDmg: 0, sandMax: 0, terrainDef: 0,
      terrainMax: 0, allySandDmg: 0, reviveHP: 0, reviveReset: 0, songMP: 0, domainMP: 0,
      mainSongExtra: 0, subSongExtra: 0, randomSkills: 0, ultimateLimit: 0,
      currentSkills: [], sameFormBonus: 0, elementalEyeActive: false,
      currentTurnSkills: [], originalCD: 200, hasReflect: false, reflectDamage: 0,
      isInvincible: false, holyShieldStrength: 0, sanctuaryActive: false,
      sanctuaryTurns: 0, sanctuaryTarget: null, damageTakenThisTurn: 0,
      damageConverted: 0, reflectMax: 0, allyDefBonus: 0, maxAllyDefBonus: 0,
      focusTarget: null
    });
    
    Object.assign(this, JSON.parse(JSON.stringify(base)));
    this.maxhp = this.hp;
    this.maxmp = this.mp;
    this.buffs = {};
    this.debuffs = {};
    this.cooldowns = {};
    this.immune = new Set();
    
    // 初始化角色专属方法
    this.skillImpl = {};
    this.turnImpl = null;
    
    if (base.passive) base.passive(this);
    
    /* 专属加成 */
    if (this.con) this.dmg *= 1.4;
    if (this.ele) this.dmg *= 1.35;
    if (this.mem) this.dur *= 1.46;
    if (this.aby) { this.dmg *= 1.5; this.hide = 1; }
    if (this.sand) this.dmg *= 1.3;
    if (this.song) this.dmg *= 1.42;
    if (this.holy) this.holyShieldStrength = this.holy;
    if (this.energy) this.dmg *= 1.55;
    if (this.frost) this.dmg *= 1.4;
    if (this.sacred) this.dmg *= 1.48;
    if (this.dual) this.dmg *= 1.4;
    if (this.happy) this.dmg *= 1.38;
    if (this.light) this.dmg *= 1.4;
    if (this.element) this.dmg *= 1.55;
  }
  
  getDisplayName() {
    const teamClass = this.side === "A" ? "team-a" : "team-b";
    return `<span class="${teamClass}">[${this.side}]${this.name}</span>`;
  }
  
  resetCD() { this.cooldowns = {}; }
  canUse(s) { return (this.cooldowns[s.n] || 0) <= 0 && this.mp >= s.mp; }
  crit() { return roll(this.cr) ? (this.cd || 200) / 100 : 1; }
  
  // 处理伤害和护盾
  processDamage(damage, attacker, skillName) {
    if (this.isInvincible) {
      log(`${this.getDisplayName()} 处于无敌状态，免疫了 ${attacker.getDisplayName()} 的 ${skillName} 伤害`);
      return 0;
    }
    
    let remainingDamage = damage;
    
    // 处理所有护盾buff
    Object.keys(this.buffs).forEach(buffKey => {
      if (remainingDamage <= 0) return;
      
      const buff = this.buffs[buffKey];
      if (typeof buff.val === 'number' && buff.val > 0) {
        if (buff.val >= remainingDamage) {
          buff.val -= remainingDamage;
          remainingDamage = 0;
          log(`${this.getDisplayName()} 的 ${buffKey} 吸收了 ${damage} 点伤害，剩余护盾值: ${buff.val}`);
        } else {
          remainingDamage -= buff.val;
          log(`${this.getDisplayName()} 的 ${buffKey} 被击破，吸收了 ${buff.val} 点伤害`);
          buff.val = 0;
        }
      }
    });
    
    // 清除值为0的护盾
    Object.keys(this.buffs).forEach(key => {
      if (this.buffs[key].val === 0) {
        delete this.buffs[key];
      }
    });
    
    if (remainingDamage <= 0) return 0;
    
    // 计算实际伤害
    const reduction = this.def / (this.def + 1000);
    let actualDamage = Math.floor(remainingDamage * (1 - reduction));
    
    this.hp = clamp(this.hp - actualDamage, 0, this.maxhp);
    
    // 检查反伤状态
    if (this.hasReflect && actualDamage > 0) {
      const reflectDmg = Math.floor(this.reflectDamage);
      attacker.hp = clamp(attacker.hp - reflectDmg, 0, attacker.maxhp);
      log(`${this.getDisplayName()} 反弹 ${reflectDmg} 伤害给 ${attacker.getDisplayName()}`);
    }
    
    return actualDamage;
  }
  
  useSkill(s, target, field) {
    if (!this.canUse(s)) return false;
    this.mp -= s.mp;
    this.cooldowns[s.n] = s.c;
    
    // 检查是否有专属技能实现
    if (this.skillImpl && this.skillImpl[s.n]) {
      return this.skillImpl[s.n].call(this, s, target, field);
    }
    
    // 默认伤害技能处理
    if (s.d !== 0) {
      const base = this.atk * (s.d < 0 ? -s.d : s.d);
      if (s.d < 0) { // 治疗
        let v = Math.floor(base * this.dmg * this.crit());
        target.hp = clamp(target.hp + v, 0, target.maxhp);
        log(`${this.getDisplayName()} 治疗 ${target.getDisplayName()} ${v} HP`);
      } else { // 伤害
        let pen = 1 - target.def / (target.def + 1000);
        let damage = Math.floor(base * pen * this.dmg * this.crit());
        const actualDamage = target.processDamage(damage, this, s.n);
        if (actualDamage > 0) {
          log(`${this.getDisplayName()} 使用 ${s.n} 对 ${target.getDisplayName()} 造成 ${actualDamage} 伤害`);
        }
      }
    } else {
      log(`${this.getDisplayName()} 使用 ${s.n}`);
    }
    
    return true;
  }
  
  turn(field) {
    window.currentBattleField = field;
    
    // 执行角色专属回合逻辑
    if (this.turnImpl && typeof this.turnImpl === 'function') {
      this.turnImpl.call(this, field);
    }
    
    /* 被动回血 */
    if (this.regen > 0) {
      const v = Math.floor(this.regen);
      this.hp = clamp(this.hp + v, 0, this.maxhp);
      log(`${this.getDisplayName()} 被动回复 ${v} HP`);
    }
    
    /* 持续伤害 */
    ["流血", "灼烧", "割裂"].forEach(k => {
      if (!this.debuffs[k]) return;
      const v = this.debuffs[k].val;
      this.hp = clamp(this.hp - v, 0, this.maxhp);
      log(`${this.getDisplayName()} ${k} ${v} HP`);
    });
    
    /* buff/debuff 倒计时 */
    Object.keys(this.buffs).forEach(k => {
      this.buffs[k].st--;
      if (this.buffs[k].st <= 0) {
        if (k === "无敌") this.isInvincible = false;
        if (k === "冰棱护盾") this.hasReflect = false;
        delete this.buffs[k];
      }
    });
    
    Object.keys(this.debuffs).forEach(k => {
      this.debuffs[k].st--;
      if (this.debuffs[k].st <= 0) delete this.debuffs[k];
    });
    
    Object.keys(this.cooldowns).forEach(k => {
      this.cooldowns[k]--;
    });
    
    // 重置当前回合技能记录
    this.currentTurnSkills = [];
  }
  
  chooseAction(enemies) {
    const skills = this.skills.filter(s => this.canUse(s));
    if (skills.length === 0) return { act: "pass" };
    
    // 简单AI：优先使用治疗/护盾技能当队友血量低时
    const allies = window.currentBattleField.filter(x => x.side === this.side && x.hp > 0);
    const lowHPAllies = allies.filter(a => a.hp < a.maxhp * 0.5);
    
    if (lowHPAllies.length > 0 && this.skills.some(s => s.d < 0)) {
      const healSkills = skills.filter(s => s.d < 0);
      if (healSkills.length > 0) {
        const s = healSkills[rand(healSkills.length)];
        const t = lowHPAllies[rand(lowHPAllies.length)];
        return { act: "skill", skill: s, target: t };
      }
    }
    
    // 默认攻击
    const s = skills[rand(skills.length)];
    const t = enemies[rand(enemies.length)];
    return { act: "skill", skill: s, target: t };
  }
  
  report() {
    const cdtxt = Object.keys(this.cooldowns).filter(k => this.cooldowns[k] > 0).map(k => `${k}:${this.cooldowns[k]}`).join(" ");
    return `${this.getDisplayName()} HP:${this.hp}/${this.maxhp} MP:${this.mp}/${this.maxmp} ATK:${this.atk} DEF:${this.def} ${cdtxt}`;
  }
}