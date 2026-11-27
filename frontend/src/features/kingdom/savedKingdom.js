//Map saved building names to their scene versions
const BUILDINGS = {
    libraryI: {id: 'library', level: 1},
    libraryIIa: {id: 'library', level: 2, branch: 'a'},
    libraryIIb: {id: 'library', level: 2, branch: 'b'},
    castleI: {id: 'castle', level: 1},
    castleIIa: {id: 'castle', level: 2, branch: 'a'},
    castleIIb: {id: 'castle', level: 2, branch: 'b'},
    workshopI: {id: 'workshop', level: 1},
    workshopIIa: {id: 'workshop', level: 2, branch: 'a'},
    workshopIIb: {id: 'workshop', level: 2, branch: 'b'},
    farmI: {id: 'farm', level: 1},
    farmIIa: {id: 'farm', level: 2, branch: 'a'},
    farmIIb: {id: 'farm', level: 2, branch: 'b'},
    towerI: {id: 'tower', level: 1},
    towerIIa: {id: 'tower', level: 2, branch: 'a'},
    towerIIb: {id: 'tower', level: 2, branch: 'b'},
    marketI: {id: 'market', level: 1},
    marketIIa: {id: 'market', level: 2, branch: 'a'},
    marketIIb: {id: 'market', level: 2, branch: 'b'},
};

function toSceneBuilding(savedName) {
    //Check the saved building name
    if (typeof savedName !== 'string') {
        return null;
    }

    if (!Object.hasOwn(BUILDINGS, savedName)) {
        return null;
    }

    //Get the building's scene version
    const building = BUILDINGS[savedName];
    return {...building};
}

//Convert the saved buildings into scene state
export function toKingdomSceneState(savedKingdom) {
    const buildings = [];
    const savedNames = savedKingdom?.buildings;

    if (!Array.isArray(savedNames)) {
        return {buildings};
    }

    for (const savedName of savedNames) {
        const building = toSceneBuilding(savedName);

        if (building === null) {
            continue;
        }

        buildings.push(building);
    }

    return {buildings};
}
