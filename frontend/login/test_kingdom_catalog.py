import pytest

from kingdom_catalog import validate_building


#Check every supported identifier without the PNG extension
@pytest.mark.parametrize("building", [
    "libraryI", "libraryIIa", "libraryIIb",
    "castleI", "castleIIa", "castleIIb",
    "workshopI", "workshopIIa", "workshopIIb",
    "farmI", "farmIIa", "farmIIb",
    "towerI", "towerIIa", "towerIIb",
    "marketI", "marketIIa", "marketIIb",
])
def test_accepts_each_building(building):
    assert validate_building([building]) is True


@pytest.mark.parametrize("buildings", [
    [],
    ["libraryI", "castleIIb"],
    ["libraryIIa", "castleIIb", "workshopI", "farmIIb", "towerI", "marketIIa"],
])
def test_accepts_valid_ownership(buildings):
    assert validate_building(buildings) is True


#Duplicate types return False, including two different levels of the same building
@pytest.mark.parametrize("buildings", [
    ["libraryI", "libraryI"],
    ["libraryI", "libraryIIa"],
    ["castleIIa", "castleIIb"],
    ["farmI", "marketI", "farmIIb"],
])
def test_duplicate_building_type_returns_false(buildings):
    assert validate_building(buildings) is False


@pytest.mark.parametrize("building", [
    "libraryI.png", "LibraryI", "libraryi", "libraryIII",
    "scaffolding", "empty_lot", "player", "", " libraryI",
    "src/assets/kingdom/libraryI",
])
def test_rejects_unknown_identifiers(building):
    with pytest.raises(ValueError, match="Unknown"):
        validate_building([building])


@pytest.mark.parametrize("building", [None, 1, True, [], {}])
def test_rejects_non_string_entries(building):
    with pytest.raises(ValueError, match="Building Must Be A String"):
        validate_building(["castleI", building])


@pytest.mark.parametrize("buildings", [None, "libraryI", 1, {}, ("libraryI",), {"libraryI"}])
def test_rejects_non_list_input(buildings):
    with pytest.raises(ValueError, match="Buildings Must Be A List"):
        validate_building(buildings)


def test_separate_calls_do_not_share_seen_types():
    assert validate_building(["libraryI", "libraryIIa"]) is False
    assert validate_building(["libraryIIa"]) is True
    assert validate_building(["libraryI"]) is True


#Checking ownership must not modify the caller's list
@pytest.mark.parametrize("buildings", [
    ["marketI", "libraryIIa"],
    ["libraryI", "libraryIIa"],
])
def test_does_not_change_input(buildings):
    original = buildings.copy()
    validate_building(buildings)
    assert buildings == original


def test_checks_entries_after_a_valid_building():
    with pytest.raises(ValueError, match="Unknown"):
        validate_building(["libraryI", "unknown"])


def test_duplicate_returns_false_before_checking_later_entries():
    #The chosen validator stops at the first duplicate; either outcome blocks saving.
    assert validate_building(["libraryI", "libraryIIa", "unknown"]) is False
