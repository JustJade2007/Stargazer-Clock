/**
 * Stargazer Ephemeris & Solar Astronomical Engine
 * Computes high-precision local solar positioning, sunrise, sunset, solar noon,
 * civil dawn/dusk, and twilight transitions 100% offline using standard NOAA
 * solar calculations.
 */

(function (window) {
  'use strict';

  const DEG2RAD = Math.PI / 180.0;
  const RAD2DEG = 180.0 / Math.PI;

  /**
   * Normalizes an angle to [0, 360)
   */
  function normalizeDegrees(deg) {
    let d = deg % 360.0;
    if (d < 0) d += 360.0;
    return d;
  }

  /**
   * Calculates Julian Day number from a JavaScript Date
   */
  function getJulianDay(date) {
    const time = date.getTime();
    return (time / 86400000.0) + 2440587.5;
  }

  /**
   * Calculates Julian Century from Julian Day
   */
  function getJulianCentury(jd) {
    return (jd - 2451545.0) / 36525.0;
  }

  /**
   * Geometric Mean Longitude of Sun (degrees)
   */
  function getGeomMeanLongSun(t) {
    let l0 = 280.46646 + t * (36000.76983 + t * 0.0003032);
    return normalizeDegrees(l0);
  }

  /**
   * Geometric Mean Anomaly of Sun (degrees)
   */
  function getGeomMeanAnomalySun(t) {
    return 357.52911 + t * (35999.05029 - 0.0001537 * t);
  }

  /**
   * Eccentricity of Earth's Orbit
   */
  function getEccentricityEarthOrbit(t) {
    return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  }

  /**
   * Sun Equation of the Center (degrees)
   */
  function getSunEqOfCenter(t) {
    const m = getGeomMeanAnomalySun(t) * DEG2RAD;
    return Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
           Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
           Math.sin(3 * m) * 0.000289;
  }

  /**
   * Sun True Longitude (degrees)
   */
  function getSunTrueLong(t) {
    return getGeomMeanLongSun(t) + getSunEqOfCenter(t);
  }

  /**
   * Sun Apparent Longitude (degrees)
   */
  function getSunApparentLong(t) {
    const o = getSunTrueLong(t);
    const omega = 125.04 - 1934.136 * t;
    return o - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);
  }

  /**
   * Mean Obliquity of the Ecliptic (degrees)
   */
  function getMeanObliquityOfEcliptic(t) {
    const seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
    return 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
  }

  /**
   * Obliquity Correction (degrees)
   */
  function getObliquityCorrection(t) {
    const e0 = getMeanObliquityOfEcliptic(t);
    const omega = 125.04 - 1934.136 * t;
    return e0 + 0.00256 * Math.cos(omega * DEG2RAD);
  }

  /**
   * Sun Declination (degrees)
   */
  function getSunDeclination(t) {
    const e = getObliquityCorrection(t) * DEG2RAD;
    const lambda = getSunApparentLong(t) * DEG2RAD;
    const sint = Math.sin(e) * Math.sin(lambda);
    return Math.asin(sint) * RAD2DEG;
  }

  /**
   * Equation of Time (minutes of time)
   */
  function getEquationOfTime(t) {
    const epsilon = getObliquityCorrection(t) * DEG2RAD;
    const l0 = getGeomMeanLongSun(t) * DEG2RAD;
    const e = getEccentricityEarthOrbit(t);
    const m = getGeomMeanAnomalySun(t) * DEG2RAD;

    let y = Math.tan(epsilon / 2.0);
    y *= y;

    const sin2l0 = Math.sin(2.0 * l0);
    const sinm = Math.sin(m);
    const cos2l0 = Math.cos(2.0 * l0);
    const sin4l0 = Math.sin(4.0 * l0);
    const sin2m = Math.sin(2.0 * m);

    const eqTime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
    return eqTime * 4.0 * RAD2DEG; // In minutes
  }

  /**
   * Hour angle calculation for a specific solar zenith (degrees)
   * Official sunrise/sunset zenith = 90.833° (atmospheric refraction + solar disc)
   * Civil twilight zenith = 96.0°
   */
  function getHourAngle(lat, declin, zenith) {
    const latRad = lat * DEG2RAD;
    const declinRad = declin * DEG2RAD;
    const zenithRad = zenith * DEG2RAD;

    const cosHA = (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(declinRad))) - (Math.tan(latRad) * Math.tan(declinRad));
    if (cosHA > 1.0) return -1;  // Polar night (Sun never rises)
    if (cosHA < -1.0) return 1;  // Midnight sun (Sun never sets)

    return Math.acos(cosHA) * RAD2DEG;
  }

  /**
   * Computes Solar Times for given Date, Latitude, and Longitude
   * @param {Date} date
   * @param {number} latitude  (-90 to 90)
   * @param {number} longitude (-180 to 180, East positive, West negative)
   */
  function calculateSolarTimes(date, latitude, longitude) {
    // If coords are invalid or not provided, approximate based on local noon (12:00)
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      const rise = new Date(year, month, day, 6, 0, 0);
      const set = new Date(year, month, day, 18, 0, 0);
      const dawn = new Date(year, month, day, 5, 30, 0);
      const dusk = new Date(year, month, day, 18, 30, 0);
      const noon = new Date(year, month, day, 12, 0, 0);

      const isDay = date >= rise && date < set;
      return {
        sunrise: rise,
        sunset: set,
        civilDawn: dawn,
        civilDusk: dusk,
        solarNoon: noon,
        isDaytime: isDay,
        isTwilight: (date >= dawn && date < rise) || (date >= set && date < dusk),
        twilightFactor: 0,
        isApproximate: true
      };
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Solar noon approximation at UTC
    const noonUtc = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const jdNoon = getJulianDay(noonUtc);
    const tNoon = getJulianCentury(jdNoon);
    const eqTime = getEquationOfTime(tNoon);
    const declin = getSunDeclination(tNoon);

    // Solar Noon time in minutes UTC from 00:00
    const solarNoonUtcMinutes = 720 - (4.0 * longitude) - eqTime;

    // Official Sunrise & Sunset (zenith = 90.833°)
    const haOfficial = getHourAngle(latitude, declin, 90.8333);
    // Civil Twilight (zenith = 96.0°)
    const haCivil = getHourAngle(latitude, declin, 96.0);

    function minutesToDate(minutesUtc) {
      const base = new Date(Date.UTC(year, month, day, 0, 0, 0));
      return new Date(base.getTime() + minutesUtc * 60000);
    }

    let sunriseDate, sunsetDate, dawnDate, duskDate;
    const solarNoonDate = minutesToDate(solarNoonUtcMinutes);

    if (haOfficial === -1) {
      // Polar night: Sun never rises
      sunriseDate = null;
      sunsetDate = null;
    } else if (haOfficial === 1) {
      // Midnight sun: Sun never sets
      sunriseDate = null;
      sunsetDate = null;
    } else {
      sunriseDate = minutesToDate(solarNoonUtcMinutes - (haOfficial * 4.0));
      sunsetDate = minutesToDate(solarNoonUtcMinutes + (haOfficial * 4.0));
    }

    if (haCivil === -1 || haCivil === 1) {
      dawnDate = sunriseDate;
      duskDate = sunsetDate;
    } else {
      dawnDate = minutesToDate(solarNoonUtcMinutes - (haCivil * 4.0));
      duskDate = minutesToDate(solarNoonUtcMinutes + (haCivil * 4.0));
    }

    // Determine current day / twilight state
    const currentMs = date.getTime();
    let isDay = false;
    let isTwilight = false;
    let twilightFactor = 0.0; // 0 (day or deep night) -> 1 (exact sunrise/sunset transition)

    if (haOfficial === 1) {
      isDay = true;
    } else if (haOfficial === -1) {
      isDay = false;
    } else if (sunriseDate && sunsetDate) {
      const riseMs = sunriseDate.getTime();
      const setMs = sunsetDate.getTime();
      const dawnMs = dawnDate ? dawnDate.getTime() : riseMs - 1800000;
      const duskMs = duskDate ? duskDate.getTime() : setMs + 1800000;

      isDay = currentMs >= riseMs && currentMs < setMs;

      // Check civil twilight windows (~30 mins before sunrise, ~30 mins after sunset)
      if (currentMs >= dawnMs && currentMs < riseMs) {
        isTwilight = true;
        const span = riseMs - dawnMs;
        twilightFactor = span > 0 ? (currentMs - dawnMs) / span : 0.5;
      } else if (currentMs >= setMs && currentMs < duskMs) {
        isTwilight = true;
        const span = duskMs - setMs;
        twilightFactor = span > 0 ? 1.0 - ((currentMs - setMs) / span) : 0.5;
      } else if (isDay) {
        // Golden hour: 20 minutes after sunrise or 20 minutes before sunset
        const goldenSpan = 20 * 60000;
        if (currentMs - riseMs < goldenSpan) {
          twilightFactor = 1.0 - ((currentMs - riseMs) / goldenSpan);
        } else if (setMs - currentMs < goldenSpan) {
          twilightFactor = 1.0 - ((setMs - currentMs) / goldenSpan);
        }
      }
    }

    return {
      sunrise: sunriseDate,
      sunset: sunsetDate,
      solarNoon: solarNoonDate,
      civilDawn: dawnDate,
      civilDusk: duskDate,
      isDaytime: isDay,
      isTwilight: isTwilight,
      twilightFactor: Math.max(0, Math.min(1, twilightFactor)),
      isApproximate: false
    };
  }

  /**
   * Helper to format Date to standard local 12h or 24h string
   */
  function formatSolarTime(date, format24 = false) {
    if (!date || isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !format24
    });
  }

  const StargazerEphemeris = {
    calculateSolarTimes,
    formatSolarTime
  };

  window.StargazerEphemeris = StargazerEphemeris;
})(window);
