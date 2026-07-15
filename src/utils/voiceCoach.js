// src/utils/voiceCoach.js
const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export class VoiceCoach {
  constructor(options = {}) {
    this.lang = options.lang || "zh-TW";
    this.rate = options.rate ?? 1.35;   // 語速調快，縮短每句耗時
    this.pitch = options.pitch ?? 1.0;
    this.volume = options.volume ?? 1.0;

    this.cooldownMs = options.cooldownMs ?? 2000; // 同一句話最短重複間隔
    this.gapMs = options.gapMs ?? 120;            // 兩句之間的空檔
    this.staleMs = options.staleMs ?? 1500;       // 排隊超過這個時間就視為過期
    this.maxQueue = options.maxQueue ?? 3;        // 一次最多排幾句

    this.enabled = true;
    this.speaking = false;
    this.ducked = false;
    this.queue = [];
    this.currentMessage = null;
    this.lastSpokenAt = new Map();
    this._watchdog = null;

    this.onDuck = options.onDuck || null;
    this.onUnduck = options.onUnduck || null;

    this.supported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    this.voice = null;
    if (this.supported) {
      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        this.voice =
          voices.find((v) => v.lang === this.lang) ||
          voices.find((v) => v.lang && v.lang.startsWith("zh")) ||
          null;
      };
      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.stop();
  }

  // 主要 API：傳入「當下」的錯誤陣列（可為空陣列）
  // 每次呼叫都會重建待播清單，舊的待播內容一律作廢
  update(errors) {
    if (!this.supported || !this.enabled) return;
    const list = Array.isArray(errors) ? errors : errors ? [errors] : [];
    const t = nowMs();

    this.queue = list
      .filter((m) => m && m !== this.currentMessage)                    // 正在念的不重排
      .filter((m) => t - (this.lastSpokenAt.get(m) || -Infinity) >= this.cooldownMs) // 冷卻中的略過
      .slice(0, this.maxQueue)
      .map((m) => ({ text: m, at: t }));

    this._drain();
  }

  _drain() {
    if (this.speaking) return;   // 念完會自動再呼叫一次
    const t = nowMs();
    let item = null;
    while (this.queue.length > 0) {
      const candidate = this.queue.shift();
      if (t - candidate.at <= this.staleMs) { item = candidate; break; } // 過期的直接丟掉
    }
    if (!item) {                 // 沒東西要念 → 還原節拍器音量
      if (this.ducked) {
        this.ducked = false;
        if (this.onUnduck) this.onUnduck();
      }
      return;
    }
    this._speak(item.text);
  }

  _speak(message) {
    const u = new SpeechSynthesisUtterance(message);
    u.lang = this.lang;
    u.rate = this.rate;
    u.pitch = this.pitch;
    u.volume = this.volume;
    if (this.voice) u.voice = this.voice;

    this.speaking = true;
    this.currentMessage = message;
    this.lastSpokenAt.set(message, nowMs());   // 真的念出來才計冷卻

    if (!this.ducked) {
      this.ducked = true;
      if (this.onDuck) this.onDuck();
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(this._watchdog);
      this.speaking = false;
      this.currentMessage = null;
      setTimeout(() => this._drain(), this.gapMs);
    };
    u.onend = finish;
    u.onerror = finish;

    this._watchdog = setTimeout(finish, 500 + message.length * 200);
    window.speechSynthesis.speak(u);
  }

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
    clearTimeout(this._watchdog);
    this.queue = [];
    this.speaking = false;
    this.currentMessage = null;
    if (this.ducked) {
      this.ducked = false;
      if (this.onUnduck) this.onUnduck();
    }
  }
}