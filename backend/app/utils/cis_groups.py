def get_cis_group(cis_id: str) -> str:
    """Map CIS Control v8 ID to its implementation group."""
    try:
        num = int(cis_id.split(".")[0])
    except (ValueError, IndexError):
        return "Unknown"
    if 1 <= num <= 6:
        return "Basic"
    elif 7 <= num <= 16:
        return "Foundational"
    elif 17 <= num <= 18:
        return "Organizational"
    return "Unknown"
