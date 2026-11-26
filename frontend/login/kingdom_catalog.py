
building_types = {
    "libraryI": "Library",
    "libraryIIa": "Library",
    "libraryIIb": "Library",
    "castleI": "Castle",
    "castleIIa": "Castle",
    "castleIIb": "Castle",
    "workshopI": "Workshop",
    "workshopIIa": "Workshop",
    "workshopIIb": "Workshop",
    "farmI": "Farm",
    "farmIIa": "Farm",
    "farmIIb": "Farm",
    "towerI": "Tower",
    "towerIIa": "Tower",
    "towerIIb": "Tower",
    "marketI": "Market",
    "marketIIa": "Market",
    "marketIIb": "Market"
}

def validate_building(buildings: list[str]) -> bool:
    if not isinstance(buildings, list):
        raise ValueError("Buildings Must Be A List")

    seen_types = set()

    for building in buildings:
        if not isinstance(building, str):
            raise ValueError("Building Must Be A String")

        if building not in building_types:
            raise ValueError(f"Unknown {building} Building Type")

        if building_types[building] not in seen_types:
            seen_types.add(building_types[building])
        else:
            return False

    return True