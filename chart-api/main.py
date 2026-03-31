"""
Aethel Mirror — Chart Calculation API
Standalone FastAPI microservice for real astronomical + Human Design chart computation.
Deploy on Railway.app (free tier, Python support).

Requirements (requirements.txt):
  fastapi
  uvicorn
  pyswisseph
  pytz

Install Swiss Ephemeris data:
  Download from https://www.astro.com/ftp/swisseph/ephe/
  Place in /usr/share/ephe or set SWE_EPHE_PATH env var

Run locally:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import swisseph as swe
import os

app = FastAPI(title="Aethel Mirror Chart API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set ephemeris path
ephe_path = os.environ.get("SWE_EPHE_PATH", "/usr/share/ephe")
swe.set_ephe_path(ephe_path)

PLANETS = {
    "sun": swe.SUN,
    "moon": swe.MOON,
    "mercury": swe.MERCURY,
    "venus": swe.VENUS,
    "mars": swe.MARS,
    "jupiter": swe.JUPITER,
    "saturn": swe.SATURN,
    "uranus": swe.URANUS,
    "neptune": swe.NEPTUNE,
    "pluto": swe.PLUTO,
    "north_node": swe.TRUE_NODE,
}

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

HOUSES = [
    "1st", "2nd", "3rd", "4th", "5th", "6th",
    "7th", "8th", "9th", "10th", "11th", "12th",
]

# I-Ching gate mapping (Human Design wheel order)
GATE_MAP = [
    41, 19, 13, 49, 30, 55, 37, 63, 22, 36,
    25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8,
    20, 16, 35, 45, 12, 15, 52, 39, 53, 62,
    56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6,
    46, 18, 48, 57, 32, 50, 28, 44, 1, 43,
    14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61,
    60,
]

# Human Design centre definitions by gate
SACRAL_GATES = {5, 14, 29, 59, 9, 3, 42, 27, 34}
THROAT_GATES = {62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16}
MOTOR_GATES = SACRAL_GATES | {21, 51, 26, 40, 36, 6, 37, 22}  # sacral + heart + solar plexus + root motors to throat
G_CENTRE_GATES = {1, 13, 25, 46, 2, 15, 10, 7}


def degrees_to_sign(deg: float):
    sign_index = int(deg / 30) % 12
    deg_in_sign = deg % 30
    return SIGNS[sign_index], round(deg_in_sign, 2)


def lon_to_gate(lon: float) -> int:
    idx = int((lon % 360) / (360 / 64)) % len(GATE_MAP)
    return GATE_MAP[idx]


def determine_house(lon: float, cusps: list) -> str:
    """Determine which house a planet falls in given Placidus cusps."""
    for i in range(11):
        c1 = cusps[i]
        c2 = cusps[i + 1]
        if c1 < c2:
            if c1 <= lon < c2:
                return HOUSES[i]
        else:  # wraps around 0°
            if lon >= c1 or lon < c2:
                return HOUSES[i]
    return HOUSES[11]


def calc_moon_phase(sun_lon: float, moon_lon: float) -> str:
    angle = (moon_lon - sun_lon) % 360
    if angle < 45:
        return "New Moon"
    elif angle < 90:
        return "Waxing Crescent"
    elif angle < 135:
        return "First Quarter"
    elif angle < 180:
        return "Waxing Gibbous"
    elif angle < 225:
        return "Full Moon"
    elif angle < 270:
        return "Waning Gibbous"
    elif angle < 315:
        return "Last Quarter"
    else:
        return "Waning Crescent"


def determine_hd_type(all_gates: set) -> str:
    has_sacral = bool(all_gates & SACRAL_GATES)
    has_throat = bool(all_gates & THROAT_GATES)
    has_motor_to_throat = bool(all_gates & MOTOR_GATES & THROAT_GATES)

    if has_sacral and has_motor_to_throat:
        return "Manifesting Generator"
    elif has_sacral:
        return "Generator"
    elif not has_sacral and has_motor_to_throat:
        return "Manifestor"
    elif all_gates & G_CENTRE_GATES:
        return "Projector"
    else:
        return "Reflector"


@app.get("/chart")
def get_chart(
    year: int = Query(...),
    month: int = Query(...),
    day: int = Query(...),
    hour: int = Query(12),
    minute: int = Query(0),
    lat: float = Query(51.5),
    lng: float = Query(-0.12),
):
    # Julian day
    decimal_hour = hour + minute / 60.0
    jd = swe.julday(year, month, day, decimal_hour)

    # Calculate natal planets
    planets_out = {}
    for name, planet_id in PLANETS.items():
        result = swe.calc_ut(jd, planet_id)
        lon = result[0][0] if isinstance(result[0], (list, tuple)) else result[0]
        speed = result[0][3] if isinstance(result[0], (list, tuple)) and len(result[0]) > 3 else 0
        sign, deg = degrees_to_sign(lon)
        planets_out[name] = {
            "longitude": round(lon, 4),
            "sign": sign,
            "degrees": deg,
            "retrograde": speed < 0,
        }

    # Houses (Placidus)
    cusps, ascmc = swe.houses(jd, lat, lng, b"P")
    cusps = list(cusps)
    asc_sign, asc_deg = degrees_to_sign(ascmc[0])
    mc_sign, mc_deg = degrees_to_sign(ascmc[1])

    # Assign houses to planets
    for name, data in planets_out.items():
        data["house"] = determine_house(data["longitude"], cusps)

    # Moon phase
    phase = calc_moon_phase(
        planets_out["sun"]["longitude"],
        planets_out["moon"]["longitude"],
    )

    # --- Human Design ---
    sun_lon = planets_out["sun"]["longitude"]

    # Design date: ~88 degrees of solar arc before birth
    design_jd = jd - (88 / 360) * 365.25

    design_planets = {}
    for name, planet_id in PLANETS.items():
        result = swe.calc_ut(design_jd, planet_id)
        lon = result[0][0] if isinstance(result[0], (list, tuple)) else result[0]
        sign, deg = degrees_to_sign(lon)
        design_planets[name] = {
            "longitude": round(lon, 4),
            "sign": sign,
            "degrees": deg,
        }

    # Gate calculation
    natal_gates = [lon_to_gate(planets_out[p]["longitude"]) for p in PLANETS]
    design_gates = [lon_to_gate(design_planets[p]["longitude"]) for p in PLANETS]
    all_gates = set(natal_gates + design_gates)

    # HD type
    hd_type = determine_hd_type(all_gates)

    # Profile (line of natal & design sun)
    gate_arc = 360 / 64
    line_arc = gate_arc / 6
    sun_gate_offset = sun_lon % gate_arc
    natal_line = min(6, max(1, int(sun_gate_offset / line_arc) + 1))
    design_sun_lon = design_planets["sun"]["longitude"]
    design_gate_offset = design_sun_lon % gate_arc
    design_line = min(6, max(1, int(design_gate_offset / line_arc) + 1))
    profile = f"{natal_line}/{design_line}"

    # Life path number (numerology)
    digits = [int(d) for d in f"{year}{month:02d}{day:02d}"]
    life_path = sum(digits)
    master_numbers = {11, 22, 33}
    while life_path > 9 and life_path not in master_numbers:
        life_path = sum(int(d) for d in str(life_path))

    return {
        "natal_chart": {
            "planets": planets_out,
            "ascendant": {"sign": asc_sign, "degrees": asc_deg},
            "midheaven": {"sign": mc_sign, "degrees": mc_deg},
            "moon_phase": phase,
        },
        "human_design": {
            "type": hd_type,
            "profile": profile,
            "active_gates": sorted(list(all_gates)),
            "natal_gates": sorted(list(set(natal_gates))),
            "design_gates": sorted(list(set(design_gates))),
        },
        "numerology": {
            "life_path": life_path,
        },
        "meta": {
            "birth_date": f"{year}-{month:02d}-{day:02d}",
            "birth_time": f"{hour:02d}:{minute:02d}",
            "lat": lat,
            "lng": lng,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
