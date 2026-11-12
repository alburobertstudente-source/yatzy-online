/**
 * Anteprime 3D dei dadi (negozio, armadio, casse, profilo): un dado in 3/4 con
 * il valore richiesto in alto, ombra morbida, sfondo trasparente.
 * Chiave del segnaposto: `${skinId}:${valore}` (vedi diceSwatch in ui/skins.js).
 */
import { registerArt, renderThumb, studioLights, shadowCatcher, has3D } from './core.js';
import { createDie, quatForValue } from './diceModel.js';

/** Immagine (URL) di un dado. */
export function diceImage(skinId, value = 5, size = 96) {
  return renderThumb(
    `dice:${skinId}:${value}`,
    (THREE) => {
      const scene = new THREE.Scene();
      studioLights(scene, { shadows: true, intensity: 1.05 });
      const floor = shadowCatcher(6, 0.32);
      scene.add(floor);
      const die = createDie(skinId, { size: 1, quality: size > 120 ? 256 : 128 });
      die.quaternion.copy(quatForValue(value, -0.12));
      die.position.set(0, 0.5, 0);
      scene.add(die);
      scene.updateMatrixWorld(true);
      die.userData.update(0.016, 1.7);
      const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
      const fxBig = Boolean(die.getObjectByName('fx')?.children.length);
      const d = fxBig ? 5.6 : 4.5;
      cam.position.set(d * 0.52, d * 0.66, d * 0.68);
      cam.lookAt(0, fxBig ? 0.5 : 0.46, 0);
      return {
        scene,
        camera: cam,
        dispose: () => {
          die.userData.dispose();
          floor.geometry.dispose();
          floor.material.dispose();
        },
      };
    },
    size,
  );
}

if (has3D()) {
  registerArt('dice', (key, size) => {
    const i = key.lastIndexOf(':');
    const id = key.slice(0, i);
    const value = Number(key.slice(i + 1)) || 5;
    return diceImage(id, value, Math.max(64, Math.round(size * 1.6)));
  });
}
