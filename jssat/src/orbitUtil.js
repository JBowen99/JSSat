export function parseTLE(tleLine1, tleLine2) {
  return {
    inclination: parseFloat(tleLine2.substring(8, 16)),
    rightAscension: parseFloat(tleLine2.substring(17, 25)),
    eccentricity: parseFloat("0." + tleLine2.substring(26, 33)),
    argumentOfPerigee: parseFloat(tleLine2.substring(34, 42)),
    meanAnomaly: parseFloat(tleLine2.substring(43, 51)),
    meanMotion: parseFloat(tleLine2.substring(52, 63)),
  };
}

function calculatePosition(tle) {
  const mu = 398600.4418; // Earth's gravitational parameter (km^3/s^2)
  const a = Math.pow(
    mu / Math.pow((tle.meanMotion * 2 * Math.PI) / 86400, 2),
    1 / 3
  ); // Semi-major axis (km)
  const e = tle.eccentricity;
  const M = (tle.meanAnomaly * Math.PI) / 180; // Mean anomaly in radians

  // Solve Kepler's equation for Eccentric Anomaly (E)
  let E = M;
  for (let i = 0; i < 10; i++) {
    E = M + e * Math.sin(E);
  }

  const trueAnomaly =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

  // Distance (r) from the center of the Earth to the satellite
  const r = a * (1 - e * Math.cos(E));

  // Position in perifocal coordinates
  const xPerifocal = r * Math.cos(trueAnomaly);
  const yPerifocal = r * Math.sin(trueAnomaly);
  const zPerifocal = 0;

  return { xPerifocal, yPerifocal, zPerifocal };
}

function perifocalToECI(tle, xPerifocal, yPerifocal, zPerifocal) {
  const i = (tle.inclination * Math.PI) / 180; // Inclination
  const RAAN = (tle.rightAscension * Math.PI) / 180; // Right Ascension of Ascending Node
  const w = (tle.argumentOfPerigee * Math.PI) / 180; // Argument of Perigee

  const cosRAAN = Math.cos(RAAN);
  const sinRAAN = Math.sin(RAAN);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  const x =
    (cosRAAN * cosW - sinRAAN * sinW * cosI) * xPerifocal +
    (-cosRAAN * sinW - sinRAAN * cosW * cosI) * yPerifocal;
  const y =
    (sinRAAN * cosW + cosRAAN * sinW * cosI) * xPerifocal +
    (-sinRAAN * sinW + cosRAAN * cosW * cosI) * yPerifocal;
  const z = sinI * sinW * xPerifocal + sinI * cosW * yPerifocal;

  return { x, y, z };
}

export function tleToCartesian(tleLine1, tleLine2) {
  const tle = parseTLE(tleLine1, tleLine2);
  const { xPerifocal, yPerifocal, zPerifocal } = calculatePosition(tle);
  const { x, y, z } = perifocalToECI(tle, xPerifocal, yPerifocal, zPerifocal);
  return { x, y, z };
}

export function calculateOrbitalPoints(tle, numPoints = 100) {
  const mu = 398600.4418; // Earth's gravitational parameter (km^3/s^2)
  const a = Math.pow(
    mu / Math.pow((tle.meanMotion * 2 * Math.PI) / 86400, 2),
    1 / 3
  ); // Semi-major axis (km)
  const e = tle.eccentricity;

  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const M = (i / numPoints) * 2 * Math.PI; // Mean anomaly
    let E = M; // Initial guess for Eccentric Anomaly

    // Solve Kepler's equation for E
    for (let j = 0; j < 10; j++) {
      E = M + e * Math.sin(E);
    }

    const trueAnomaly =
      2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
      );
    const r = a * (1 - e * Math.cos(E)); // Distance to the central body

    // Position in the orbital plane
    const xPerifocal = r * Math.cos(trueAnomaly);
    const yPerifocal = r * Math.sin(trueAnomaly);

    // Convert to 3D position (you may want to include inclination, RAAN, etc.)
    //const x = xPerifocal;
    //const y = yPerifocal * Math.cos(tle.inclination);
    //const z = yPerifocal * Math.sin(tle.inclination);

    // Convert to 3D position with Inclination and RAAN
    const x =
      xPerifocal *
        (Math.cos(tle.rightAscension) * Math.cos(tle.argumentOfPerigee) -
          Math.sin(tle.rightAscension) *
            Math.sin(tle.argumentOfPerigee) *
            Math.cos(tle.inclination)) -
      yPerifocal *
        (Math.sin(tle.rightAscension) * Math.cos(tle.argumentOfPerigee) +
          Math.cos(tle.rightAscension) *
            Math.sin(tle.argumentOfPerigee) *
            Math.cos(tle.inclination));
    const y =
      xPerifocal *
        (Math.sin(tle.rightAscension) * Math.sin(tle.argumentOfPerigee) +
          Math.cos(tle.rightAscension) *
            Math.cos(tle.argumentOfPerigee) *
            Math.cos(tle.inclination)) +
      yPerifocal *
        (Math.cos(tle.rightAscension) * Math.sin(tle.argumentOfPerigee) -
          Math.sin(tle.rightAscension) *
            Math.cos(tle.argumentOfPerigee) *
            Math.cos(tle.inclination));
    const z =
      xPerifocal * Math.sin(tle.argumentOfPerigee) * Math.sin(tle.inclination) +
      yPerifocal * Math.cos(tle.argumentOfPerigee) * Math.sin(tle.inclination);

    points.push([x / 6371, y / 6371, z / 6371]);
  }
  console.log("Line points:" + points);
  return points;
}

export function createLineGeometry(points) {
  const geometry = new BufferGeometry();
  const vertices = new Float32BufferAttribute(points.flat(), 3);
  geometry.setAttribute("position", vertices);

  return geometry;
}

export const testData = {
  "@context": "https://www.w3.org/ns/hydra/context.jsonld",
  "@id": "https://tle.ivanstanojevic.me/api/tle/",
  "@type": "Tle[]",
  totalItems: 15778,
  member: [
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/25544",
      "@type": "Tle",
      satelliteId: 25544,
      name: "ISS (ZARYA)",
      date: "2024-08-15T22:23:33+00:00",
      line1:
        "1 25544U 98067A   24228.93302811  .00023181  00000+0  41033-3 0  9993",
      line2:
        "2 25544  51.6409  19.3451 0005404 204.9983 297.3069 15.50171321467816",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/40075",
      "@type": "Tle",
      satelliteId: 40075,
      name: "AISSAT 2",
      date: "2023-12-28T11:59:02+00:00",
      line1:
        "1 40075U 14037G   23362.49933056  .00003465  00000+0  40707-3 0  9994",
      line2:
        "2 40075  98.3401 268.4723 0004780 335.0232  25.0749 14.85601820512563",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/36797",
      "@type": "Tle",
      satelliteId: 36797,
      name: "AISSAT 1",
      date: "2024-08-16T04:36:29+00:00",
      line1:
        "1 36797U 10035C   24229.19201139  .00006497  00000+0  65098-3 0  9992",
      line2:
        "2 36797  98.1793  92.9569 0011580 107.1590 253.0897 14.91686491764245",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/43694",
      "@type": "Tle",
      satelliteId: 43694,
      name: "PROXIMA I",
      date: "2024-05-18T00:08:26+00:00",
      line1:
        "1 43694U 18088E   24139.00585883  .10206033 -14958-5  54833-3 0  9991",
      line2:
        "2 43694  84.9863 193.3607 0012302 259.8395 100.1524 16.41319836308011",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/47966",
      "@type": "Tle",
      satelliteId: 47966,
      name: "CENTAURI-3 (TYVAK-0210)",
      date: "2024-06-20T10:55:17+00:00",
      line1:
        "1 47966U 21023B   24172.45505936  .04045857  10158-4  18362-2 0  9997",
      line2:
        "2 47966  44.9956 207.2793 0004403  32.9642 327.1551 16.21097541180119",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/42826",
      "@type": "Tle",
      satelliteId: 42826,
      name: "NORSAT 1",
      date: "2023-12-28T12:04:24+00:00",
      line1:
        "1 42826U 17042B   23362.50305728  .00005191  00000+0  45998-3 0  9995",
      line2:
        "2 42826  97.3809 189.6376 0012000 291.5946  68.3998 14.96586479351561",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/28654",
      "@type": "Tle",
      satelliteId: 28654,
      name: "NOAA 18",
      date: "2024-08-16T04:10:31+00:00",
      line1:
        "1 28654U 05018A   24229.17397624  .00000705  00000+0  39944-3 0  9990",
      line2:
        "2 28654  98.8720 305.6363 0013271 251.4731 108.4999 14.13286861991733",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/42828",
      "@type": "Tle",
      satelliteId: 42828,
      name: "NORSAT 2",
      date: "2024-08-15T10:04:36+00:00",
      line1:
        "1 42828U 17042D   24228.41987253  .00014362  00000+0  10794-2 0  9993",
      line2:
        "2 42828  97.3802  51.7277 0013688 207.4438 152.6066 15.02602913386314",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/43786",
      "@type": "Tle",
      satelliteId: 43786,
      name: "ITASAT",
      date: "2024-08-16T02:35:31+00:00",
      line1:
        "1 43786U 18099AE  24229.10800406  .00013900  00000+0  96948-3 0  9994",
      line2:
        "2 43786  97.5064 284.7040 0017809 145.9889 214.2484 15.05372259311587",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/42759",
      "@type": "Tle",
      satelliteId: 42759,
      name: "ZHUHAI-1 02 (CAS-4B)",
      date: "2024-08-13T14:02:20+00:00",
      line1:
        "1 42759U 17034B   24226.58496067  .00038248  00000+0  12589-2 0  9994",
      line2:
        "2 42759  43.0158 261.6098 0011861   7.2117 352.8905 15.30794073396196",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/42792",
      "@type": "Tle",
      satelliteId: 42792,
      name: "ROBUSTA 1B",
      date: "2023-10-16T17:36:48+00:00",
      line1:
        "1 42792U 17036AD  23289.73389548  .09781629  23598-5  10320-2 0  9994",
      line2:
        "2 42792  97.0969 333.1645 0009033 260.0160 100.0120 16.37602079352297",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/42017",
      "@type": "Tle",
      satelliteId: 42017,
      name: "NAYIF-1 (EO-88)",
      date: "2023-07-17T15:27:12+00:00",
      line1:
        "1 42017U 17008BX  23198.64389602  .03845235  23435-5  12955-2 0  9997",
      line2:
        "2 42017  97.1939 272.0619 0014074 261.3029  98.6670 16.25423645358325",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/33591",
      "@type": "Tle",
      satelliteId: 33591,
      name: "NOAA 19",
      date: "2024-08-16T03:12:56+00:00",
      line1:
        "1 33591U 09005A   24229.13399131  .00000667  00000+0  38092-3 0  9997",
      line2:
        "2 33591  99.0429 285.5558 0014751 121.7489 238.5122 14.13080279800099",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/33499",
      "@type": "Tle",
      satelliteId: 33499,
      name: "KKS-1 (KISEKI)",
      date: "2024-08-15T21:21:40+00:00",
      line1:
        "1 33499U 09002H   24228.89005538  .00004690  00000+0  63913-3 0  9998",
      line2:
        "2 33499  98.1320 131.2008 0007097 304.9962  55.0582 14.79168981836943",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/25338",
      "@type": "Tle",
      satelliteId: 25338,
      name: "NOAA 15",
      date: "2024-08-16T03:10:12+00:00",
      line1:
        "1 25338U 98030A   24229.13208814  .00000813  00000+0  35394-3 0  9995",
      line2:
        "2 25338  98.5667 255.0022 0011054 144.5956 215.5960 14.26665672365989",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/43809",
      "@type": "Tle",
      satelliteId: 43809,
      name: "CENTAURI-1",
      date: "2024-08-16T03:11:25+00:00",
      line1:
        "1 43809U 18099BD  24229.13293855  .00012166  00000+0  86355-3 0  9991",
      line2:
        "2 43809  97.5244 284.9925 0019731 115.8731 244.4532 15.04717077311292",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/43696",
      "@type": "Tle",
      satelliteId: 43696,
      name: "PROXIMA II",
      date: "2024-05-20T08:55:28+00:00",
      line1:
        "1 43696U 18088G   24141.37186076  .08976418 -14898-5  61061-3 0  9999",
      line2:
        "2 43696  84.9868 191.8163 0011681 257.2382 102.7618 16.40402710308379",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/48272",
      "@type": "Tle",
      satelliteId: 48272,
      name: "NORSAT 3",
      date: "2023-12-28T10:31:07+00:00",
      line1:
        "1 48272U 21034E   23362.43828188  .00004841  00000+0  48553-3 0  9995",
      line2:
        "2 48272  97.6838  64.9893 0002115 110.5617 249.5829 14.91778587144752",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/49044",
      "@type": "Tle",
      satelliteId: 49044,
      name: "ISS (NAUKA)",
      date: "2024-08-15T16:03:58+00:00",
      line1:
        "1 49044U 21066A   24228.66942736  .00024421  00000+0  43194-3 0  9993",
      line2:
        "2 49044  51.6407  20.6516 0005444 203.9569 266.3288 15.50161091173697",
    },
    {
      "@id": "https://tle.ivanstanojevic.me/api/tle/35932",
      "@type": "Tle",
      satelliteId: 35932,
      name: "SWISSCUBE",
      date: "2024-08-15T21:19:00+00:00",
      line1:
        "1 35932U 09051B   24228.88820157  .00003557  00000+0  76105-3 0  9995",
      line2:
        "2 35932  98.4627 113.3801 0008257 126.8675 233.3282 14.59389867791262",
    },
  ],
  parameters: {
    search: "*",
    sort: "popularity",
    "sort-dir": "desc",
    page: 1,
    "page-size": 20,
  },
  view: {
    "@id": "https://tle.ivanstanojevic.me/api/tle/?page=1",
    "@type": "PartialCollectionView",
    first: "https://tle.ivanstanojevic.me/api/tle/?page=1",
    next: "https://tle.ivanstanojevic.me/api/tle/?page=2",
    last: "https://tle.ivanstanojevic.me/api/tle/?page=789",
  },
};
