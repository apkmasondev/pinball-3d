// Keyboard / touch / gamepad input mapped to pinball actions.
export class Input {
  constructor() {
    this.handlers = {};
    this.down = new Set();
    this.map = {
      ShiftLeft: 'left', KeyZ: 'left', ControlLeft: 'left', ArrowLeft: 'left',
      ShiftRight: 'right', Slash: 'right', ControlRight: 'right', ArrowRight: 'right',
      Space: 'plunger', Enter: 'plunger', ArrowDown: 'plunger', NumpadEnter: 'plunger',
      KeyX: 'nudgeLeft', Period: 'nudgeRight', ArrowUp: 'nudgeUp', KeyN: 'nudgeUp',
      KeyC: 'camera', KeyP: 'pause', Escape: 'pause', KeyM: 'mute', Digit1: 'start', KeyS: 'start',
    };
    window.addEventListener('keydown', (e) => {
      const a = this.map[e.code];
      if (!a) return;
      if (e.target && (e.target.tagName === 'INPUT')) return;
      e.preventDefault();
      if (e.repeat) return;
      this._set(a, true, e.code);
    });
    window.addEventListener('keyup', (e) => {
      const a = this.map[e.code]; if (!a) return;
      e.preventDefault();
      this._set(a, false, e.code);
    });
    window.addEventListener('blur', () => { for (const a of [...this.down]) this._set(a, false); });
    this.pads = [];
    this.padState = {};
  }
  on(action, fn) { (this.handlers[action] ||= []).push(fn); }
  _set(a, on, code) {
    const was = this.down.has(a);
    if (on) this.down.add(a); else this.down.delete(a);
    if (was !== on) for (const fn of this.handlers[a] || []) fn(on, code);
    for (const fn of this.handlers['*'] || []) fn(a, on);
  }
  press(a, on) { this._set(a, on); }
  pollGamepads() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp) continue;
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      const st = {
        left: b(4) || b(6) || b(14), right: b(5) || b(7) || b(15),
        plunger: b(0) || b(13), start: b(9), pause: b(8),
        nudgeLeft: gp.axes[0] < -0.8, nudgeRight: gp.axes[0] > 0.8, nudgeUp: gp.axes[1] < -0.8, camera: b(3),
      };
      for (const k in st) {
        if (st[k] !== !!this.padState[k]) { this.padState[k] = st[k]; this._set(k, st[k]); }
      }
    }
  }
}
