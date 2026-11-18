// VELMARA HEAT — the three shops. Walk up to a glowing kiosk and press E:
// a pistol ($800), a neon outfit ($350) or a turbo mod ($1200). Each item
// applies the moment it is bought — the pistol unlocks combat, the outfit
// re-dyes Rio's shirt neon pink, the turbo raises the car's top speed.

import { SHOPS, PLAYER } from './config.js';

export function createShops(city, player, audio) {
  return {
    nearest() {
      let best = null;
      let bestD = 6;
      for (const shop of city.shops) {
        const d = Math.hypot(shop.x - player.state.x, shop.z - player.state.z);
        if (d < bestD) {
          bestD = d;
          best = shop;
        }
      }
      return best;
    },
    update(input, onEvent) {
      const shop = this.nearest();
      if (!shop) return null;
      const def = SHOPS.find((s) => s.id === shop.id);
      if (!def) return null;
      // Repairs: press F near any shop to patch Rio up for $150.
      if (player.state.health < PLAYER.health && input.wasPressed('KeyF')) {
        input.consume('KeyF');
        if (player.state.cash < 150) {
          audio.denied();
          return 'Repairs cost $150 — not enough cash.';
        }
        player.state.cash -= 150;
        player.heal(PLAYER.health);
        audio.buy();
        onEvent('shop-repaired');
        return 'Patched up — full health, $150.';
      }
      if (player.state.owned[def.id]) return `Own ${def.item} — ${def.blurb}`;
      if (!input.wasPressed('KeyE')) return `Press E — ${def.item} $${def.price} · ${def.blurb}`;
      if (player.state.cash < def.price) {
        audio.denied();
        onEvent('shop-denied', def);
        return `Need $${def.price} for the ${def.item} — you have $${Math.floor(player.state.cash)}.`;
      }
      player.state.cash -= def.price;
      player.state.owned[def.id] = true;
      if (def.id === 'outfit') player.setOutfit();
      audio.buy();
      onEvent('shop-bought', def);
      return `Bought the ${def.item}! ${def.blurb}`;
    },
  };
}
