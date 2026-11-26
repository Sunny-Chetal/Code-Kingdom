// Saved building names (from the database) and the building state KingdomScene understands.
// Level 1 has one version; level 2 has two branches, "a" and "b".
const VERSIONS = {
	I: {level: 1},
	IIa: {level: 2, branch: 'a'},
	IIb: {level: 2, branch: 'b'},
}
const BUILDING_IDS = ['library', 'castle', 'workshop', 'farm', 'tower', 'market']

// Turns one saved name such as "libraryIIa" into {id: 'library', level: 2, branch: 'a'}.
function toSceneBuilding(savedName) {
	const id = BUILDING_IDS.find(buildingId => savedName.startsWith(buildingId))
	const version = id && VERSIONS[savedName.slice(id.length)]
	return version ? {id, ...version} : null // Unknown names are skipped.
}

// Builds the state KingdomScene reads when it starts, from the kingdom loaded at login.
export function toKingdomSceneState(savedKingdom) {
	const savedNames = savedKingdom?.buildings ?? []
	return {buildings: savedNames.map(toSceneBuilding).filter(building => building !== null)}
}
