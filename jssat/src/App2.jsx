import React, { useEffect, useMemo, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Line,
  OrbitControls,
  Stars,
  Sphere,
  useGLTF,
  Environment,
  ContactShadows,
  Html,
} from "@react-three/drei";
import * as satellite from "satellite.js";
import { MdSatelliteAlt } from "react-icons/md";
import * as THREE from "three";
import {
  ChevronLeft,
  ChevronRight,
  Mouse,
  MousePointer,
  RotateCcw,
} from "lucide-react";

// Define the radius of the Earth in kilometers
const EARTH_RADIUS_KM = 6371;

// Function to convert TLE to Cartesian coordinates, normalized by Earth's radius
function tleToCartesian(
  tleLine1,
  tleLine2,
  numPoints = 100,
  orbitFraction = 1
) {
  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  const points = [];

  const now = new Date();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000 * orbitFraction); // Limit time span

  for (let i = 0; i < numPoints; i++) {
    const timeFraction = i / numPoints;
    const time = new Date(
      now.getTime() + timeFraction * (endTime.getTime() - now.getTime())
    );
    const positionAndVelocity = satellite.propagate(satrec, time);
    const positionEci = positionAndVelocity.position;

    if (positionEci) {
      const gmst = satellite.gstime(time);
      const { x, y, z } = satellite.eciToEcf(positionEci, gmst);

      // Normalize the coordinates by Earth's radius
      const normalizedPoint = [
        x / EARTH_RADIUS_KM,
        y / EARTH_RADIUS_KM,
        z / EARTH_RADIUS_KM,
      ];
      points.push(normalizedPoint);
    }
  }

  console.log("Generated points:", points);

  // Check if points are valid before returning
  if (points.length === 0) {
    console.error("No points were generated for the orbit.");
    return [
      [0, 0, 0],
      [0, 0, 0],
    ]; // Return a valid but flat line to avoid errors
  }

  return points;
}

// Function to get the satellite's current position
function getCurrentPosition(tleLine1, tleLine2) {
  const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  const now = new Date();
  const positionAndVelocity = satellite.propagate(satrec, now);
  const positionEci = positionAndVelocity.position;

  if (positionEci) {
    const gmst = satellite.gstime(now);
    const { x, y, z } = satellite.eciToEcf(positionEci, gmst);

    // Normalize the coordinates by Earth's radius
    return [x / EARTH_RADIUS_KM, y / EARTH_RADIUS_KM, z / EARTH_RADIUS_KM];
  }

  return [0, 0, 0]; // Default to origin if no position is found
}

function Satellite(props) {
  const markerRef = useRef();

  const position = getCurrentPosition(
    props.selectedSat.line1,
    props.selectedSat.line2
  );

  // This holds the local occluded state
  const [isOccluded, setOccluded] = useState();
  const [isInRange, setInRange] = useState();
  const isVisible = isInRange && !isOccluded;
  // Test distance
  const vec = new THREE.Vector3();

  useFrame((state) => {
    const range =
      state.camera.position.distanceTo(
        markerRef.current.getWorldPosition(vec)
      ) <= 10;
    if (range !== isInRange) setInRange(range);
  });

  // Ensure the Marker faces the camera
  useFrame(({ camera }) => {
    if (markerRef.current) {
      markerRef.current.lookAt(camera.position);
    }
  });

  return (
    <>
      <group ref={markerRef} position={position}>
        <Html
          // 3D-transform contents
          transform
          // Hide contents "behind" other meshes
          occlude
          // Tells us when contents are occluded (or not)
          onOcclude={setOccluded}
          // We just interpolate the visible state into css opacity and transforms
          style={{
            transition: "all 0.2s",
            //opacity: isVisible ? 1 : 0,
            //transform: `scale(${isVisible ? 1 : 0.25})`,
            color: isOccluded ? "#EAA0A0" : "#FF0000", // Change color when occluded
          }}
        >
          <div
            style={{
              position: "absolute",
              fontSize: 10,
              letterSpacing: -0.5,
              left: 17.5,
              color: "white",
            }}
          >
            <h1 className="text-nowrap">{props.selectedSat?.name ?? "none"}</h1>
          </div>
          <MdSatelliteAlt />
        </Html>
      </group>
    </>
  );
}

function OrbitLine({ tleLine1, tleLine2 }) {
  const points = useMemo(
    () => tleToCartesian(tleLine1, tleLine2),
    [tleLine1, tleLine2]
  );

  return (
    <Line
      points={points} // Array of points [x, y, z]
      color="blue"
      lineWidth={1}
      dashed={false}
    />
  );
}

function OrbitSection({ tleLine1, tleLine2, fraction }) {
  const points = useMemo(
    () => tleToCartesian(tleLine1, tleLine2, 100, fraction),
    [tleLine1, tleLine2, fraction]
  );

  return (
    <Line
      points={points} // Array of points [x, y, z]
      color="red"
      lineWidth={5}
      dashed={false}
    />
  );
}

function EarthModel2(props) {
  const { nodes, materials } = useGLTF("/earth.gltf");

  return (
    <group rotation={[-Math.PI / 2, -0.41, Math.PI]} {...props} dispose={null}>
      <mesh
        geometry={nodes["URF-Height_Lampd_Ice_0"].geometry}
        material={materials.Lampd_Ice}
      />
      <mesh
        geometry={nodes["URF-Height_watr_0"].geometry}
        material={materials.watr}
        material-roughness={0}
      />
      <mesh
        geometry={nodes["URF-Height_Lampd_0"].geometry}
        material={materials.Lampd}
        material-color="lightgreen"
      ></mesh>
    </group>
  );
}

function App() {
  const [page, setPage] = useState(1);

  const [satData, setSatData] = useState(null);

  const [selectedSat, setSelectedSat] = useState(null);

  const [loading, setLoading] = useState(false);

  const fetchTLEData = async (page) => {
    setLoading(true);
    console.log("fetching page " + page);
    const url = "https://tle.ivanstanojevic.me/api"; //debug through proxy is /api
    try {
      const response = await fetch(`${url}?page=${page}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      console.log(data);
      setSatData(data);
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTLEData(page);
  }, [page]);

  return (
    <>
      <Canvas camera={{ fov: 60 }}>
        <ambientLight intensity={0.25} />
        <EarthModel2 />
        <OrbitControls />

        {selectedSat ? (
          <>
            <OrbitSection
              tleLine1={selectedSat.line1}
              tleLine2={selectedSat.line2}
              fraction={1 / 16}
            />

            <Satellite selectedSat={selectedSat} />
          </>
        ) : (
          <></>
        )}

        <Environment
          files="./autumn_field_puresky_1k.hdr"
          environmentIntensity={0.5}
        />

        <Stars
          radius={25}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      </Canvas>

      <div className="absolute top-10 inset-x-1/2">
        <div className="flex flex-col justify-center items-center w-full">
          <h1 className="text-4xl font-bold font-sans text-white">SatTrak</h1>
          {selectedSat ? (
            <></>
          ) : (
            <h1 className="text-4xl font-bold font-sans text-white text-nowrap mt-5">
              Select a satellite to start
            </h1>
          )}
        </div>
      </div>

      <div className="absolute top-0 left-0 ">
        <div className="flex flex-col bg-slate-400 bg-opacity-75 p-3 m-10 rounded-xl">
          <h1 className="font-sans">Satellites (Page {page}):</h1>
          {satData != null && !loading ? (
            <>
              {satData.member.map((sat) => {
                return (
                  <button
                    key={sat.name}
                    onClick={() => {
                      setSelectedSat(sat);
                    }}
                    className="hover:scale-125"
                  >
                    <h1 className="font-sans m-1 text-sm">{sat.name}</h1>
                  </button>
                );
              })}
              <div className="flex flex-row justify-between pt-1">
                <button
                  onClick={() =>
                    page >= 1 ? setPage(page - 1) : console.log(page)
                  }
                >
                  <ChevronLeft />
                </button>
                <button onClick={() => fetchTLEData(page)}>
                  <RotateCcw />
                </button>
                <button onClick={() => setPage(page + 1)}>
                  <ChevronRight />
                </button>
              </div>
            </>
          ) : (
            <h1 className="font-sans">Loading data...</h1>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto w-[375px] mb-10 ">
        <div className="flex flex-row  justify-center content-center items-center bg-slate-400 bg-opacity-75 hover:opacity-25 rounded-xl p-3">
          <Mouse className="mx-1" />
          <h1 className="font-sans">Scroll to zoom.</h1>
          <MousePointer className="mx-1" />
          <h1 className="font-sans">Click and drag to rotate.</h1>
        </div>
      </div>
    </>
  );
}

export default App;
