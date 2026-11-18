// VELMARA HEAT — pistol combat on foot. Click fires toward the camera's
// centre: a ray finds the nearest police cruiser, traffic car or pedestrian
// within range, a tracer line flashes from the player to the hit, and the
// shot raises the wanted level. Fire rate is capped so the trigger cannot
// be held down like a hose.

import * as THREE from 'three';

export function createCombat(scene) {
  const raycaster = new THREE.Raycaster();
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
  const tracerGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
  const tracer = new THREE.Mesh(tracerGeo, tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0 });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), flashMat);
  flash.visible = false;
  scene.add(flash);
  let cooldown = 0;
  let tracerLife = 0;
  let ammo = 12;
  let reloadTimer = 0;
  const MAGAZINE = 12;
  const RELOAD_SECONDS = 1.2;

  return {
    update(dt, input, player, police, traffic, camera, onEvent) {
      cooldown -= dt;
      // Reloading: the magazine refills after a short pause.
      if (reloadTimer > 0) {
        reloadTimer -= dt;
        if (reloadTimer <= 0) {
          ammo = MAGAZINE;
          onEvent('reloaded');
        }
        return;
      }
      if (tracerLife > 0) {
        tracerLife -= dt;
        tracerMat.opacity = Math.max(0, tracerLife * 6);
        if (tracerLife <= 0) tracer.visible = false;
      }
      flashMat.opacity = Math.max(0, flashMat.opacity - dt * 8);
      if (flashMat.opacity <= 0) flash.visible = false;
      if (!input.wasClicked() || cooldown > 0) return;
      if (!player.state.owned.pistol || player.state.inCar) return;
      if (ammo <= 0) {
        reloadTimer = RELOAD_SECONDS;
        onEvent('reload');
        return;
      }
      ammo -= 1;
      cooldown = 0.28;
      // Shoot through the centre of the screen.
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycaster.far = 48;
      const targets = [];
      for (const cruiser of police.cruisers) targets.push(cruiser.mesh);
      for (const car of traffic.cars) targets.push(car.mesh);
      for (const ped of traffic.peds) targets.push(ped.mesh);
      const hits = raycaster.intersectObjects(targets, true);
      const from = new THREE.Vector3(player.state.x, 1.4, player.state.z);
      let end;
      if (hits.length > 0) {
        end = hits[0].point.clone();
        const hitRoot = hits[0].object;
        let root = hitRoot;
        while (root.parent && root.parent !== scene) root = root.parent;
        // A hit on a cruiser slows it down and makes noise.
        for (const cruiser of police.cruisers) {
          if (cruiser.mesh === root) cruiser.speed *= 0.3;
        }
        police.addWanted(1);
        onEvent('shot-hit');
      } else {
        end = from.clone().add(raycaster.ray.direction.clone().multiplyScalar(48));
        onEvent('shot-miss');
      }
      // Tracer from the player's hand to the hit point.
      const mid = from.clone().add(end).multiplyScalar(0.5);
      const len = from.distanceTo(end);
      tracer.position.copy(mid);
      tracer.scale.set(1, 1, len);
      tracer.lookAt(end);
      tracer.visible = true;
      tracerLife = 0.12;
      flash.position.copy(from);
      flash.visible = true;
      flashMat.opacity = 1;
      onEvent('shot');
    },
  };
}
