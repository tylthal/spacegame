import { MISSILE, WEAPON } from '../config/constants';

export interface WeaponStatus {
  heat: number;
  isOverheated: boolean;
  missileProgress: number;
}

export class WeaponController {
  private heat = 0;
  private isOverheated = false;
  private nextPrimaryFireAt = 0;
  private overheatUnlockAt = 0;
  private lastMissileFiredAt = -MISSILE.COOLDOWN_MS;
  private missileProgress = 1;
  private recoilOffset = 0;

  update(deltaMs: number, now: number) {
    if (this.isOverheated) {
      if (now >= this.overheatUnlockAt) {
        this.isOverheated = false;
        this.heat = 0;
      }
    } else if (this.heat > 0) {
      const cooled = WEAPON.COOLING_RATE * (deltaMs / 1000);
      this.heat = Math.max(0, this.heat - cooled);
    }

    const sinceMissile = now - this.lastMissileFiredAt;
    this.missileProgress = Math.min(1, sinceMissile / MISSILE.COOLDOWN_MS);

    this.recoilOffset *= 0.85;
  }

  canFirePrimary(now: number) {
    return !this.isOverheated && now >= this.nextPrimaryFireAt;
  }

  recordPrimaryFire(now: number) {
    this.nextPrimaryFireAt = now + WEAPON.FIRE_RATE_MS;
    this.heat = Math.min(WEAPON.MAX_HEAT, this.heat + WEAPON.HEAT_PER_SHOT);
    if (this.heat >= WEAPON.MAX_HEAT) {
      this.isOverheated = true;
      this.overheatUnlockAt = now + WEAPON.OVERHEAT_PENALTY_MS;
    }

    this.recoilOffset += 3 + (this.heat / WEAPON.MAX_HEAT) * 5;
  }

  canFireMissile(now: number) {
    return now - this.lastMissileFiredAt >= MISSILE.COOLDOWN_MS;
  }

  recordMissileFire(now: number) {
    this.lastMissileFiredAt = now;
    this.missileProgress = 0;
    this.recoilOffset += 25;
  }

  getStatus(): WeaponStatus {
    return {
      heat: this.heat,
      isOverheated: this.isOverheated,
      missileProgress: this.missileProgress,
    };
  }

  getHeatPercent() {
    return Math.min(1, this.heat / WEAPON.MAX_HEAT);
  }

  getMissileCharge() {
    return this.missileProgress;
  }

  getRecoilOffset() {
    return this.recoilOffset;
  }

  reset(now: number) {
    this.heat = 0;
    this.isOverheated = false;
    this.nextPrimaryFireAt = now;
    this.overheatUnlockAt = now;
    this.lastMissileFiredAt = now - MISSILE.COOLDOWN_MS;
    this.missileProgress = 1;
    this.recoilOffset = 0;
  }
}
