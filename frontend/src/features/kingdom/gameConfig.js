import Phaser from 'phaser'
import KingdomScene from './scenes/KingdomScene'

export const gameConfig = {
  type: Phaser.AUTO,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#87CEEB',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
    }
  },
  scene: [KingdomScene]
}
