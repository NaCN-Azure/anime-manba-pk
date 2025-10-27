/* ---------- 工具函数 ---------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = n => Math.floor(Math.random() * n);
const roll = r => Math.random() * 100 < r;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 日志函数
function log(msg) {
  const box = document.getElementById("log");
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
}

// 角色数据库
const DB = {};