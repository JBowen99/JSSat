import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function EarthModel(props) {
  const { nodes, materials } = useGLTF('models/Earth_1_12756.glb')
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Cube001.geometry}
        material={materials['Default OBJ']}
      />
    </group>
  )
}

useGLTF.preload('/Earth_1_12756.glb')