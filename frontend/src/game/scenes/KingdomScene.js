import Phaser from 'phaser'

export default class KingdomScene extends Phaser.Scene {
    constructor() {
        super({key: 'KingdomScene'})

        this.player = null
        this.map = null
        this.npcs = []
        this.buildings = []
        this.cursor = null
        this.facing = 'down'
        this.nearbyNPC = null
        this.controlsEnabled = true
    }

    // Phaser calls init automatically. Existing create/update methods stay unchanged.
    init(data = {}) {
        this.events.once('create', () => this.setupKingdomFeatures(data.kingdomState))
    }

    setupKingdomFeatures(savedState) {
        this.controlsEnabled = true
        this.nearbyNPC = null
        this.setupKingdomInteractions()
        this.setupReactCommunication()
        this.events.once('shutdown', this.cleanupKingdomFeatures, this)
        this.events.once('destroy', this.cleanupKingdomFeatures, this)

        const state = savedState ?? this.registry.get('kingdomState')
        const result = state ? this.applyKingdomState(state) : { ok: true, errors: [] }
        this.updateKingdomDepths()
        this.events.on('postupdate', this.updateKingdomInteractions, this)
        this.events.on('postupdate', this.updateKingdomDepths, this)
        this.emitKingdomEvent('ready', { state: this.getKingdomState(), ...result })
    }

    setupKingdomInteractions() {
        // createPlayer already registers building and NPC colliders: do not duplicate them.
        this.interactionDistance = 96 // World pixels, measured between character feet.
        this.talkPrompt = this.add.text(0, 0, 'Press E to Talk', {
            fontSize: '14px', color: '#ffffff', backgroundColor: '#202030',
            padding: { x: 6, y: 4 }
        }).setOrigin(0.5, 1).setDepth(100000).setVisible(false)
    }

    updateKingdomInteractions() {
        if (!this.player?.active || !this.talkPrompt) return
        this.nearbyNPC = null
        let closest = this.interactionDistance
        const playerFeet = this.player.getBottomCenter()
        if (this.controlsEnabled) {
            for (const npc of this.npcs) {
                if (!npc.active || npc.getData('interactionType') !== 'dialogue') continue
                const distance = Phaser.Math.Distance.BetweenPoints(playerFeet, npc.getBottomCenter())
                if (distance <= closest) {
                    closest = distance
                    this.nearbyNPC = npc
                }
            }
        }
        this.talkPrompt.setVisible(Boolean(this.nearbyNPC))
        if (this.nearbyNPC) {
            const npc = this.nearbyNPC
            this.talkPrompt.setPosition(npc.getCenter().x, npc.getTopCenter().y - 8)
        }
        // Consume the key even out of range so an old press cannot open dialogue later.
        const pressed = this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)
        if (pressed && this.nearbyNPC) this.openNPCDialogue(this.nearbyNPC)
    }

    openNPCDialogue(npc) {
        this.emitKingdomEvent('dialogue', {
            npcId: npc.getData('id'), interactionType: npc.getData('interactionType')
        })
        // React sends set-controls(false) when its dialogue actually opens,
        // and set-controls(true) when it closes. No UI listener means no movement lock.
    }

    emitKingdomEvent(name, detail) {
        window.dispatchEvent(new CustomEvent(`codekingdom:${name}`, { detail }))
    }

    setupReactCommunication() {
        this.kingdomCommandHandler = (event) => {
            const command = event.detail
            if (!command || typeof command !== 'object') return
            let result
            switch (command.type) {
                case 'set-controls':
                    result = this.setPlayerControlsEnabled(command.enabled)
                    break
                case 'update-building':
                    result = this.updateBuildingAppearance(command.building)
                    break
                case 'apply-state':
                    result = this.applyKingdomState(command.state)
                    break
                case 'get-state':
                    result = { ok: true }
                    break
                default:
                    result = { ok: false, error: 'Unknown kingdom command' }
            }
            this.updateKingdomDepths()
            this.emitKingdomEvent('result', {
                requestId: command.requestId, type: command.type,
                ...result, state: this.getKingdomState()
            })
        }
        window.addEventListener('codekingdom:command', this.kingdomCommandHandler)
    }

    setPlayerControlsEnabled(enabled) {
        if (typeof enabled !== 'boolean') return { ok: false, error: 'enabled must be a boolean' }
        this.controlsEnabled = enabled
        if (!enabled) {
            this.player.setVelocity(0, 0)
            this.player.anims.stop()
            this.nearbyNPC = null
            this.talkPrompt?.setVisible(false)
        }
        return { ok: true }
    }

    updateBuildingAppearance(change) {
        if (!change || typeof change !== 'object') return { ok: false, error: 'Building data required' }
        const building = this.buildings.find(item => item.getData('id') === change.id)
        if (!building) return { ok: false, error: `Unknown building: ${change.id}` }
        const { level, branch } = change
        if (![0, 1, 2].includes(level) || (level === 2 && !['a', 'b'].includes(branch))) {
            return { ok: false, error: 'Use level 0, 1, or level 2 with branch a/b' }
        }
        const texture = level === 0 ? 'empty lot'
            : level === 1 ? `${change.id} I` : `${change.id} II${branch}`
        if (!this.textures.exists(texture)) {
            return { ok: false, error: `Texture not loaded: ${texture}` }
        }
        const width = building.displayWidth
        const height = building.displayHeight
        building.setTexture(texture)
        building.setDisplaySize(width, height)
        building.refreshBody()
        building.body.enable = level > 0
        building.setData('level', level)
        building.setData('branch', level === 2 ? branch : null)
        return { ok: true }
    }

    // Supply state through scene-start data, game.registry, or the React apply-state command.
    // Schema: { player: { x, y }, buildings: [{ id, level, branch? }] }.
    // Invalid entries are reported individually; other valid entries can still apply.
    applyKingdomState(state) {
        const errors = []
        if (!state || typeof state !== 'object' || Array.isArray(state)) {
            return { ok: false, errors: ['Kingdom state must be an object'] }
        }
        if (state.player !== undefined) {
            const position = state.player
            if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
                errors.push('Player position requires finite x and y')
            } else {
                const x = Phaser.Math.Clamp(position.x, 0, this.map.widthInPixels - this.player.displayWidth)
                const y = Phaser.Math.Clamp(position.y, 0, this.map.heightInPixels - this.player.displayHeight)
                this.player.body.reset(x, y)
            }
        }
        if (state.buildings !== undefined) {
            if (!Array.isArray(state.buildings)) errors.push('buildings must be an array')
            else for (const building of state.buildings) {
                const result = this.updateBuildingAppearance(building)
                if (!result.ok) errors.push(result.error)
            }
        }
        return { ok: errors.length === 0, errors }
    }

    getKingdomState() {
        return {
            player: { x: this.player.x, y: this.player.y },
            buildings: this.buildings.map(building => ({
                id: building.getData('id'), level: building.getData('level'),
                branch: building.getData('branch') ?? null
            }))
        }
    }

    updateKingdomDepths() {
        this.groundLayer.setDepth(-2)
        this.decorLayer.setDepth(-1)
        for (const building of this.buildings) {
            building.setDepth(building.getData('level') === 0 ? 0 : building.getBottomCenter().y)
        }
        for (const character of [this.player, ...this.npcs]) {
            if (character?.active) character.setDepth(character.getBottomCenter().y)
        }
    }

    cleanupKingdomFeatures() {
        window.removeEventListener('codekingdom:command', this.kingdomCommandHandler)
        this.kingdomCommandHandler = null
        this.events.off('postupdate', this.updateKingdomInteractions, this)
        this.events.off('postupdate', this.updateKingdomDepths, this)
        this.events.off('shutdown', this.cleanupKingdomFeatures, this)
        this.events.off('destroy', this.cleanupKingdomFeatures, this)
        this.talkPrompt?.destroy()
        this.talkPrompt = null
        this.nearbyNPC = null
    }

    //Load assets
    preload(){
        //Background
        this.load.image('terrain', '/src/assets/kingdom/terrain.png');
        this.load.image('nature', '/src/assets/kingdom/nature.png');
        this.load.tilemapTiledJSON('map', '/src/assets/kingdom/map.json');

        //Buildings + Upgrades
        this.load.image('empty lot', '/src/assets/kingdom/empty_lot.png');
        this.load.image('scaffolding', '/src/assets/kingdom/scaffolding.png');
        this.load.image('library I', '/src/assets/kingdom/libraryI.png');
        this.load.image('library IIa', '/src/assets/kingdom/libraryIIa.png');
        this.load.image('library IIb', '/src/assets/kingdom/libraryIIb.png');
        this.load.image('castle I', '/src/assets/kingdom/castleI.png');
        this.load.image('castle IIa', '/src/assets/kingdom/castleIIa.png');
        this.load.image('castle IIb', '/src/assets/kingdom/castleIIb.png');
        this.load.image('workshop I', '/src/assets/kingdom/workshopI.png');
        this.load.image('workshop IIa', '/src/assets/kingdom/workshopIIa.png');
        this.load.image('workshop IIb', '/src/assets/kingdom/workshopIIb.png');
        this.load.image('farm I', '/src/assets/kingdom/farmI.png');
        this.load.image('farm IIa', '/src/assets/kingdom/farmIIa.png');
        this.load.image('farm IIb', '/src/assets/kingdom/farmIIb.png');
        this.load.image('tower I', '/src/assets/kingdom/towerI.png');
        this.load.image('tower IIa', '/src/assets/kingdom/towerIIa.png');
        this.load.image('tower IIb', '/src/assets/kingdom/towerIIb.png');
        this.load.image('market I', '/src/assets/kingdom/marketI.png');
        this.load.image('market IIa', '/src/assets/kingdom/marketIIa.png');
        this.load.image('market IIb', '/src/assets/kingdom/marketIIb.png');

        //Characters
        this.load.spritesheet('player', '/src/assets/kingdom/player.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('librarian', '/src/assets/kingdom/librarian.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('knight', '/src/assets/kingdom/knight.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('vendor', '/src/assets/kingdom/vendor.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('farmer', '/src/assets/kingdom/farmer.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('wizard', '/src/assets/kingdom/wizard.png', {frameWidth: 17,
            frameHeight: 24});
        this.load.spritesheet('artisan', '/src/assets/kingdom/artisan.png', {frameWidth: 17,
            frameHeight: 24});
    }

    createMap(){
        this.map = this.make.tilemap({key: 'map'})

        const terrain = this.map.addTilesetImage('Terrain', 'terrain')
        const nature = this.map.addTilesetImage('Nature', 'nature')
        const tilesets = [terrain, nature]

        this.groundLayer = this.map.createLayer('Ground', tilesets)
        this.decorLayer = this.map.createLayer('Decor Layer', tilesets)
        this.groundLayer.setCollisionByProperty({ collides: true })
        this.decorLayer.setCollisionByProperty({ collides: true })

        this.physics.world.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        )
    }

    createBuildings() {
        const library = this.physics.add.staticSprite(
            4 * this.map.tileWidth,
            4 * this.map.tileHeight,
            'empty lot'
        )
        library.setOrigin(0, 0)
        library.setDisplaySize(5 * this.map.tileWidth, 4 * this.map.tileHeight)
        library.refreshBody()
        library.setData('id', 'library')
        library.setData('level', 0)
        library.body.enable = false

        const castle = this.physics.add.staticSprite(
            21 * this.map.tileWidth,
            2 * this.map.tileHeight,
            'empty lot'
        )
        castle.setOrigin(0, 0)
        castle.setDisplaySize(8 * this.map.tileWidth, 7 * this.map.tileHeight)
        castle.refreshBody()
        castle.setData('id', 'castle')
        castle.setData('level', 0)
        castle.body.enable = false

        const workshop = this.physics.add.staticSprite(
            41 * this.map.tileWidth,
            4 * this.map.tileHeight,
            'empty lot'
        )
        workshop.setOrigin(0, 0)
        workshop.setDisplaySize(5 * this.map.tileWidth, 4 * this.map.tileHeight)
        workshop.refreshBody()
        workshop.setData('id', 'workshop')
        workshop.setData('level', 0)
        workshop.body.enable = false

        const farm = this.physics.add.staticSprite(
            3 * this.map.tileWidth,
            22 * this.map.tileHeight,
            'empty lot'
        )
        farm.setOrigin(0, 0)
        farm.setDisplaySize(7 * this.map.tileWidth, 5 * this.map.tileHeight)
        farm.refreshBody()
        farm.setData('id', 'farm')
        farm.setData('level', 0)
        farm.body.enable = false

        const tower = this.physics.add.staticSprite(
            42 * this.map.tileWidth,
            21 * this.map.tileHeight,
            'empty lot'
        )
        tower.setOrigin(0, 0)
        tower.setDisplaySize(3 * this.map.tileWidth, 6 * this.map.tileHeight)
        tower.refreshBody()
        tower.setData('id', 'tower')
        tower.setData('level', 0)
        tower.body.enable = false

        const market = this.physics.add.staticSprite(
            23 * this.map.tileWidth,
            25 * this.map.tileHeight,
            'empty lot'
        )
        market.setOrigin(0, 0)
        market.setDisplaySize(4 * this.map.tileWidth, 3 * this.map.tileHeight)
        market.refreshBody()
        market.setData('id', 'market')
        market.setData('level', 0)
        market.body.enable = false

        this.buildings = [library, castle, workshop, farm, tower, market]
    }

    createNPCs() {
        //REMINDER: make all these guys immovable on collision
        this.librarian = this.physics.add.sprite(5 * this.map.tileWidth, 7.5 * this.map.tileHeight, 'librarian')
        this.librarian.setData('id', 'librarian')
        this.librarian.setData('interactionType', 'dialogue')
        this.librarian.setOrigin(0, 0)
        this.librarian.setFrame(1) // Front pose
        this.librarian.setScale(this.map.tileWidth / this.librarian.width)
        this.librarian.refreshBody()
        this.librarian.body.setSize(17, 24)
        this.librarian.body.setOffset(0, 0)
        this.librarian.setImmovable(true)
        this.anims.create({
            key: 'librarian-bounce',
            frames: this.anims.generateFrameNumbers('librarian', {frames: [0, 1]}),
            frameRate: 2,
            repeat: -1
        })

        this.knight = this.physics.add.sprite(21 * this.map.tileWidth, 8.5 * this.map.tileHeight, 'knight')
        this.knight.setData('id', 'knight')
        this.knight.setData('interactionType', 'dialogue')
        this.knight.setOrigin(0, 0)
        this.knight.setFrame(1) // Front pose
        this.knight.setScale(this.map.tileWidth / this.knight.width)
        this.knight.refreshBody()
        this.knight.body.setSize(17, 24)
        this.knight.body.setOffset(0, 0)
        this.knight.setImmovable(true)
        this.anims.create({
            key: 'knight-bounce',
            frames: this.anims.generateFrameNumbers('knight', {frames: [1, 0]}),
            frameRate: 2,
            repeat: -1
        })

        this.vendor = this.physics.add.sprite(24 * this.map.tileWidth, 27.5 * this.map.tileHeight, 'vendor')
        this.vendor.setData('id', 'vendor')
        this.vendor.setData('interactionType', 'dialogue')
        this.vendor.setOrigin(0, 0)
        this.vendor.setFrame(1) // Front pose
        this.vendor.setScale(this.map.tileWidth / this.vendor.width)
        this.vendor.refreshBody()
        this.vendor.body.setSize(17, 24)
        this.vendor.body.setOffset(0, 0)
        this.vendor.setImmovable(true)
        this.anims.create({
            key: 'vendor-bounce',
            frames: this.anims.generateFrameNumbers('vendor', {frames: [0, 1]}),
            frameRate: 2,
            repeat: -1
        })

        this.farmer = this.physics.add.sprite(10 * this.map.tileWidth, 22.5 * this.map.tileHeight, 'farmer')
        this.farmer.setData('id', 'farmer')
        this.farmer.setData('interactionType', 'dialogue')
        this.farmer.setOrigin(0, 0)
        this.farmer.setFrame(1) // Front pose
        this.farmer.setScale(this.map.tileWidth / this.farmer.width)
        this.farmer.refreshBody()
        this.farmer.body.setSize(17, 24)
        this.farmer.body.setOffset(0, 0)
        this.farmer.setImmovable(true)
        this.anims.create({
            key: 'farmer-bounce',
            frames: this.anims.generateFrameNumbers('farmer', {frames: [1, 0]}),
            frameRate: 2,
            repeat: -1
        })

        this.wizard = this.physics.add.sprite(41 * this.map.tileWidth, 23.5 * this.map.tileHeight, 'wizard')
        this.wizard.setData('id', 'wizard')
        this.wizard.setData('interactionType', 'dialogue')
        this.wizard.setOrigin(0, 0)
        this.wizard.setFrame(1) // Front pose
        this.wizard.setScale(this.map.tileWidth / this.wizard.width)
        this.wizard.refreshBody()
        this.wizard.body.setSize(17, 24)
        this.wizard.body.setOffset(0, 0)
        this.wizard.setImmovable(true)
        this.anims.create({
            key: 'wizard-bounce',
            frames: this.anims.generateFrameNumbers('wizard', {frames: [0, 1]}),
            frameRate: 2,
            repeat: -1
        })

        this.artisan = this.physics.add.sprite(44 * this.map.tileWidth, 7.5 * this.map.tileHeight, 'artisan')
        this.artisan.setData('id', 'artisan')
        this.artisan.setData('interactionType', 'dialogue')
        this.artisan.setOrigin(0, 0)
        this.artisan.setFrame(1) // Front pose
        this.artisan.setScale(this.map.tileWidth / this.artisan.width)
        this.artisan.refreshBody()
        this.artisan.body.setSize(17, 24)
        this.artisan.body.setOffset(0, 0)
        this.artisan.setImmovable(true)
        this.anims.create({
            key: 'artisan-bounce',
            frames: this.anims.generateFrameNumbers('artisan', {frames: [1, 0]}),
            frameRate: 2,
            repeat: -1
        })

        this.npcs = [
            this.librarian,
            this.knight,
            this.vendor,
            this.farmer,
            this.wizard,
            this.artisan
        ]
    }

    createPlayer(){
        this.player = this.physics.add.sprite(24.5 * this.map.tileWidth, 10 * this.map.tileHeight, 'player')
        this.player.setOrigin(0, 0)
        this.player.setFrame(1) // Front pose
        this.player.setScale(this.map.tileWidth / this.player.width)
        this.player.refreshBody()
        this.player.body.setSize(9, 5)
        this.player.body.setOffset(4, 19)
        this.player.setCollideWorldBounds(true)
        this.physics.add.collider(this.player, this.groundLayer)
        this.physics.add.collider(this.player, this.decorLayer)
        this.physics.add.collider(this.player, this.buildings)
        this.physics.add.collider(this.player, this.npcs)

        this.anims.create({
            key: 'player-walk-down',
            frames: this.anims.generateFrameNumbers('player', {frames: [0, 1, 2, 1]}),
            frameRate: 8,
            repeat: -1
        })


        this.anims.create({
            key: 'player-walk-left',
            frames: this.anims.generateFrameNumbers('player', {frames: [3, 4, 5, 4]}),
            frameRate: 8,
            repeat: -1
        })

        this.anims.create({
            key: 'player-walk-right',
            frames: this.anims.generateFrameNumbers('player', {frames: [6, 7, 8, 7]}),
            frameRate: 8,
            repeat: -1
        })

        this.anims.create({
            key: 'player-walk-up',
            frames: this.anims.generateFrameNumbers('player', {frames: [9, 10, 11, 10]}),
            frameRate: 8,
            repeat: -1
        })
    }

    setupControls(){
        this.movementKeys = this.input.keyboard.addKeys('W,A,S,D')
        this.interactionKey = this.input.keyboard.addKey('E')
        this.sprintKey = this.input.keyboard.addKey('SHIFT')
        this.cursor = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT')
    }

     setupCamera(){
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
        this.cameras.main.startFollow(this.player)
        this.cameras.main.setZoom(1.5)
     }

    create(){
        //Background
        this.createMap()

        //Buildings + Upgrades
        //TO BE IMPLEMENTED - Save state buildings starting in whatever level they are at plus their collisions
        this.createBuildings()

        //Characters
        //Credit for all characters template - ertylerex.itch.io
        this.createNPCs()
        //Set all NPCs to always bounce
        this.librarian.play('librarian-bounce')
        this.knight.play('knight-bounce')
        this.vendor.play('vendor-bounce')
        this.farmer.play('farmer-bounce')
        this.wizard.play('wizard-bounce')
        this.artisan.play('artisan-bounce')

        this.createPlayer()

        this.setupControls()

        this.setupCamera()
    }

    update(){ //Finish in Sprint 2
        if (!this.player || !this.movementKeys) return

        this.player.setVelocity(0, 0)

        let x = 0
        let y = 0

        if (this.controlsEnabled) {
            if (this.movementKeys.A.isDown) x -= 1
            if (this.movementKeys.D.isDown) x += 1
            if (this.movementKeys.W.isDown) y -= 1
            if (this.movementKeys.S.isDown) y += 1
        }

        if (this.controlsEnabled) {
            if (this.cursor.LEFT.isDown) x -= 1
            if (this.cursor.RIGHT.isDown) x += 1
            if (this.cursor.UP.isDown) y -= 1
            if (this.cursor.DOWN.isDown) y += 1
        }

        if (x !== 0 || y !== 0) {
            const speed = this.sprintKey.isDown ? 320 : 160

            this.player.setVelocity(x, y)
            this.player.body.velocity.normalize().scale(speed)

            if (x < 0) {
                this.facing = 'left'
                this.player.anims.play(`player-walk-left`, true)
            }
            else if (x > 0) {
                this.facing = 'right'
                this.player.anims.play(`player-walk-right`, true)
            }
            else if (y < 0) {
                this.facing = 'up'
                this.player.anims.play(`player-walk-up`, true)
            }
            else {
                this.facing = 'down'
                this.player.anims.play(`player-walk-down`, true)
            }
        }
        else {
            this.player.anims.stop()
            const standingFrames = {
                down: 1,
                left: 4,
                right: 7,
                up: 10
            }
            this.player.setFrame(standingFrames[this.facing])
        }
    }
}




/*
updateBuildings() --Sprint 2
handleInteractions()
applyKingdomState()
shutdown()
const npcId = this.nearbyNPC.getData('id')
const interactionType = this.nearbyNPC.getData('interactionType')
 */
